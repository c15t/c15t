/**
 * The vendor list a matched IAB rule is on its way to disclosing.
 *
 * The reported failure: a self-hosted IAB deployment whose banner named no
 * vendors. `/init` resolved the IAB rule correctly and then embedded nothing,
 * because the gate also wanted `gvl.enabled === true` and a deployment that
 * configured a cache and a vendor scope had no reason to suspect a second
 * switch was pending. Every disclosure surface sits behind that field, and on a
 * device it is the only surface there is: a phone never fetches a list, it reads
 * the one `/init` brought. See `native/core-swift` and the Android core, which
 * store and serve exactly what the response carried.
 *
 * These run against the shipped `europeIab()` preset rather than a hand-written
 * rule. The half-configured deployment is a configuration story, and the preset
 * is what a quickstart copies.
 */

import { policyRulePresets } from '@c15t/schema/types';
import type { ConsentManifestConfig } from '@c15t/schema/types';
import { afterEach, assert, beforeEach, describe, it } from 'vitest';

import { ENGINES } from '../__tests__/engines';
import { createHttpHarness } from '../__tests__/http-harness';
import type { HttpHarness } from '../__tests__/http-harness';
import type { CacheAdapter, GvlConfig } from './gvl';
import { buildInitResponse } from './init';

const [engine] = ENGINES;
if (!engine) {
	throw new Error('No test engine available');
}

/** A vendor entry complete enough for `gvlVendorSchema`. */
const vendor = (id: number) => ({
	cookieMaxAgeSeconds: null,
	cookieRefresh: false,
	features: [],
	flexiblePurposes: [],
	id,
	legIntPurposes: [],
	name: `Vendor ${id}`,
	purposes: [1],
	specialFeatures: [],
	specialPurposes: [],
	urls: [],
	usesCookies: false,
	usesNonCookieAccess: false,
});

/**
 * A list with the publisher's vendors in it and one that is not, so a served
 * document that ignored the scope is visible rather than merely untested.
 */
const LIST = {
	features: {},
	gvlSpecificationVersion: 3,
	lastUpdated: '2026-09-17T16:00:19Z',
	purposes: {},
	specialFeatures: {},
	specialPurposes: {},
	stacks: {},
	tcfPolicyVersion: 5,
	vendorListVersion: 177,
	// oxlint-disable-next-line sort-keys -- Ids read in numeric order, and the assertions below name them one at a time.
	vendors: { 7: vendor(7), 41: vendor(41), 672: vendor(672), 999: vendor(999) },
};

/** The vendor list as `/init` carries it. */
interface GvlWire {
	vendorListVersion?: number;
	vendors?: Record<string, unknown>;
}

/** The one field of an `/init` body these tests read. */
interface GvlBody {
	gvl?: GvlWire | null;
}

/** Records the URLs it was asked for, answering every one with `LIST`. */
const listServer = () => {
	const urls: string[] = [];
	const fetch = ((input: RequestInfo | URL) => {
		urls.push(String(input));
		return Promise.resolve(new Response(JSON.stringify(LIST)));
	}) as unknown as typeof globalThis.fetch;
	return { fetch, urls };
};

const manifest: ConsentManifestConfig = {
	appName: 'c15t-self-host',
	iab: { cmpId: 53, enabled: true },
	policyRules: [policyRulePresets.europeIab()],
	tenantId: 'ins_1',
};

/** A Berlin visitor: covered by the preset, German-language. */
const berlin = () =>
	new Headers({ 'accept-language': 'de-DE', 'x-c15t-country': 'DE' });

