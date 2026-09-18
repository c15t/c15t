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
