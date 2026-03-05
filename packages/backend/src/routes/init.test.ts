import type { GlobalVendorList } from '@c15t/schema/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
		consent?: { purposeIds?: string[] };
		ui?: {
			banner?: {
				actionOrder?: string[];
				actionLayout?: string;
				uiProfile?: string;
			};
		};
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
				policies: [
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
				policies: [
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
		expect(body.policy?.consent?.purposeIds).toEqual(['*']);
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
});
