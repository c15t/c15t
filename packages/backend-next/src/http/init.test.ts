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
	type ConsentManifestConfig,
	resolveInitFromManifest,
} from '@c15t/schema/types';
import { assert, describe, it } from 'vitest';
import { buildInitResponse, readInitSignals } from './init';
import {
	buildManifestResponse,
	createManifestCacheControl,
	DEFAULT_MANIFEST_S_MAXAGE,
} from './manifest';

const config: ConsentManifestConfig = {
	tenantId: 'tenant_1',
	appName: 'Example',
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
		const fromHost = resolveInitFromManifest(manifest, {
			country: null,
			region: null,
			language: 'de-DE',
			gpc: true,
		});

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
