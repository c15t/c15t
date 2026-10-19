/**
 * Configured scripts through the HTTP surface, on every engine. A save
 * stores the list on its consent row, minus unknown entry keys, with each
 * entry stamped with whether the recorded consent allowed it. A replay of
 * the same act with a different list is still the same act, and the row
 * keeps its first list.
 */

import type { PolicyRule } from '@c15t/schema';
import { Effect } from 'effect';
import { SqlClient } from 'effect/sql';
import { afterEach, assert, beforeEach, describe, it } from 'vitest';

import { ENGINES } from '../__tests__/engines';
import { createHttpHarness } from '../__tests__/http-harness';
import type { HttpHarness } from '../__tests__/http-harness';

const SIGNING_KEY = 'test-signing-key-at-least-32-chars-long';

const T0 = 1_700_000_000_000;

const RULES: PolicyRule[] = [
	{
		id: 'world_opt_in',
		match: { isDefault: true },
		model: 'opt-in',
		prompt: 'choice',
	},
];

const SCRIPTS = [
	{ category: 'measurement', id: 'posthog', vendor: 'posthog' },
	{
		category: { and: ['marketing', 'measurement'] },
		id: 'meta-pixel',
		vendor: 'meta-pixel',
	},
	{ category: 'measurement', id: 'google-analytics', vendorId: 755 },
	{ alwaysLoad: true, category: 'marketing', id: 'error-reporting' },
];

/** `SCRIPTS` as stored for `base.preferences` with no policy to apply. */
const RECORDED = [
	{ ...SCRIPTS[0], allowed: true },
	{ ...SCRIPTS[1], allowed: false },
	// IAB TCF fields outside an `iab` policy: the browser refuses these.
	{ ...SCRIPTS[2], allowed: false },
	{ ...SCRIPTS[3], allowed: true },
];

const base = {
	domain: 'example.com',
	givenAt: T0,
	preferences: { marketing: false, measurement: true, necessary: true },
	subjectId: 'sub_scriptsaves1',
	type: 'cookie_banner',
};

for (const engine of ENGINES) {
	describe(`configured scripts over HTTP (${engine.name})`, () => {
		let harness: HttpHarness;

		const storedScripts = () =>
			harness.runtime.runPromise(
				Effect.gen(function* stored() {
					const sql = yield* SqlClient.SqlClient;
					const rows = yield* sql<{ scripts: unknown }>`
						select ${sql('scripts')} from ${sql('consent')}
						where ${sql('subjectId')} = ${base.subjectId}
					`;
					assert.lengthOf(rows, 1);
					const value = rows[0]?.scripts;
					return typeof value === 'string' ? JSON.parse(value) : value;
				})
			);

		beforeEach(async () => {
			harness = await createHttpHarness(engine, {
				manifest: { appName: 'Configured scripts', policyRules: RULES },
				tenantId: 'tenant_scripts',
			});
		});

		afterEach(async () => {
			await harness.dispose();
		});

		it('stores each script with whether the consent allowed it', async () => {
			const saved = await harness.json('POST', '/subjects', {
				...base,
				scripts: SCRIPTS,
			});
			assert.strictEqual(saved.status, 200, JSON.stringify(saved.body));
			assert.deepStrictEqual(await storedScripts(), RECORDED);
		});

		it('ignores an allowed flag the client sent', async () => {
			const saved = await harness.json('POST', '/subjects', {
				...base,
				scripts: [{ allowed: true, category: 'marketing', id: 'ads' }],
			});
			assert.strictEqual(saved.status, 200, JSON.stringify(saved.body));
			assert.deepStrictEqual(await storedScripts(), [
				{ allowed: false, category: 'marketing', id: 'ads' },
			]);
		});

		it('drops entry keys the schema does not know', async () => {
			const saved = await harness.json('POST', '/subjects', {
				...base,
				scripts: [
					{
						category: 'measurement',
						id: 'ga',
						src: 'https://example.com/ga.js',
					},
				],
			});
			assert.strictEqual(saved.status, 200, JSON.stringify(saved.body));
			assert.deepStrictEqual(await storedScripts(), [
				{ allowed: true, category: 'measurement', id: 'ga' },
			]);
		});

		it('stores null when the save carries no list', async () => {
			const saved = await harness.json('POST', '/subjects', base);
			assert.strictEqual(saved.status, 200, JSON.stringify(saved.body));
			assert.isNull(await storedScripts());
		});

		it('keeps the first list when the same act is replayed with another', async () => {
			const first = await harness.json('POST', '/subjects', {
				...base,
				scripts: SCRIPTS,
			});
			assert.strictEqual(first.status, 200, JSON.stringify(first.body));

			const replay = await harness.json('POST', '/subjects', {
				...base,
				scripts: [{ category: 'marketing', id: 'added-later' }],
			});
			assert.strictEqual(replay.status, 200, JSON.stringify(replay.body));
			assert.deepStrictEqual(await storedScripts(), RECORDED);
		});

		it('refuses an entry with an unknown category', async () => {
			const refused = await harness.json('POST', '/subjects', {
				...base,
				scripts: [{ category: 'advertising', id: 'ads' }],
			});
			assert.strictEqual(refused.status, 400, JSON.stringify(refused.body));
			assert.strictEqual(await harness.count('consent'), 0);
		});

		it('refuses a condition nested deeper than a browser sends', async () => {
			let category: unknown = 'marketing';
			for (let level = 0; level < 20_000; level += 1) {
				category = { not: category };
			}
			const refused = await harness.json('POST', '/subjects', {
				...base,
				scripts: [{ category, id: 'deep' }],
			});
			assert.strictEqual(refused.status, 400, JSON.stringify(refused.body));
			assert.strictEqual(await harness.count('consent'), 0);
		});
	});
}

