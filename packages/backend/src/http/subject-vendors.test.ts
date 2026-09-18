/**
 * Vendor-level consent through the HTTP surface, on every engine.
 *
 * A save may carry `vendorChoice`, the complete per-vendor grant map with one
 * confirmation time. The backend stores it as sent, refuses a grant for a
 * vendor the manifest does not declare, keeps a denial for one it no longer
 * declares, and reads back the newest map as `subjectVendorChoice`. Saves
 * without vendors are unaffected.
 */

import type { PolicyRule, Vendor } from '@c15t/schema';
import { afterEach, assert, beforeEach, describe, it } from 'vitest';

import { ENGINES } from '../__tests__/engines';
import { createHttpHarness } from '../__tests__/http-harness';
import type { HttpHarness } from '../__tests__/http-harness';

const T0 = 1_700_000_000_000;
const T1 = T0 + 60_000;

const RULES: PolicyRule[] = [
	{
		id: 'world_opt_in',
		match: { isDefault: true },
		model: 'opt-in',
		prompt: 'choice',
	},
];

const VENDORS: Vendor[] = [
	{
		category: 'marketing',
		id: 'meta-pixel',
		name: 'Meta Pixel',
		privacyPolicyUrl: 'https://www.facebook.com/privacy/policy/',
	},
	{
		category: 'measurement',
		id: 'google-analytics',
		name: 'Google Analytics',
		privacyPolicyUrl: 'https://policies.google.com/privacy',
	},
];

const base = {
	domain: 'example.com',
	preferences: { marketing: true, measurement: true, necessary: true },
	subjectId: 'sub_vendors1',
	type: 'cookie_banner',
};

for (const engine of ENGINES) {
	describe(`vendor consent over HTTP (${engine.name})`, () => {
		let harness: HttpHarness;

		beforeEach(async () => {
			harness = await createHttpHarness(engine, {
				manifest: {
					appName: 'Vendors',
					policyRules: RULES,
					vendorListVersion: '2026-09',
					vendors: VENDORS,
				},
				tenantId: 'tenant_v',
			});
		});

		afterEach(async () => {
			await harness.dispose();
		});

		it('returns the declared vendors from init', async () => {
			const init = await harness.json('GET', '/init', undefined, {
				'x-c15t-country': 'DE',
			});
			assert.strictEqual(init.status, 200, JSON.stringify(init.body));
			assert.deepStrictEqual(init.body.vendors, VENDORS);
			assert.strictEqual(init.body.vendorListVersion, '2026-09');
		});

		it('stores the grant map as sent and reads back the newest one', async () => {
			const first = await harness.json('POST', '/subjects', {
				...base,
				givenAt: T0,
				vendorChoice: {
					confirmedAt: T0,
					grants: { 'google-analytics': true, 'meta-pixel': false },
					version: 1,
				},
			});
			assert.strictEqual(first.status, 200, JSON.stringify(first.body));

			const second = await harness.json('POST', '/subjects', {
				...base,
				givenAt: T1,
				vendorChoice: {
					confirmedAt: T1,
					grants: { 'google-analytics': false, 'meta-pixel': true },
					version: 1,
				},
			});
			assert.strictEqual(second.status, 200, JSON.stringify(second.body));

			const read = await harness.json('GET', `/subjects/${base.subjectId}`);
			assert.strictEqual(read.status, 200);
			const consents = read.body.consents as { vendorChoice?: unknown }[];
			assert.strictEqual(consents.length, 2);
			// Consents read newest first; each row keeps the map it was sent with.
			assert.deepStrictEqual(
				consents.map((consent) => consent.vendorChoice),
				[
					{
						confirmedAt: T1,
						grants: { 'google-analytics': false, 'meta-pixel': true },
						version: 1,
					},
					{
						confirmedAt: T0,
						grants: { 'google-analytics': true, 'meta-pixel': false },
						version: 1,
					},
				]
			);
			assert.deepStrictEqual(read.body.subjectVendorChoice, {
				confirmedAt: T1,
				grants: { 'google-analytics': false, 'meta-pixel': true },
				version: 1,
			});
		});

		it('refuses a grant for a vendor the manifest does not declare and keeps a denial', async () => {
			const granted = await harness.json('POST', '/subjects', {
				...base,
				givenAt: T0,
				vendorChoice: {
					confirmedAt: T0,
					grants: { 'meta-pixel': true, 'removed-vendor': true },
					version: 1,
				},
			});
			assert.strictEqual(granted.status, 400, JSON.stringify(granted.body));
			assert.strictEqual(
				(granted.body.cause as { code: string }).code,
				'VENDOR_OUT_OF_SCOPE'
			);

			const denied = await harness.json('POST', '/subjects', {
				...base,
				givenAt: T0,
				vendorChoice: {
					confirmedAt: T0,
					grants: { 'meta-pixel': true, 'removed-vendor': false },
					version: 1,
				},
			});
			assert.strictEqual(denied.status, 200, JSON.stringify(denied.body));
		});

		it('refuses a vendor confirmation later than the server clock', async () => {
			const future = await harness.json('POST', '/subjects', {
				...base,
				givenAt: T0,
				vendorChoice: {
					confirmedAt: Date.now() + 60_000,
					grants: { 'meta-pixel': false },
					version: 1,
				},
			});
			assert.strictEqual(future.status, 400, JSON.stringify(future.body));
		});

		it('reports null vendor state for a subject that never sent a map', async () => {
			const saved = await harness.json('POST', '/subjects', {
				...base,
				givenAt: T0,
			});
			assert.strictEqual(saved.status, 200, JSON.stringify(saved.body));
			const read = await harness.json('GET', `/subjects/${base.subjectId}`);
			assert.strictEqual(read.body.subjectVendorChoice, null);
			const consents = read.body.consents as { vendorChoice?: unknown }[];
			assert.isUndefined(consents[0]?.vendorChoice);
		});

		it('refuses a retry of the same act with a different vendor map', async () => {
			const first = await harness.json('POST', '/subjects', {
				...base,
				givenAt: T0,
				vendorChoice: {
					confirmedAt: T0,
					grants: { 'meta-pixel': false },
					version: 1,
				},
			});
			assert.strictEqual(first.status, 200);
			const conflict = await harness.json('POST', '/subjects', {
				...base,
				givenAt: T0,
				vendorChoice: {
					confirmedAt: T0,
					grants: { 'meta-pixel': true },
					version: 1,
				},
			});
			assert.strictEqual(conflict.status, 400, JSON.stringify(conflict.body));
			assert.strictEqual(
				(conflict.body.cause as { code: string }).code,
				'CONFLICT'
			);
		});
	});
}
