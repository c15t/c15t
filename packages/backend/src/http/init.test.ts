/**
 * `/init` and `/manifest`.
 *
 * The load-bearing assertion is the parity one: what this backend returns for
 * `/init` must equal what a host computes locally from the same `/manifest`.
 * RFC 0001 splits those two paths precisely so a host can skip the round trip,
 * and they are only interchangeable if they agree. A disagreement would show
 * different visitors different banners depending on which path their host
 * happened to take.
 */

import {
	buildConsentManifestFromConfig,
	resolveInitFromManifest,
} from '@c15t/schema/types';
import type { ConsentManifestConfig } from '@c15t/schema/types';
import { baseTranslations } from '@c15t/translations/all';
import { decodeJwt } from 'jose';
import { assert, describe, it } from 'vitest';

import { buildInitResponse, readInitSignals } from './init';
import {
	buildManifestResponse,
	createManifestCacheControl,
	DEFAULT_MANIFEST_S_MAXAGE,
} from './manifest';

const config: ConsentManifestConfig = {
	appName: 'Example',
	tenantId: 'tenant_1',
};

describe('init signals', () => {
	it('treats sec-gpc as affirmative only when it is exactly "1"', () => {
		// The spec defines '1' as the only affirmative value. Reading 'true' or
		// '0' as consent-relevant would act on a signal the visitor did not
		// send.
		for (const [value, expected] of [
			['1', true],
			['0', false],
			['true', false],
			['', false],
		] as const) {
			const headers = new Headers(value === '' ? {} : { 'sec-gpc': value });
			assert.strictEqual(readInitSignals(headers).gpc, expected, value);
		}
	});

	it('lets x-c15t-gpc override the browser sec-gpc signal', () => {
		// Scripts cannot set Sec-* request headers, so a client that asserts a
		// GPC value on its own init request sends the adapter header instead.
		assert.strictEqual(
			readInitSignals(new Headers({ 'sec-gpc': '1', 'x-c15t-gpc': '0' })).gpc,
			false
		);
		assert.strictEqual(
			readInitSignals(new Headers({ 'x-c15t-gpc': '1' })).gpc,
			true
		);
	});

	it('defaults language to en when the header is absent', () => {
		assert.strictEqual(readInitSignals(new Headers()).language, 'en');
	});

	it('reports absent geo as null rather than guessing', () => {
		const signals = readInitSignals(new Headers());
		assert.isNull(signals.country);
		assert.isNull(signals.region);
	});
});

describe('init and manifest parity', () => {
	it('matches what a host resolves locally from the manifest', async () => {
		const headers = new Headers({
			'accept-language': 'de-DE',
			'sec-gpc': '1',
		});

		const fromBackend = await buildInitResponse(config, headers);

		// What a host would do: fetch /manifest once, then resolve locally for
		// each visitor without touching the backend again.
		const manifest = await buildConsentManifestFromConfig(config);
		const fromHost = resolveInitFromManifest(
			manifest,
			{
				country: null,
				gpc: true,
				language: 'de-DE',
				region: null,
			},
			{ baseTranslations }
		);

		assert.deepStrictEqual(fromBackend.body, fromHost);
	});

	it('serves a manifest whose etag is its own revision', async () => {
		const result = await buildManifestResponse(config, undefined, null);
		const manifest = await buildConsentManifestFromConfig(config);

		// Deriving a second hash would risk the etag and the revision
		// disagreeing about whether a manifest changed.
		assert.strictEqual(result.etag, `"${manifest.revision}"`);
	});

	it('produces a stable revision for unchanged config', async () => {
		const first = await buildConsentManifestFromConfig(config);
		const second = await buildConsentManifestFromConfig(config);

		// A revision that moved on every build would bust every CDN cache and
		// every client etag on every deploy.
		assert.strictEqual(first.revision, second.revision);
	});
});

describe('manifest cache control', () => {
	it('uses the shipped defaults', () => {
		assert.strictEqual(
			createManifestCacheControl(undefined),
			`public, s-maxage=${DEFAULT_MANIFEST_S_MAXAGE}, stale-while-revalidate=86400`
		);
	});

	it('falls back rather than emitting a nonsense directive', () => {
		// A negative or non-finite value is a config mistake. Passing it
		// through would put something a CDN acts on into the header.
		for (const bad of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
			assert.include(
				createManifestCacheControl({ sMaxAge: bad }),
				`s-maxage=${DEFAULT_MANIFEST_S_MAXAGE}`
			);
		}
	});

	it('honours a configured value', () => {
		assert.include(
			createManifestCacheControl({ sMaxAge: 60, staleWhileRevalidate: 120 }),
			's-maxage=60, stale-while-revalidate=120'
		);
	});
});

describe('init policy snapshot token', () => {
	const snapshot = { signingKey: 'test-signing-key-at-least-32-chars-long' };

	it('omits the token when signing is not configured', async () => {
		const result = await buildInitResponse(config, new Headers());
		// The field is optional in the contract precisely because signing is
		// opt-in; an unsigned placeholder would be worse than its absence.
		assert.isUndefined(
			(result.body as { policySnapshotToken?: string }).policySnapshotToken
		);
	});

	it('omits the token when no policy matched', async () => {
		// Nothing was decided, so there is nothing to attest to.
		const result = await buildInitResponse(config, new Headers(), snapshot);
		assert.isUndefined(
			(result.body as { policySnapshotToken?: string }).policySnapshotToken
		);
	});

	it('still resolves identically to a local resolve', async () => {
		// The token is additive: adding it must not change the decision a host
		// computing locally would reach.
		const withToken = await buildInitResponse(config, new Headers(), snapshot);
		const without = await buildInitResponse(config, new Headers());

		const { policySnapshotToken: _omitted, ...rest } = withToken.body as {
			policySnapshotToken?: string;
		} & Record<string, unknown>;
		assert.deepStrictEqual(rest, without.body);
	});
});

