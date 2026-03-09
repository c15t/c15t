import { describe, expect, it } from 'vitest';
import {
	createPolicySnapshotToken,
	verifyPolicySnapshotToken,
} from './snapshot';

describe('policy snapshot token', () => {
	it('creates and verifies a valid token', async () => {
		const tokenResult = await createPolicySnapshotToken({
			options: { signingKey: 'test-signing-key', ttlSeconds: 60 },
			tenantId: 'ins_123',
			policyId: 'policy_default',
			fingerprint: 'abc123',
			matchedBy: 'country',
			country: 'US',
			region: 'CA',
			jurisdiction: 'CCPA',
			language: 'en',
			model: 'opt-in',
			policyI18n: {
				language: 'en',
				messageProfile: 'us_ca',
			},
			scopeMode: 'strict',
			uiMode: 'banner',
			bannerUi: {
				allowedActions: ['accept', 'reject', 'customize'],
				primaryAction: 'accept',
				actionOrder: ['accept', 'reject', 'customize'],
				actionLayout: 'inline',
				uiProfile: 'strict',
				scrollLock: true,
			},
			categories: ['analytics', 'marketing'],
			preselectedCategories: ['analytics'],
			proofConfig: {
				storeIp: true,
				storeUserAgent: true,
				storeLanguage: true,
			},
		});

		expect(tokenResult).toBeDefined();
		expect(tokenResult?.token.split('.')).toHaveLength(3);
		const payload = await verifyPolicySnapshotToken({
			token: tokenResult?.token,
			options: { signingKey: 'test-signing-key' },
			tenantId: 'ins_123',
		});

		expect(payload?.iss).toBe('c15t');
		expect(payload?.aud).toBe('c15t-policy-snapshot:ins_123');
		expect(payload?.sub).toBe('policy_default');
		expect(payload?.policyId).toBe('policy_default');
		expect(payload?.matchedBy).toBe('country');
		expect(payload?.country).toBe('US');
		expect(payload?.region).toBe('CA');
		expect(payload?.policyI18n).toEqual({
			language: 'en',
			messageProfile: 'us_ca',
		});
		expect(payload?.scopeMode).toBe('strict');
		expect(payload?.categories).toEqual(['analytics', 'marketing']);
		expect(payload?.preselectedCategories).toEqual(['analytics']);
		expect(payload?.bannerUi?.actionLayout).toBe('inline');
		expect(payload?.bannerUi?.uiProfile).toBe('strict');
		expect(payload?.bannerUi?.scrollLock).toBe(true);
		expect(payload?.bannerUi?.actionOrder).toEqual([
			'accept',
			'reject',
			'customize',
		]);
	});

	it('rejects tampered token payloads', async () => {
		const tokenResult = await createPolicySnapshotToken({
			options: { signingKey: 'test-signing-key', ttlSeconds: 60 },
			policyId: 'policy_default',
			fingerprint: 'abc123',
			matchedBy: 'default',
			country: null,
			region: null,
			jurisdiction: 'GDPR',
			model: 'opt-in',
		});

		const [header, payload, signature] = (tokenResult?.token ?? '').split('.');
		const tamperedPayload = `${header}.${payload}x.${signature}`;

		const verified = await verifyPolicySnapshotToken({
			token: tamperedPayload,
			options: { signingKey: 'test-signing-key' },
		});

		expect(verified).toBeNull();
	});

	it('rejects expired tokens', async () => {
		const tokenResult = await createPolicySnapshotToken({
			options: { signingKey: 'test-signing-key', ttlSeconds: -1 },
			policyId: 'policy_default',
			fingerprint: 'abc123',
			matchedBy: 'default',
			country: null,
			region: null,
			jurisdiction: 'GDPR',
			model: 'opt-in',
		});

		const verified = await verifyPolicySnapshotToken({
			token: tokenResult?.token,
			options: { signingKey: 'test-signing-key' },
		});

		expect(verified).toBeNull();
	});

	it('rejects tokens when the tenant context does not match', async () => {
		const tokenResult = await createPolicySnapshotToken({
			options: { signingKey: 'test-signing-key', ttlSeconds: 60 },
			tenantId: 'ins_123',
			policyId: 'policy_default',
			fingerprint: 'abc123',
			matchedBy: 'default',
			country: null,
			region: null,
			jurisdiction: 'GDPR',
			model: 'opt-in',
		});

		const verified = await verifyPolicySnapshotToken({
			token: tokenResult?.token,
			options: { signingKey: 'test-signing-key' },
			tenantId: 'ins_456',
		});

		expect(verified).toBeNull();
	});

	it('rejects tenant-scoped tokens when no tenant context is provided', async () => {
		const tokenResult = await createPolicySnapshotToken({
			options: { signingKey: 'test-signing-key', ttlSeconds: 60 },
			tenantId: 'ins_123',
			policyId: 'policy_default',
			fingerprint: 'abc123',
			matchedBy: 'default',
			country: null,
			region: null,
			jurisdiction: 'GDPR',
			model: 'opt-in',
		});

		const verified = await verifyPolicySnapshotToken({
			token: tokenResult?.token,
			options: { signingKey: 'test-signing-key' },
		});

		expect(verified).toBeNull();
	});

	it('supports custom issuer and audience claims', async () => {
		const tokenResult = await createPolicySnapshotToken({
			options: {
				signingKey: 'test-signing-key',
				ttlSeconds: 60,
				issuer: 'consent.example.com',
				audience: 'policy-snapshot-api',
			},
			tenantId: 'ins_123',
			policyId: 'policy_default',
			fingerprint: 'abc123',
			matchedBy: 'default',
			country: null,
			region: null,
			jurisdiction: 'GDPR',
			model: 'opt-in',
		});

		const verified = await verifyPolicySnapshotToken({
			token: tokenResult?.token,
			options: {
				signingKey: 'test-signing-key',
				issuer: 'consent.example.com',
				audience: 'policy-snapshot-api',
			},
			tenantId: 'ins_123',
		});

		expect(verified?.iss).toBe('consent.example.com');
		expect(verified?.aud).toBe('policy-snapshot-api');
	});
});