const POLICY_RULES: PolicyRule[] = [
	{
		categories: ['marketing', 'measurement'],
		id: 'eu_opt_in',
		match: { countries: ['DE'] },
		model: 'opt-in',
		privacySignals: { gpc: { denyCategories: ['marketing'] } },
		prompt: 'choice',
		scopeMode: 'strict',
	},
	{
		id: 'world_opt_out',
		match: { isDefault: true },
		model: 'opt-out',
		prompt: 'none',
	},
];

const POLICY_SCRIPTS = [
	{ category: 'measurement', id: 'posthog', vendor: 'posthog' },
	{ category: 'marketing', id: 'meta-pixel' },
	{ category: 'functionality', id: 'support-chat' },
];

for (const engine of ENGINES) {
	describe(`allowed scripts under a resolved policy (${engine.name})`, () => {
		let harness: HttpHarness;

		const storedAllowed = () =>
			harness.runtime.runPromise(
				Effect.gen(function* stored() {
					const sql = yield* SqlClient.SqlClient;
					const rows = yield* sql<{ scripts: unknown }>`
						select ${sql('scripts')} from ${sql('consent')}
						where ${sql('subjectId')} = ${base.subjectId}
					`;
					const value = rows[0]?.scripts;
					const scripts = (
						typeof value === 'string' ? JSON.parse(value) : value
					) as { id: string; allowed?: boolean }[];
					return Object.fromEntries(
						scripts.map((script) => [script.id, script.allowed])
					);
				})
			);

		const saveAfterInit = async (
			country: string,
			body: Record<string, unknown>,
			headers: Record<string, string> = {}
		) => {
			const init = await harness.json('GET', '/init', undefined, {
				'x-c15t-country': country,
			});
			assert.isString(init.body.policySnapshotToken);
			const saved = await harness.json(
				'POST',
				'/subjects',
				{
					...base,
					policySnapshotToken: init.body.policySnapshotToken,
					scripts: POLICY_SCRIPTS,
					...body,
				},
				headers
			);
			assert.strictEqual(saved.status, 200, JSON.stringify(saved.body));
		};

		beforeEach(async () => {
			harness = await createHttpHarness(engine, {
				manifest: { appName: 'Allowed scripts', policyRules: POLICY_RULES },
				policySnapshot: { signingKey: SIGNING_KEY },
				tenantId: 'tenant_scripts',
			});
		});

		afterEach(async () => {
			await harness.dispose();
		});

		it('applies strict scope and a GPC denial the policy configures', async () => {
			await saveAfterInit(
				'DE',
				{
					preferences: {
						marketing: true,
						measurement: true,
						necessary: true,
					},
				},
				{ 'sec-gpc': '1' }
			);
			assert.deepStrictEqual(await storedAllowed(), {
				'meta-pixel': false,
				posthog: true,
				'support-chat': false,
			});
		});

		it('judges a replayed save by the GPC signal the visitor acted under', async () => {
			// The browser stopped sending GPC between the action and the replay.
			await saveAfterInit(
				'DE',
				{
					gpc: true,
					preferences: {
						marketing: true,
						measurement: true,
						necessary: true,
					},
				},
				{ 'sec-gpc': '0' }
			);
			assert.deepStrictEqual(await storedAllowed(), {
				'meta-pixel': false,
				posthog: true,
				'support-chat': false,
			});
		});

		it('denies a script whose vendor the subject turned off', async () => {
			await saveAfterInit('DE', {
				preferences: { marketing: true, measurement: true, necessary: true },
				vendorChoice: {
					confirmedAt: T0,
					grants: { posthog: false },
					version: 1,
				},
			});
			assert.deepStrictEqual(await storedAllowed(), {
				'meta-pixel': true,
				posthog: false,
				'support-chat': false,
			});
		});

		it('leaves allowed unset when it turns on a grant the save did not confirm', async () => {
			// The marketing grant is an earlier one. The browser ignores it if
			// its receipt has lapsed, and only this save's receipts arrive.
			await saveAfterInit('DE', {
				choice: {
					categories: {
						measurement: {
							basis: { fingerprint: 'fp', kind: 'choice-v1' },
							confirmedAt: T0,
							value: true,
						},
					},
					version: 3,
				},
				preferences: { marketing: true, measurement: true, necessary: true },
			});
			assert.deepStrictEqual(await storedAllowed(), {
				'meta-pixel': undefined,
				posthog: true,
				'support-chat': false,
			});
		});

		it('allows what an opt-out policy permits by default', async () => {
			await saveAfterInit('US', {
				preferences: { marketing: false, necessary: true },
			});
			assert.deepStrictEqual(await storedAllowed(), {
				'meta-pixel': false,
				posthog: true,
				'support-chat': true,
			});
		});
	});
}