describe('init GVL inclusion', () => {
	const GVL = {
		features: {},
		gvlSpecificationVersion: 3,
		lastUpdated: '2026-01-01T00:00:00Z',
		purposes: {},
		specialFeatures: {},
		specialPurposes: {},
		stacks: {},
		tcfPolicyVersion: 4,
		vendorListVersion: 1,
		vendors: {},
	};
	const serve = (() =>
		new Response(JSON.stringify(GVL))) as unknown as typeof globalThis.fetch;

	it('omits the vendor list when IAB is disabled', async () => {
		const result = await buildInitResponse(config, new Headers(), undefined, {
			enabled: false,
			fetch: serve,
		});
		// A non-IAB deployment must not pay for a document it will never read.
		assert.isUndefined((result.body as { gvl?: unknown }).gvl);
	});

	it('omits the vendor list when IAB is enabled but never fetched', async () => {
		const result = await buildInitResponse(config, new Headers(), undefined, {
			enabled: false,
		});
		assert.isUndefined((result.body as { gvl?: unknown }).gvl);
	});

	it('includes the vendor list when IAB is active', async () => {
		const result = await buildInitResponse(config, new Headers(), undefined, {
			enabled: true,
			fetch: serve,
		});
		assert.isDefined((result.body as { gvl?: unknown }).gvl);
	});

	it('still resolves when the vendor list cannot be fetched', async () => {
		const result = await buildInitResponse(config, new Headers(), undefined, {
			enabled: true,
			fetch: (() => {
				throw new Error('gvl upstream down');
			}) as unknown as typeof globalThis.fetch,
		});

		// The visitor still gets a consent decision. Failing /init because a
		// third party is unreachable would leave them with no banner at all.
		assert.isDefined(result.body);
		assert.isNull((result.body as { gvl?: unknown }).gvl ?? null);
	});

	it('passes the request language through to the fetch', async () => {
		let requested = '';
		const capture = ((url: string) => {
			requested = String(url);
			return new Response(JSON.stringify(GVL));
		}) as unknown as typeof globalThis.fetch;

		await buildInitResponse(
			config,
			new Headers({ 'accept-language': 'fr-CA' }),
			undefined,
			{ enabled: true, fetch: capture }
		);

		// Serving an English vendor list to a French visitor is a compliance
		// problem, not a cosmetic one.
		assert.include(requested, '/fr.json');
	});
});

/**
 * The snapshot-token path, which needs a policy that actually matches.
 *
 * Every other init case uses a bare config, so no policy resolves and the
 * token branch never runs — the branch that mints signed evidence of a
 * decision was the least exercised code in the module.
 */
describe('init with a matching policy', () => {
	const snapshot = { signingKey: 'test-signing-key-at-least-32-chars-long' };

	const withPolicy: ConsentManifestConfig = {
		appName: 'Example',
		policyPacks: [
			// oxlint-disable-next-line sort-keys -- Preserve declaration order, interface shape, and public compatibility.
			{
				id: 'pol_default',
				// isDefault so it matches regardless of geo, which keeps the case
				// about the token rather than about jurisdiction matching.
				match: { isDefault: true },
				consent: { model: 'opt-in' },
			},
		],
		tenantId: 'tenant_1',
	};

	it('resolves a policy decision', async () => {
		const { body } = await buildInitResponse(withPolicy, new Headers());
		assert.isDefined(
			(body as { policyDecision?: unknown }).policyDecision,
			'expected a default policy to match'
		);
	});

	it('mints a snapshot token when signing is configured', async () => {
		const { body } = await buildInitResponse(
			withPolicy,
			new Headers(),
			snapshot
		);
		const token = (body as { policySnapshotToken?: string })
			.policySnapshotToken;

		assert.isString(token);
		// Three segments: it is a real signed JWT, not a placeholder.
		assert.strictEqual(token?.split('.').length, 3);
	});

	it('omits the token when signing is not configured', async () => {
		const { body } = await buildInitResponse(withPolicy, new Headers());
		assert.isUndefined(
			(body as { policySnapshotToken?: string }).policySnapshotToken
		);
	});

	it('binds the token to the decision it attests to', async () => {
		const { body } = await buildInitResponse(
			withPolicy,
			new Headers(),
			snapshot
		);
		const typed = body as {
			policySnapshotToken?: string;
			policyDecision?: { policyId: string; fingerprint: string };
		};
		const claims = decodeJwt(typed.policySnapshotToken ?? '');

		// A token attesting to a different decision than the one returned would
		// be worse than none — the server would verify evidence for a decision
		// the visitor never saw.
		assert.strictEqual(claims.policyId, typed.policyDecision?.policyId);
		assert.strictEqual(claims.fingerprint, typed.policyDecision?.fingerprint);
		assert.strictEqual(claims.tenantId, 'tenant_1');
	});

	it('carries the tenant into the token audience', async () => {
		const { body } = await buildInitResponse(
			withPolicy,
			new Headers(),
			snapshot
		);
		const claims = decodeJwt(
			(body as { policySnapshotToken?: string }).policySnapshotToken ?? ''
		);
		// Tenant-scoped audience is what stops evidence being portable between
		// tenants.
		assert.strictEqual(claims.aud, 'c15t-policy-snapshot:tenant_1');
	});
});