describe('/init serves the vendor list a matched IAB rule asked for', () => {
	it('embeds it with no second flag beyond the configured block', async () => {
		// The regression: a `gvl` block that configures a scope and a cache, and
		// nobody who wrote it also wrote `enabled`.
		const { fetch, urls } = listServer();
		const { body } = await buildInitResponse(manifest, berlin(), undefined, {
			fetch,
			vendorIds: [7, 41, 672],
		});

		const resolution = body.policyResolution as {
			policy?: { model?: string };
			status?: string;
		};
		assert.strictEqual(resolution.status, 'matched');
		assert.strictEqual(resolution.policy?.model, 'iab');
		assert.isDefined((body as GvlBody).gvl);
		assert.strictEqual(urls.length, 1);
	});

	it('keeps the vendor scope exactly as configured, and no wider', async () => {
		// Vendor 999 is in the fetched document and outside the scope. Serving it
		// would disclose a partner this publisher never configured: the scope is
		// a firewall rule, and it only ever narrows.
		const { fetch, urls } = listServer();
		const { body } = await buildInitResponse(manifest, berlin(), undefined, {
			fetch,
			vendorIds: [7, 41, 672],
		});

		const { gvl } = body as GvlBody;
		assert.deepStrictEqual(Object.keys(gvl?.vendors ?? {}), ['7', '41', '672']);
		// The scope also travels upstream, so the wide document is never on the
		// wire twice.
		assert.match(urls[0] ?? '', /vendorIds=7(?:%2C|,)41(?:%2C|,)672/u);
	});

	it('names the vendor a visitor is actually shown', async () => {
		// The reported symptom in one assertion: what does the phone learn about
		// 672?
		const { fetch } = listServer();
		const { body } = await buildInitResponse(manifest, berlin(), undefined, {
			fetch,
			vendorIds: [7, 41, 672],
		});

		const { gvl } = body as GvlBody;
		assert.strictEqual(
			(gvl?.vendors?.['672'] as { name?: string } | undefined)?.name,
			'Vendor 672'
		);
	});

	it('serves no list to a location the IAB rule does not govern', async () => {
		// California gets the opt-out rule, so the IAB deployment pays nothing
		// here: the fetch is downstream of the matched model, not of the block
		// existing.
		const { fetch, urls } = listServer();
		const { body } = await buildInitResponse(
			{
				...manifest,
				policyRules: [
					policyRulePresets.californiaOptOut(),
					policyRulePresets.europeIab(),
				],
			},
			new Headers({ 'x-c15t-country': 'US', 'x-c15t-region': 'CA' }),
			undefined,
			{ fetch, vendorIds: [7, 41, 672] }
		);

		assert.strictEqual(
			(body.policyResolution as { policyId?: string }).policyId,
			'california_opt_out'
		);
		assert.isUndefined((body as GvlBody).gvl);
		assert.strictEqual(urls.length, 0);
	});
});

describe('the /init route carries the list end to end', () => {
	let harness: HttpHarness;

	beforeEach(async () => {
		harness = await createHttpHarness(engine, {
			manifest,
			// The demo's shape: a scope, no `enabled`.
			trustedOrigins: ['https://app.example.com'],
		});
	});

	afterEach(async () => {
		await harness.dispose();
	});

	it('answers a covered visitor with the scoped list', async () => {
		const { fetch, urls } = listServer();
		const app = harness.appWith({
			gvl: { fetch, vendorIds: [7, 41, 672] },
			manifest,
			trustedOrigins: ['https://app.example.com'],
		});

		const init = await harness.json(
			'GET',
			'/init',
			undefined,
			{ 'x-c15t-country': 'DE' },
			app
		);

		// The wire a phone reads, not the resolver's return value.
		const { gvl } = init.body as GvlBody;
		assert.strictEqual(init.status, 200);
		assert.strictEqual(gvl?.vendorListVersion, 177);
		assert.deepStrictEqual(Object.keys(gvl?.vendors ?? {}), ['7', '41', '672']);
		assert.strictEqual(urls.length, 1);
	});
});
/** A cache one test owns, so two `/init` calls can share one upstream fetch. */
const sharedCache = (): CacheAdapter => {
	const entries = new Map<string, unknown>();
	return {
		delete: (key) => {
			entries.delete(key);
			return Promise.resolve();
		},
		get: <T>(key: string) => Promise.resolve((entries.get(key) as T) ?? null),
		has: (key) => Promise.resolve(entries.has(key)),
		set: (key, value) => {
			entries.set(key, value);
			return Promise.resolve();
		},
	};
};

