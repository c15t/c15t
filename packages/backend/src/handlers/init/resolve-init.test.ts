import {
	type GlobalVendorList,
	resolvePolicyDecision as resolveSharedPolicyDecision,
} from '@c15t/schema/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyPolicySnapshotToken } from '~/handlers/policy/snapshot';
import { resolveInitPayload } from './resolve-init';

const { mockCreateGVLResolver, mockGVLGet } = vi.hoisted(() => {
	return {
		mockGVLGet: vi.fn(),
		mockCreateGVLResolver: vi.fn(() => ({
			get: mockGVLGet,
		})),
	};
});

vi.mock('~/cache/gvl-resolver', () => ({
	createGVLResolver: mockCreateGVLResolver,
}));

const mockGVL: GlobalVendorList = {
	gvlSpecificationVersion: 3,
	vendorListVersion: 123,
	tcfPolicyVersion: 5,
	lastUpdated: '2026-01-01T00:00:00Z',
	purposes: {},
	specialPurposes: {},
	features: {},
	specialFeatures: {},
	vendors: {},
	stacks: {},
};

function makeRequest(headers: Record<string, string>): Request {
	return new Request('http://localhost/', { headers });
}

describe('resolveInitPayload', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGVLGet.mockResolvedValue(mockGVL);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('returns jurisdiction, location, translations, and branding', async () => {
		const payload = await resolveInitPayload(
			makeRequest({
				'x-c15t-country': 'DE',
				'accept-language': 'en-US',
			}),
			{ trustedOrigins: [] }
		);

		expect(payload.jurisdiction).toBe('GDPR');
		expect(payload.location).toEqual({
			countryCode: 'DE',
			regionCode: null,
		});
		expect(payload.translations).toBeDefined();
		expect(payload.branding).toBe('c15t');
	});

	it('omits IAB payload when active policy is not iab', async () => {
		const payload = await resolveInitPayload(
			makeRequest({
				'x-c15t-country': 'US',
				'x-c15t-region': 'CA',
				'accept-language': 'en-US',
			}),
			{
				trustedOrigins: [],
				iab: {
					enabled: true,
					cmpId: 101,
					customVendors: [
						{
							id: 'vendor_internal',
							name: 'Internal Vendor',
							purposes: [1],
							privacyPolicyUrl: 'https://example.com/privacy',
						},
					],
				},
				policyPacks: [
					{
						id: 'policy_us_ca',
						match: { regions: [{ country: 'US', region: 'CA' }] },
						consent: { model: 'opt-in' },
						ui: { mode: 'banner' },
					},
				],
			}
		);

		expect(payload.policy?.model).toBe('opt-in');
		expect(payload.gvl).toBeUndefined();
		expect(payload.cmpId).toBeUndefined();
		expect(payload.customVendors).toBeUndefined();
		expect(mockCreateGVLResolver).not.toHaveBeenCalled();
	});

	it('includes IAB payload when active policy is iab', async () => {
		const payload = await resolveInitPayload(
			makeRequest({
				'x-c15t-country': 'FR',
				'accept-language': 'en-US',
			}),
			{
				trustedOrigins: [],
				iab: {
					enabled: true,
					cmpId: 202,
					customVendors: [
						{
							id: 'vendor_internal',
							name: 'Internal Vendor',
							purposes: [1],
							privacyPolicyUrl: 'https://example.com/privacy',
						},
					],
				},
				policyPacks: [
					{
						id: 'policy_fr_iab',
						match: { countries: ['FR'] },
						consent: { model: 'iab' },
					},
				],
			}
		);

		expect(payload.policy?.model).toBe('iab');
		expect(
			(payload.gvl as { vendorListVersion: number })?.vendorListVersion
		).toBe(123);
		expect(payload.cmpId).toBe(202);
		expect(payload.customVendors).toHaveLength(1);
		expect(mockCreateGVLResolver).toHaveBeenCalledTimes(1);
		expect(mockGVLGet).toHaveBeenCalledWith('en');
	});

	it('treats explicit empty policy pack as no-banner mode', async () => {
		const payload = await resolveInitPayload(
			makeRequest({
				'x-c15t-country': 'DE',
				'accept-language': 'en-US',
			}),
			{
				trustedOrigins: [],
				iab: { enabled: true, cmpId: 404 },
				policyPacks: [],
			}
		);

		expect(payload.policy?.model).toBe('none');
		expect(payload.policy?.ui?.mode).toBe('none');
		expect(payload.gvl).toBeUndefined();
		expect(payload.cmpId).toBeUndefined();
		expect(mockCreateGVLResolver).not.toHaveBeenCalled();
	});

	it('returns the same fingerprint as the shared resolver', async () => {
		const policies = [
			{
				id: 'policy_de',
				match: { countries: ['DE'] },
				consent: {
					model: 'opt-in' as const,
					expiryDays: 365,
					scopeMode: 'strict' as const,
					categories: ['necessary', 'measurement'],
				},
				ui: {
					mode: 'banner' as const,
					banner: {
						allowedActions: ['accept', 'reject'] as const,
						primaryActions: ['accept'] as const,
						layout: [['accept', 'reject']] as const,
						direction: 'row' as const,
						uiProfile: 'balanced' as const,
						scrollLock: true,
					},
				},
			},
		];

		const expectedDecision = await resolveSharedPolicyDecision({
			policies,
			countryCode: 'DE',
			regionCode: null,
			jurisdiction: 'GDPR',
		});

		const payload = await resolveInitPayload(
			makeRequest({
				'x-c15t-country': 'DE',
				'accept-language': 'en-US',
			}),
			{ trustedOrigins: [], policyPacks: policies }
		);

		expect(payload.policyDecision?.policyId).toBe(expectedDecision?.policy.id);
		expect(payload.policyDecision?.fingerprint).toBe(
			expectedDecision?.fingerprint
		);
		expect(payload.policyDecision?.matchedBy).toBe(expectedDecision?.matchedBy);
		expect(payload.policyDecision?.jurisdiction).toBe('GDPR');
	});

	it('includes policy i18n and preselected categories in signed snapshots', async () => {
		const payload = await resolveInitPayload(
			makeRequest({
				'x-c15t-country': 'DE',
				'accept-language': 'de-DE',
			}),
			{
				trustedOrigins: [],
				policySnapshot: { signingKey: 'test-signing-key', ttlSeconds: 60 },
				policyPacks: [
					{
						id: 'policy_de',
						match: { countries: ['DE'] },
						i18n: {
							language: 'de',
							messageProfile: 'eu_gdpr',
						},
						consent: {
							model: 'opt-in',
							expiryDays: 365,
							scopeMode: 'strict',
							categories: ['necessary', 'measurement'],
							preselectedCategories: ['measurement'],
						},
						ui: { mode: 'banner' },
					},
				],
			}
		);

		expect(payload.policySnapshotToken).toBeDefined();

		const snapshotPayload = await verifyPolicySnapshotToken({
			token: payload.policySnapshotToken,
			options: { signingKey: 'test-signing-key' },
		});
		expect(snapshotPayload.valid).toBe(true);
		if (!snapshotPayload.valid) {
			throw new Error('Expected valid snapshot payload');
		}
		expect(snapshotPayload.payload.policyI18n).toEqual({
			language: 'de',
			messageProfile: 'eu_gdpr',
		});
		expect(snapshotPayload.payload.preselectedCategories).toEqual([
			'measurement',
		]);
	});

	it('defaults to GDPR jurisdiction when geo-location is disabled', async () => {
		const payload = await resolveInitPayload(
			makeRequest({ 'accept-language': 'en' }),
			{
				trustedOrigins: [],
				disableGeoLocation: true,
			}
		);

		expect(payload.jurisdiction).toBe('GDPR');
		expect(payload.location).toEqual({
			countryCode: null,
			regionCode: null,
		});
	});
});
