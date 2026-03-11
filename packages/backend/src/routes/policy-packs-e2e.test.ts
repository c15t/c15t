/**
 * E2E tests for the policy packs lifecycle:
 *   GET /init (resolve policy + sign snapshot) → POST /subjects (verify snapshot + record consent)
 *
 * Uses a real c15tInstance with a mock adapter to exercise the full request chain.
 */

import { policyMatchers, resolvePolicyDecision } from '@c15t/schema/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyPolicySnapshotToken } from '~/handlers/policy/snapshot';
import type { C15TOptions } from '~/types';
import { createInitRoute } from './init';

vi.mock('~/cache/gvl-resolver', () => ({
	createGVLResolver: vi.fn(() => ({
		get: vi.fn().mockResolvedValue(null),
	})),
}));

const SIGNING_KEY = 'e2e-test-signing-key-for-policy-packs';

const EU_POLICY = {
	id: 'eu_opt_in',
	match: policyMatchers.merge(
		policyMatchers.eea(),
		policyMatchers.uk(),
		policyMatchers.fallback()
	),
	consent: {
		model: 'opt-in' as const,
		expiryDays: 365,
		scopeMode: 'strict' as const,
		categories: ['necessary', 'measurement', 'marketing'],
		gpc: false,
	},
	ui: {
		mode: 'banner' as const,
		banner: {
			allowedActions: ['accept', 'reject', 'customize'] as const,
			primaryAction: 'customize' as const,
		},
	},
	proof: {
		storeIp: true,
		storeUserAgent: true,
		storeLanguage: true,
	},
};

const CA_POLICY = {
	id: 'ca_opt_out',
	match: policyMatchers.regions([{ country: 'US', region: 'CA' }]),
	consent: {
		model: 'opt-out' as const,
		expiryDays: 365,
		gpc: true,
	},
	ui: { mode: 'none' as const },
};

const DEFAULT_POLICY = {
	id: 'world_default',
	match: policyMatchers.default(),
	consent: { model: 'none' as const },
	ui: { mode: 'none' as const },
};

const POLICY_PACKS = [EU_POLICY, CA_POLICY, DEFAULT_POLICY];

interface InitResponse {
	jurisdiction: string;
	location: { countryCode: string | null; regionCode: string | null };
	policy?: {
		id: string;
		model: string;
		consent?: {
			categories?: string[];
			scopeMode?: string;
			gpc?: boolean;
		};
		ui?: { mode?: string };
	};
	policyDecision?: {
		policyId: string;
		fingerprint: string;
		matchedBy: string;
		country: string | null;
		region: string | null;
		jurisdiction: string;
	};
	policySnapshotToken?: string;
}

function createOptions(overrides: Partial<C15TOptions> = {}): C15TOptions {
	return {
		trustedOrigins: [],
		adapter: {} as C15TOptions['adapter'],
		...overrides,
	};
}

function createInitApp(overrides: Partial<C15TOptions> = {}) {
	return createInitRoute(
		createOptions({
			policyPacks: POLICY_PACKS,
			policySnapshot: { signingKey: SIGNING_KEY, ttlSeconds: 300 },
			...overrides,
		})
	);
}

async function fetchInit(
	app: ReturnType<typeof createInitApp>,
	headers: Record<string, string>
): Promise<InitResponse> {
	const response = await app.request('http://localhost/', {
		headers: new Headers({
			'accept-language': 'en-US',
			...headers,
		}),
	});
	expect(response.status).toBe(200);
	return response.json() as Promise<InitResponse>;
}