describe('a device declares which vendors it renders', () => {
	// Everything outside this block is a browser's story. The deployment's
	// `gvl.vendorIds` is the scope, and a browser asks the GVL endpoint for its
	// own slice of the document, so the server never has to be told what the
	// page shows. A device has no second path: it reads the list `/init`
	// embedded, over the connection the visitor happens to be on, and
	// `x-c15t-vendors` is how an app says which partners it actually renders.
	//
	// Each case takes its own endpoint as well as its own cache. The in-flight
	// map in `gvl.ts` is module-scoped, and two requests sharing a key make one
	// test observe another test's promise instead of its own fetch.
	const CONFIGURED = [7, 41, 672, 999];
	const CONFIGURED_KEYS = ['7', '41', '672', '999'];

	/** `/init` for one Berlin device, as the vendor keys it was served. */
	const servedKeys = async function servedKeys(
		gvl: GvlConfig,
		declared?: string
	): Promise<string[]> {
		const headers = berlin();
		if (declared !== undefined) {
			headers.set('x-c15t-vendors', declared);
		}
		const { body } = await buildInitResponse(manifest, headers, undefined, gvl);
		return Object.keys((body as GvlBody).gvl?.vendors ?? {});
	};

	it('narrows a matched list to the pair the device asked for', async () => {
		// The reason the header exists: an app that renders two vendors should
		// not pay for the whole configured document on every cold start, and it
		// has no other way to ask. The upstream request still names every
		// configured vendor, because narrowing is not an upstream question.
		const { fetch, urls } = listServer();
		const keys = await servedKeys(
			{
				endpoint: 'https://gvl-declared.test',
				fetch,
				vendorIds: CONFIGURED,
			},
			'7, 41'
		);

		assert.deepStrictEqual(keys, ['7', '41']);
		assert.strictEqual(urls.length, 1);
		assert.match(urls[0] ?? '', /vendorIds=7(?:%2C|,)41(?:%2C|,)672/u);
	});

	it('cannot disclose a vendor the configuration does not carry', async () => {
		// A declared scope is a filter, never a request. 999 arrives in the
		// fetched document and sits outside the configured scope, so naming it
		// here cannot put it on the wire: the two scopes intersect, and an
		// intersection is all either of them can ever do to a response.
		const { fetch } = listServer();
		const keys = await servedKeys(
			{
				endpoint: 'https://gvl-ceiling.test',
				fetch,
				vendorIds: [7, 41, 672],
			},
			'999, 672'
		);

		assert.deepStrictEqual(keys, ['672']);
	});

	it('serves the configured scope to a header it cannot read', async () => {
		// Five unusable values: a word, a wrong separator, a zero id, a scope
		// past 500 ids, and nothing at all. Input any one of them, expected
		// output is the configured ['7', '41', '672'], and the response is a
		// 200 rather than a 4xx. `/init` is the critical rendering path, so a
		// device built against the wrong constant still has to get a banner,
		// and a partial reading of a scope nobody sent is worse than none.
		const oversized = Array.from({ length: 501 }, (_, i) => i + 1).join(',');
		const { fetch } = listServer();
		const gvl = {
			endpoint: 'https://gvl-unreadable.test',
			fetch,
			vendorIds: [7, 41, 672],
		};
		const unreadable = ['seven', '7;41', '0', oversized, ''];

		// Asked together, which covers the shared in-flight lane as well.
		const served = await Promise.all(
			unreadable.map((declared) => servedKeys(gvl, declared))
		);

		assert.deepStrictEqual(
			served,
			unreadable.map(() => ['7', '41', '672'])
		);
	});

	it('keeps an absent and an empty declared scope identical', async () => {
		// Inputs: vendorIds [7, 41, 672, 999] configured, asked for with (a) no
		// header at all and (b) `x-c15t-vendors: `, which is the only spelling
		// an empty declared scope has on the wire. Expected output for both is
		// ['7', '41', '672', '999']. They come back identical on purpose: both
		// reach the narrowing as "no filter", so the configured scope is left
		// alone. Declaring nothing is not a way to be served nothing, and
		// `parseVendorScopeHeader` never produces an empty array, so nil is the
		// branch `narrowToDeclaredScope` always takes for an absent header.
		const { fetch } = listServer();
		const gvl = {
			endpoint: 'https://gvl-absent.test',
			fetch,
			vendorIds: CONFIGURED,
		};

		assert.deepStrictEqual(await servedKeys(gvl), CONFIGURED_KEYS);
		assert.deepStrictEqual(await servedKeys(gvl, ''), CONFIGURED_KEYS);
	});

	it('fetches once for devices sharing a configured scope', async () => {
		// The no-extra-download promise: two devices, two declared scopes, one
		// upstream fetch. The cache entry stays at the configured width, which
		// is what lets the second device be answered from the entry the
		// configured scope produced rather than from one the first device
		// minted for itself.
		const { fetch, urls } = listServer();
		const gvl = {
			cache: sharedCache(),
			endpoint: 'https://gvl-once.test',
			fetch,
			vendorIds: CONFIGURED,
		};

		assert.deepStrictEqual(await servedKeys(gvl, '7, 41'), ['7', '41']);
		assert.deepStrictEqual(await servedKeys(gvl, '672'), ['672']);

		assert.strictEqual(urls.length, 1);
	});
});

describe('the /init route carries the declared scope', () => {
	let harness: HttpHarness;

	beforeEach(async () => {
		harness = await createHttpHarness(engine, {
			manifest,
			trustedOrigins: ['https://app.example.com'],
		});
	});

	afterEach(async () => {
		await harness.dispose();
	});

	it('answers the wire a device reads, headers included', async () => {
		// The route rather than the resolver: the header has to survive request
		// parsing, and `Vary` has to name it, since a shared cache that leans on
		// `Vary` instead of `no-store` would otherwise hand one device's
		// narrowed list to the next device that asks.
		const { fetch } = listServer();
		const app = harness.appWith({
			gvl: { cache: sharedCache(), fetch, vendorIds: [7, 41, 672, 999] },
			manifest,
			trustedOrigins: ['https://app.example.com'],
		});

		const response = await app.request('/init', {
			headers: { 'x-c15t-country': 'DE', 'x-c15t-vendors': '7, 41' },
		});
		const body = (await response.json()) as GvlBody;

		assert.strictEqual(response.status, 200);
		assert.deepStrictEqual(Object.keys(body.gvl?.vendors ?? {}), ['7', '41']);
		assert.strictEqual(response.headers.get('Cache-Control'), 'no-store');
		const vary = response.headers.get('Vary') ?? '';
		assert.isTrue(vary.includes('Origin'), vary);
		assert.isTrue(vary.includes('x-c15t-vendors'), vary);
	});
});
