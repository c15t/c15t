/**
 * The Google Additional Consent string through the HTTP surface, on every
 * engine. A save stores it on the consent row beside its TC string. One sent
 * without a TC string is dropped, since Google discards it alone, and a
 * malformed one is refused.
 */

import type { PolicyRule } from '@c15t/schema';
import { Effect } from 'effect';
import { SqlClient } from 'effect/sql';
import { afterEach, assert, beforeEach, describe, it } from 'vitest';

import { ENGINES } from '../__tests__/engines';
import { createHttpHarness } from '../__tests__/http-harness';
import type { HttpHarness } from '../__tests__/http-harness';

const T0 = 1_700_000_000_000;
const TC_STRING = 'CQPj0AAQPj0AAAKA1AENBYFgAAAAAAAAAAAAAAAAAAAA';
const AC_STRING = '2~89.486~dv.2572';

const RULES: PolicyRule[] = [
	{
		id: 'world_opt_in',
		match: { isDefault: true },
		model: 'opt-in',
		prompt: 'choice',
	},
];

const base = {
	domain: 'example.com',
	givenAt: T0,
	preferences: { marketing: true, measurement: true, necessary: true },
	subjectId: 'sub_adtnconsent1',
	type: 'cookie_banner',
};

for (const engine of ENGINES) {
	describe(`additional consent over HTTP (${engine.name})`, () => {
		let harness: HttpHarness;

		const storedRow = () =>
			harness.runtime.runPromise(
				Effect.gen(function* stored() {
					const sql = yield* SqlClient.SqlClient;
					const rows = yield* sql<{
						addtlConsent: string | null;
						tcString: string | null;
					}>`
						select ${sql('addtlConsent')}, ${sql('tcString')}
						from ${sql('consent')}
						where ${sql('subjectId')} = ${base.subjectId}
					`;
					assert.lengthOf(rows, 1);
					return rows[0];
				})
			);

		beforeEach(async () => {
			harness = await createHttpHarness(engine, {
				manifest: { appName: 'Additional consent', policyRules: RULES },
				tenantId: 'tenant_ac',
			});
		});

		afterEach(async () => {
			await harness.dispose();
		});

		it('stores the AC string beside its TC string', async () => {
			const saved = await harness.json('POST', '/subjects', {
				...base,
				addtlConsent: AC_STRING,
				tcString: TC_STRING,
			});
			assert.strictEqual(saved.status, 200, JSON.stringify(saved.body));
			assert.deepStrictEqual(await storedRow(), {
				addtlConsent: AC_STRING,
				tcString: TC_STRING,
			});
		});

		it('drops an AC string sent without a TC string', async () => {
			const saved = await harness.json('POST', '/subjects', {
				...base,
				addtlConsent: AC_STRING,
			});
			assert.strictEqual(saved.status, 200, JSON.stringify(saved.body));
			assert.deepStrictEqual(await storedRow(), {
				addtlConsent: null,
				tcString: null,
			});
		});

		it('stores null when the save carries no AC string', async () => {
			const saved = await harness.json('POST', '/subjects', {
				...base,
				tcString: TC_STRING,
			});
			assert.strictEqual(saved.status, 200, JSON.stringify(saved.body));
			assert.deepStrictEqual(await storedRow(), {
				addtlConsent: null,
				tcString: TC_STRING,
			});
		});

		it('refuses a malformed AC string', async () => {
			const refused = await harness.json('POST', '/subjects', {
				...base,
				addtlConsent: '1~89.486',
				tcString: TC_STRING,
			});
			assert.strictEqual(refused.status, 400, JSON.stringify(refused.body));
			assert.strictEqual(await harness.count('consent'), 0);
		});
	});
}
