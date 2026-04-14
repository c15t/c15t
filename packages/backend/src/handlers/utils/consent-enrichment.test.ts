import { describe, expect, it, vi } from 'vitest';
import {
	enrichConsents,
	parsePurposeIds,
	resolveConsentPolicies,
} from './consent-enrichment';

describe('consent-enrichment', () => {
	// ── parsePurposeIds ─────────────────────────────────────────────────
	describe('parsePurposeIds', () => {
		it('extracts IDs from { json: [...] } wrapper', () => {
			expect(parsePurposeIds({ json: ['a', 'b'] })).toEqual(['a', 'b']);
		});

		it('passes through raw string[]', () => {
			expect(parsePurposeIds(['x', 'y'])).toEqual(['x', 'y']);
		});

		it('returns [] for null', () => {
			expect(parsePurposeIds(null)).toEqual([]);
		});

		it('returns [] for undefined', () => {
			expect(parsePurposeIds(undefined)).toEqual([]);
		});

		it('returns [] for empty array', () => {
			expect(parsePurposeIds([])).toEqual([]);
		});

		it('returns [] for empty { json: [] }', () => {
			expect(parsePurposeIds({ json: [] })).toEqual([]);
		});

		it('returns [] for non-array values', () => {
			expect(parsePurposeIds('not-an-array')).toEqual([]);
			expect(parsePurposeIds(42)).toEqual([]);
		});
	});

	// ── enrichConsents ──────────────────────────────────────────────────
	describe('enrichConsents', () => {
		function createMockCtx(
			policies: Array<{
				id: string;
				type: string;
				version?: string;
				hash?: string | null;
				effectiveDate?: Date;
			}> = [],
			purposes: Array<{ id: string; code: string }> = [],
			latestByType: Record<string, { id: string }> = {}
		) {
			const db = {
				findMany: vi.fn((table: string, opts?: { where?: unknown }) => {
					if (table === 'consentPolicy') return Promise.resolve(policies);
					if (table === 'consentPurpose') return Promise.resolve(purposes);
					return Promise.resolve([]);
				}),
			};

			const registry = {
				findLatestPolicyByType: vi.fn((type: string) =>
					Promise.resolve(latestByType[type] ?? { id: `latest_${type}` })
				),
				findConsentPolicyById: vi.fn(),
			};

			return { db, registry } as unknown as Parameters<
				typeof enrichConsents
			>[1];
		}

		it('returns [] for empty consents', async () => {
			const ctx = createMockCtx();
			const result = await enrichConsents([], ctx);
			expect(result).toEqual([]);
			// No DB calls should be made
			expect((ctx.db as any).findMany).not.toHaveBeenCalled();
		});

		it('enriches a single consent with policy and purposes', async () => {
			const ctx = createMockCtx(
				[{ id: 'pol_1', type: 'cookie_banner' }],
				[
					{ id: 'pur_1', code: 'analytics' },
					{ id: 'pur_2', code: 'marketing' },
				],
				{ cookie_banner: { id: 'pol_1' } }
			);

			const result = await enrichConsents(
				[
					{
						id: 'con_1',
						policyId: 'pol_1',
						purposeIds: ['pur_1', 'pur_2'],
						givenAt: new Date('2024-01-01'),
					},
				],
				ctx
			);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				id: 'con_1',
				type: 'cookie_banner',
				policyId: 'pol_1',
				policyVersion: undefined,
				policyHash: undefined,
				policyEffectiveDate: undefined,
				isLatestPolicy: true,
				preferences: { analytics: true, marketing: true },
				givenAt: new Date('2024-01-01'),
			});
		});

		it('includes legal-document evidence fields when available', async () => {
			const effectiveDate = new Date('2026-04-07T00:00:00.000Z');
			const ctx = createMockCtx(
				[
					{
						id: 'pol_legal_1',
						type: 'privacy_policy',
						version: '2026-04-07',
						hash: 'hash_123',
						effectiveDate,
					},
				],
				[],
				{ privacy_policy: { id: 'pol_legal_1' } }
			);

			const result = await enrichConsents(
				[
					{
						id: 'con_1',
						policyId: 'pol_legal_1',
						purposeIds: [],
						givenAt: new Date('2026-04-07T12:00:00.000Z'),
					},
				],
				ctx
			);

			expect(result[0]).toEqual({
				id: 'con_1',
				type: 'privacy_policy',
				policyId: 'pol_legal_1',
				policyVersion: '2026-04-07',
				policyHash: 'hash_123',
				policyEffectiveDate: effectiveDate,
				isLatestPolicy: true,
				preferences: undefined,
				givenAt: new Date('2026-04-07T12:00:00.000Z'),
			});
		});

		it('uses batch findMany with "in" operator (not N individual calls)', async () => {
			const policies = [
				{ id: 'pol_1', type: 'cookie_banner' },
				{ id: 'pol_2', type: 'privacy_policy' },
			];
			const purposes = [
				{ id: 'pur_1', code: 'analytics' },
				{ id: 'pur_2', code: 'marketing' },
			];
			const ctx = createMockCtx(policies, purposes, {
				cookie_banner: { id: 'pol_1' },
				privacy_policy: { id: 'pol_2' },
			});

			await enrichConsents(
				[
					{
						id: 'c1',
						policyId: 'pol_1',
						purposeIds: ['pur_1'],
						givenAt: new Date(),
					},
					{
						id: 'c2',
						policyId: 'pol_2',
						purposeIds: ['pur_2'],
						givenAt: new Date(),
					},
				],
				ctx
			);

			const findManyCalls = (ctx.db as any).findMany.mock.calls;
			// Exactly 2 findMany calls: one for policies, one for purposes
			expect(findManyCalls).toHaveLength(2);
			expect(findManyCalls[0][0]).toBe('consentPolicy');
			expect(findManyCalls[1][0]).toBe('consentPurpose');
		});

		it('sets type = "unknown" and isLatestPolicy = false for null policyId', async () => {
			const ctx = createMockCtx([], [{ id: 'pur_1', code: 'analytics' }]);

			const result = await enrichConsents(
				[
					{
						id: 'con_1',
						policyId: null,
						purposeIds: ['pur_1'],
						givenAt: new Date('2024-01-01'),
					},
				],
				ctx
			);

			expect(result[0]!.type).toBe('unknown');
			expect(result[0]!.policyVersion).toBeUndefined();
			expect(result[0]!.policyHash).toBeUndefined();
			expect(result[0]!.policyEffectiveDate).toBeUndefined();
			expect(result[0]!.isLatestPolicy).toBe(false);
			expect(result[0]!.policyId).toBeUndefined();
		});

		it('isLatestPolicy is false when consent has an older policy', async () => {
			const ctx = createMockCtx(
				[{ id: 'pol_old', type: 'cookie_banner' }],
				[],
				{ cookie_banner: { id: 'pol_new' } } // latest is different
			);

			const result = await enrichConsents(
				[
					{
						id: 'con_1',
						policyId: 'pol_old',
						purposeIds: null,
						givenAt: new Date(),
					},
				],
				ctx
			);

			expect(result[0]!.isLatestPolicy).toBe(false);
		});

		it('handles { json: [...] } wrapper for purposeIds', async () => {
			const ctx = createMockCtx(
				[{ id: 'pol_1', type: 'cookie_banner' }],
				[{ id: 'pur_1', code: 'analytics' }],
				{ cookie_banner: { id: 'pol_1' } }
			);

			const result = await enrichConsents(
				[
					{
						id: 'con_1',
						policyId: 'pol_1',
						purposeIds: { json: ['pur_1'] },
						givenAt: new Date(),
					},
				],
				ctx
			);

			expect(result[0]!.preferences).toEqual({ analytics: true });
		});

		it('skips purposes not found in DB', async () => {
			const ctx = createMockCtx(
				[{ id: 'pol_1', type: 'cookie_banner' }],
				[{ id: 'pur_1', code: 'analytics' }], // pur_2 intentionally missing
				{ cookie_banner: { id: 'pol_1' } }
			);

			const result = await enrichConsents(
				[
					{
						id: 'con_1',
						policyId: 'pol_1',
						purposeIds: ['pur_1', 'pur_2_missing'],
						givenAt: new Date(),
					},
				],
				ctx
			);

			expect(result[0]!.preferences).toEqual({ analytics: true });
		});

		it('leaves preferences undefined when purposeIds is empty', async () => {
			const ctx = createMockCtx([{ id: 'pol_1', type: 'cookie_banner' }], [], {
				cookie_banner: { id: 'pol_1' },
			});

			const result = await enrichConsents(
				[
					{
						id: 'con_1',
						policyId: 'pol_1',
						purposeIds: [],
						givenAt: new Date(),
					},
				],
				ctx
			);

			expect(result[0]!.preferences).toBeUndefined();
		});

		it('does not call findMany for policies when no consents have policyId', async () => {
			const ctx = createMockCtx();

			await enrichConsents(
				[
					{
						id: 'con_1',
						policyId: null,
						purposeIds: null,
						givenAt: new Date(),
					},
				],
				ctx
			);

			const findManyCalls = (ctx.db as any).findMany.mock.calls;
			// Should not call findMany for consentPolicy (empty policyIds set)
			const policyCalls = findManyCalls.filter(
				(c: unknown[]) => c[0] === 'consentPolicy'
			);
			expect(policyCalls).toHaveLength(0);
		});
	});

	// ── resolveConsentPolicies ──────────────────────────────────────────
	describe('resolveConsentPolicies', () => {
		function createMockCtx(
			policies: Array<{ id: string; type: string }> = [],
			latestByType: Record<string, { id: string }> = {}
		) {
			const db = {
				findMany: vi.fn(() => Promise.resolve(policies)),
			};

			const registry = {
				findLatestPolicyByType: vi.fn((type: string) =>
					Promise.resolve(latestByType[type] ?? { id: `latest_${type}` })
				),
				findConsentPolicyById: vi.fn(),
			};

			return { db, registry } as unknown as Parameters<
				typeof resolveConsentPolicies
			>[1];
		}

		it('returns [] for empty consents', async () => {
			const ctx = createMockCtx();
			const result = await resolveConsentPolicies([], ctx);
			expect(result).toEqual([]);
		});

		it('returns correct policy info with isLatestPolicy', async () => {
			const ctx = createMockCtx([{ id: 'pol_1', type: 'cookie_banner' }], {
				cookie_banner: { id: 'pol_1' },
			});

			const result = await resolveConsentPolicies(
				[{ id: 'con_1', policyId: 'pol_1' }],
				ctx
			);

			expect(result).toEqual([
				{
					consentId: 'con_1',
					policyType: 'cookie_banner',
					policyId: 'pol_1',
					isLatestPolicy: true,
				},
			]);
		});

		it('returns unknown type for null policyId', async () => {
			const ctx = createMockCtx();

			const result = await resolveConsentPolicies(
				[{ id: 'con_1', policyId: null }],
				ctx
			);

			expect(result[0]).toEqual({
				consentId: 'con_1',
				policyType: 'unknown',
				policyId: undefined,
				isLatestPolicy: false,
			});
		});

		it('does not load purposes (no consentPurpose findMany call)', async () => {
			const ctx = createMockCtx([{ id: 'pol_1', type: 'cookie_banner' }], {
				cookie_banner: { id: 'pol_1' },
			});

			await resolveConsentPolicies([{ id: 'con_1', policyId: 'pol_1' }], ctx);

			const findManyCalls = (ctx.db as any).findMany.mock.calls;
			const purposeCalls = findManyCalls.filter(
				(c: unknown[]) => c[0] === 'consentPurpose'
			);
			expect(purposeCalls).toHaveLength(0);
		});

		it('handles multiple consents with different policy types', async () => {
			const ctx = createMockCtx(
				[
					{ id: 'pol_1', type: 'cookie_banner' },
					{ id: 'pol_2', type: 'privacy_policy' },
				],
				{
					cookie_banner: { id: 'pol_1' },
					privacy_policy: { id: 'pol_latest' }, // different from pol_2
				}
			);

			const result = await resolveConsentPolicies(
				[
					{ id: 'con_1', policyId: 'pol_1' },
					{ id: 'con_2', policyId: 'pol_2' },
				],
				ctx
			);

			expect(result[0]!.isLatestPolicy).toBe(true);
			expect(result[1]!.isLatestPolicy).toBe(false);
		});
	});
});