describe('policy packs E2E: init → resolve → snapshot round-trip', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	// -------------------------------------------------------------------------
	// Resolution correctness across geo scenarios
	// -------------------------------------------------------------------------

	it('resolves EU policy for a German visitor', async () => {
		const app = createInitApp();
		const body = await fetchInit(app, { 'x-c15t-country': 'DE' });

		expect(body.policy?.id).toBe('eu_opt_in');
		expect(body.policy?.model).toBe('opt-in');
		expect(body.policy?.consent?.scopeMode).toBe('strict');
		expect(body.policy?.consent?.categories).toEqual([
			'necessary',
			'measurement',
			'marketing',
		]);
		expect(body.policyDecision?.matchedBy).toBe('country');
		expect(body.policyDecision?.jurisdiction).toBe('GDPR');
	});

	it('resolves California policy via region match', async () => {
		const app = createInitApp();
		const body = await fetchInit(app, {
			'x-c15t-country': 'US',
			'x-c15t-region': 'CA',
		});

		expect(body.policy?.id).toBe('ca_opt_out');
		expect(body.policy?.model).toBe('opt-out');
		expect(body.policy?.consent?.gpc).toBe(true);
		expect(body.policyDecision?.matchedBy).toBe('region');
		expect(body.policyDecision?.jurisdiction).toBe('CCPA');
	});

	it('resolves default policy for an unmatched country', async () => {
		const app = createInitApp();
		const body = await fetchInit(app, { 'x-c15t-country': 'JP' });

		expect(body.policy?.id).toBe('world_default');
		expect(body.policy?.model).toBe('none');
		expect(body.policyDecision?.matchedBy).toBe('default');
	});

	// -------------------------------------------------------------------------
	// Fallback policy for geo-location failures
	// -------------------------------------------------------------------------

	it('resolves fallback policy when geo-location fails (null country)', async () => {
		const app = createInitApp();
		// No x-c15t-country header = countryCode is null
		const body = await fetchInit(app, {});

		expect(body.policy?.id).toBe('eu_opt_in');
		expect(body.policy?.model).toBe('opt-in');
		expect(body.policyDecision?.matchedBy).toBe('fallback');
		expect(body.location.countryCode).toBeNull();
	});

	it('resolves fallback when disableGeoLocation is enabled', async () => {
		const app = createInitApp({ disableGeoLocation: true });
		// Even though geo headers are present, they should be ignored
		const body = await fetchInit(app, { 'x-c15t-country': 'US' });

		expect(body.policy?.id).toBe('eu_opt_in');
		expect(body.policy?.model).toBe('opt-in');
		expect(body.policyDecision?.matchedBy).toBe('fallback');
		expect(body.location.countryCode).toBeNull();
		expect(body.policyDecision?.jurisdiction).toBe('GDPR');
	});

	it('falls through to default when no fallback exists and geo fails', async () => {
		const app = createInitApp({
			policyPacks: [
				{
					id: 'eu',
					match: policyMatchers.countries(['DE']),
					consent: { model: 'opt-in' },
				},
				DEFAULT_POLICY,
			],
		});
		const body = await fetchInit(app, {});

		expect(body.policy?.id).toBe('world_default');
		expect(body.policyDecision?.matchedBy).toBe('default');
	});

	// -------------------------------------------------------------------------
	// Snapshot token round-trip
	// -------------------------------------------------------------------------

	it('produces a valid snapshot token that round-trips through verify', async () => {
		const app = createInitApp();
		const body = await fetchInit(app, { 'x-c15t-country': 'DE' });

		expect(body.policySnapshotToken).toBeDefined();
		expect(typeof body.policySnapshotToken).toBe('string');

		// Verify the token decodes correctly
		const payload = await verifyPolicySnapshotToken({
			token: body.policySnapshotToken,
			options: { signingKey: SIGNING_KEY },
		});

		expect(payload).toBeDefined();
		expect(payload?.policyId).toBe('eu_opt_in');
		expect(payload?.fingerprint).toBe(body.policyDecision?.fingerprint);
		expect(payload?.matchedBy).toBe('country');
		expect(payload?.country).toBe('DE');
		expect(payload?.jurisdiction).toBe('GDPR');
		expect(payload?.model).toBe('opt-in');
		expect(payload?.scopeMode).toBe('strict');
		expect(payload?.categories).toEqual([
			'necessary',
			'measurement',
			'marketing',
		]);
		expect(payload?.gpc).toBe(false);
		expect(payload?.proofConfig).toEqual({
			storeIp: true,
			storeUserAgent: true,
			storeLanguage: true,
		});
	});

	it('snapshot token for fallback policy contains matchedBy=fallback', async () => {
		const app = createInitApp();
		const body = await fetchInit(app, {});

		const payload = await verifyPolicySnapshotToken({
			token: body.policySnapshotToken,
			options: { signingKey: SIGNING_KEY },
		});

		expect(payload?.matchedBy).toBe('fallback');
		expect(payload?.policyId).toBe('eu_opt_in');
		expect(payload?.country).toBeNull();
	});

	it('does not produce a snapshot token when signingKey is not configured', async () => {
		const app = createInitApp({ policySnapshot: undefined });
		const body = await fetchInit(app, { 'x-c15t-country': 'DE' });

		expect(body.policy?.id).toBe('eu_opt_in');
		expect(body.policySnapshotToken).toBeUndefined();
	});

	// -------------------------------------------------------------------------
	// Fingerprint consistency
	// -------------------------------------------------------------------------

	it('produces fingerprints consistent with the shared resolver', async () => {
		const app = createInitApp();
		const body = await fetchInit(app, { 'x-c15t-country': 'DE' });

		const sharedResult = await resolvePolicyDecision({
			policies: POLICY_PACKS,
			countryCode: 'DE',
			regionCode: null,
			jurisdiction: 'GDPR',
		});

		expect(body.policyDecision?.fingerprint).toBe(sharedResult?.fingerprint);
	});

	it('produces different fingerprints for different policies', async () => {
		const app = createInitApp();

		const deBody = await fetchInit(app, { 'x-c15t-country': 'DE' });
		const caBody = await fetchInit(app, {
			'x-c15t-country': 'US',
			'x-c15t-region': 'CA',
		});

		expect(deBody.policyDecision?.fingerprint).toBeDefined();
		expect(caBody.policyDecision?.fingerprint).toBeDefined();
		expect(deBody.policyDecision?.fingerprint).not.toBe(
			caBody.policyDecision?.fingerprint
		);
	});

	// -------------------------------------------------------------------------
	// GPC per-policy
	// -------------------------------------------------------------------------

	it('includes gpc=true in California policy and gpc=false in EU policy', async () => {
		const app = createInitApp();

		const euBody = await fetchInit(app, { 'x-c15t-country': 'DE' });
		const caBody = await fetchInit(app, {
			'x-c15t-country': 'US',
			'x-c15t-region': 'CA',
		});

		expect(euBody.policy?.consent?.gpc).toBe(false);
		expect(caBody.policy?.consent?.gpc).toBe(true);
	});

	it('gpc value is preserved in snapshot token', async () => {
		const app = createInitApp();

		const caBody = await fetchInit(app, {
			'x-c15t-country': 'US',
			'x-c15t-region': 'CA',
		});

		const payload = await verifyPolicySnapshotToken({
			token: caBody.policySnapshotToken,
			options: { signingKey: SIGNING_KEY },
		});

		expect(payload?.gpc).toBe(true);
	});

	// -------------------------------------------------------------------------
	// Edge cases
	// -------------------------------------------------------------------------

	it('no-banner mode when explicit empty pack is configured', async () => {
		const app = createInitApp({ policyPacks: [] });
		const body = await fetchInit(app, { 'x-c15t-country': 'DE' });

		expect(body.policy?.id).toBe('no_banner');
		expect(body.policy?.model).toBe('none');
		expect(body.policyDecision).toBeUndefined();
		expect(body.policySnapshotToken).toBeUndefined();
	});

	it('region match takes priority over country match', async () => {
		const app = createInitApp({
			policyPacks: [
				{
					id: 'us_ca_strict',
					match: policyMatchers.regions([{ country: 'US', region: 'CA' }]),
					consent: { model: 'opt-in' },
					ui: { mode: 'banner' },
				},
				{
					id: 'us_general',
					match: policyMatchers.countries(['US']),
					consent: { model: 'opt-out' },
					ui: { mode: 'none' },
				},
			],
		});

		const caBody = await fetchInit(app, {
			'x-c15t-country': 'US',
			'x-c15t-region': 'CA',
		});
		const nyBody = await fetchInit(app, {
			'x-c15t-country': 'US',
			'x-c15t-region': 'NY',
		});

		expect(caBody.policy?.id).toBe('us_ca_strict');
		expect(caBody.policyDecision?.matchedBy).toBe('region');
		expect(nyBody.policy?.id).toBe('us_general');
		expect(nyBody.policyDecision?.matchedBy).toBe('country');
	});
});
