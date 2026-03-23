import {
	type GlobalVendorList,
	resolvePolicyDecision as resolveSharedPolicyDecision,
} from '@c15t/schema/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyPolicySnapshotToken } from '~/handlers/policy/snapshot';
import type { C15TOptions } from '~/types';
import { createInitRoute } from './init';

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

interface InitTestResponseBody {
	policy?: {
		model?: string;
		consent?: {
			categories?: string[];
			preselectedCategories?: string[];
		};
		ui?: {
			mode?: string;
			banner?: {
				actionOrder?: string[];
				actionLayout?: string;
				uiProfile?: string;
				scrollLock?: boolean;
			};
		};
	};
	policyDecision?: {
		policyId?: string;
		fingerprint?: string;
		matchedBy?: string;
		jurisdiction?: string;
	};
	gvl?: { vendorListVersion?: number } | null;
	cmpId?: number;
	customVendors?: unknown[];
	translations?: {
		translations?: {
			iab?: unknown;
		};
	};
}

function createOptions(overrides: Partial<C15TOptions> = {}): C15TOptions {
	return {
		trustedOrigins: [],
		adapter: {} as C15TOptions['adapter'],
		...overrides,
	};
}

describe('createInitRoute IAB policy gating', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGVLGet.mockResolvedValue(mockGVL);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('omits IAB payload when active policy is not iab', async () => {
		const app = createInitRoute(
			createOptions({
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
						ui: {
							mode: 'banner',
							banner: {
								allowedActions: ['accept', 'reject'],
								actionOrder: ['reject', 'accept'],
								actionLayout: 'inline',
								uiProfile: 'balanced',
								scrollLock: true,
							},
						},
					},
				],
			})
		);

		const response = await app.request('http://localhost/', {
			headers: new Headers({
				'x-c15t-country': 'US',
				'x-c15t-region': 'CA',
				'accept-language': 'en-US',
			}),
		});
		const body = (await response.json()) as InitTestResponseBody;

		expect(response.status).toBe(200);
		expect(body.policy?.model).toBe('opt-in');
		expect(body.policy?.ui?.banner?.actionOrder).toEqual(['reject', 'accept']);
		expect(body.policy?.ui?.banner?.actionLayout).toBe('inline');
		expect(body.policy?.ui?.banner?.uiProfile).toBe('balanced');
		expect(body.policy?.ui?.banner?.scrollLock).toBe(true);
		expect(body.gvl).toBeUndefined();
		expect(body.cmpId).toBeUndefined();
		expect(body.customVendors).toBeUndefined();
		expect(body.translations?.translations?.iab).toBeUndefined();
		expect(mockCreateGVLResolver).not.toHaveBeenCalled();
	});

	it('includes IAB payload when active policy is iab', async () => {
		const app = createInitRoute(
			createOptions({
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
			})
		);

		const response = await app.request('http://localhost/', {
			headers: new Headers({
				'x-c15t-country': 'FR',
				'accept-language': 'en-US',
			}),
		});
		const body = (await response.json()) as InitTestResponseBody;

		expect(response.status).toBe(200);
		expect(body.policy?.model).toBe('iab');
		expect(body.policy?.consent?.categories).toEqual(['*']);
		expect(body.gvl?.vendorListVersion).toBe(123);
		expect(body.cmpId).toBe(202);
		expect(body.customVendors).toHaveLength(1);
		expect(body.translations?.translations?.iab).toBeDefined();
		expect(mockCreateGVLResolver).toHaveBeenCalledTimes(1);
		expect(mockGVLGet).toHaveBeenCalledWith('en');
	});

	it('preserves legacy IAB behavior when no policies are configured', async () => {
		const app = createInitRoute(
			createOptions({
				iab: { enabled: true, cmpId: 303 },
			})
		);

		const response = await app.request('http://localhost/', {
			headers: new Headers({
				'x-c15t-country': 'US',
				'accept-language': 'en-US',
			}),
		});
		const body = (await response.json()) as InitTestResponseBody;

		expect(response.status).toBe(200);
		expect(body.policy).toBeUndefined();
		expect(body.gvl?.vendorListVersion).toBe(123);
		expect(body.cmpId).toBe(303);
		expect(body.translations?.translations?.iab).toBeDefined();
		expect(mockCreateGVLResolver).toHaveBeenCalledTimes(1);
		expect(mockGVLGet).toHaveBeenCalledWith('en');
	});

	it('treats an explicit empty policy pack as no-banner mode', async () => {
		const app = createInitRoute(
			createOptions({
				iab: { enabled: true, cmpId: 404 },
				policyPacks: [],
			})
		);

		const response = await app.request('http://localhost/', {
			headers: new Headers({
				'x-c15t-country': 'DE',
				'accept-language': 'en-US',
			}),
		});
		const body = (await response.json()) as InitTestResponseBody;

		expect(response.status).toBe(200);
		expect(body.policy?.model).toBe('none');
		expect(body.policy?.ui?.mode).toBe('none');
		expect(body.gvl).toBeUndefined();
		expect(body.cmpId).toBeUndefined();
		expect(body.customVendors).toBeUndefined();
		expect(body.translations?.translations?.iab).toBeUndefined();
		expect(mockCreateGVLResolver).not.toHaveBeenCalled();
	});

	it('treats an explicit policy pack with no match as no-banner mode', async () => {
		const app = createInitRoute(
			createOptions({
				iab: { enabled: true, cmpId: 505 },
				policyPacks: [
					{
						id: 'policy_us_ca',
						match: { regions: [{ country: 'US', region: 'CA' }] },
						consent: { model: 'opt-out' },
						ui: { mode: 'banner' },
					},
				],
			})
		);

		const response = await app.request('http://localhost/', {
			headers: new Headers({
				'x-c15t-country': 'DE',
				'accept-language': 'en-US',
			}),
		});
		const body = (await response.json()) as InitTestResponseBody;

		expect(response.status).toBe(200);
		expect(body.policy?.model).toBe('none');
		expect(body.policy?.ui?.mode).toBe('none');
		expect(body.gvl).toBeUndefined();
		expect(body.cmpId).toBeUndefined();
		expect(body.customVendors).toBeUndefined();
		expect(body.translations?.translations?.iab).toBeUndefined();
		expect(mockCreateGVLResolver).not.toHaveBeenCalled();
	});

	it('returns the same fingerprint as the shared resolver for hosted init responses', async () => {
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
						primaryAction: 'accept' as const,
						actionOrder: ['accept', 'reject'] as const,
						actionLayout: 'inline' as const,
						uiProfile: 'balanced' as const,
						scrollLock: true,
					},
				},
			},
		];
		const app = createInitRoute(
			createOptions({
				policyPacks: policies,
			})
		);
		const expectedDecision = await resolveSharedPolicyDecision({
			policies,
			countryCode: 'DE',
			regionCode: null,
			jurisdiction: 'GDPR',
		});

		const response = await app.request('http://localhost/', {
			headers: new Headers({
				'x-c15t-country': 'DE',
				'accept-language': 'en-US',
			}),
		});
		const body = (await response.json()) as InitTestResponseBody;

		expect(response.status).toBe(200);
		expect(body.policyDecision?.policyId).toBe(expectedDecision?.policy.id);
		expect(body.policyDecision?.matchedBy).toBe(expectedDecision?.matchedBy);
		expect(body.policyDecision?.jurisdiction).toBe('GDPR');
		expect(body.policyDecision?.fingerprint).toBe(
			expectedDecision?.fingerprint
		);
	});

	it('includes policy i18n and preselected categories in signed snapshots', async () => {
		const app = createInitRoute(
			createOptions({
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
						ui: {
							mode: 'banner',
						},
					},
				],
			})
		);

		const response = await app.request('http://localhost/', {
			headers: new Headers({
				'x-c15t-country': 'DE',
				'accept-language': 'de-DE',
			}),
		});
		const body = (await response.json()) as InitTestResponseBody & {
			policySnapshotToken?: string;
		};
		const payload = await verifyPolicySnapshotToken({
			token: body.policySnapshotToken,
			options: { signingKey: 'test-signing-key' },
		});

		expect(response.status).toBe(200);
		expect(payload.valid).toBe(true);
		if (!payload.valid) {
			throw new Error('Expected valid snapshot payload');
		}
		expect(payload.payload.policyI18n).toEqual({
			language: 'de',
			messageProfile: 'eu_gdpr',
		});
		expect(payload.payload.preselectedCategories).toEqual(['measurement']);
	});
});
