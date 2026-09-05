/**
 * v3 category receipts through the HTTP surface, on every engine.
 *
 * The contract under test: a save carries the receipts it confirmed, each
 * with the subject's own confirmation time and policy basis; the backend
 * stores them as sent, never renews what a save did not mention, and reads
 * back the latest receipt per category with those original facts intact.
 * Legacy rows written before receipts existed still read as the choice they
 * recorded.
 */

import type { PolicyRule } from '@c15t/schema';
import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';
import { afterEach, assert, beforeEach, describe, it } from 'vitest';

import { ENGINES } from '../__tests__/engines';
import { createHttpHarness } from '../__tests__/http-harness';
import type { HttpHarness } from '../__tests__/http-harness';

const SIGNING_KEY = 'test-signing-key-at-least-32-chars-long';

/** A moment that has already happened. Receipts later than now are refused. */
const T0 = 1_700_000_000_000;
const T1 = T0 + 60_000;
const CHOICE_FP = 'choice-v1:test';

const RULES: PolicyRule[] = [
	{
		categories: ['marketing', 'measurement'],
		id: 'eu_opt_in',
		match: { countries: ['DE'] },
		model: 'opt-in',
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

const receipt = (value: boolean, confirmedAt = T0) => ({
	basis: { fingerprint: CHOICE_FP, kind: 'choice-v1' as const },
	confirmedAt,
	value,
});

const base = {
	domain: 'example.com',
	subjectId: 'sub_receipts1',
	type: 'cookie_banner',
};

for (const engine of ENGINES) {
	describe(`consent receipts over HTTP (${engine.name})`, () => {
		let harness: HttpHarness;

		beforeEach(async () => {
			harness = await createHttpHarness(engine, {
				manifest: { appName: 'Receipts', policyRules: RULES },
				tenantId: 'tenant_r',
			});
		});

		afterEach(async () => {
			await harness.dispose();
		});

		it('stores the receipts a save confirmed and reads them back with their original facts', async () => {
			const saved = await harness.json('POST', '/subjects', {
				...base,
				choice: {
					categories: {
						marketing: receipt(false),
						measurement: receipt(true),
					},
					version: 3,
				},
				givenAt: T0,
				preferences: { marketing: false, measurement: true, necessary: true },
			});
			assert.strictEqual(saved.status, 200, JSON.stringify(saved.body));
			assert.strictEqual(saved.body.ok, true);

			const read = await harness.json('GET', `/subjects/${base.subjectId}`);
			assert.strictEqual(read.status, 200);
			const consents = read.body.consents as {
				choice?: unknown;
				preferences?: unknown;
				type: string;
			}[];
			assert.strictEqual(consents.length, 1);
			assert.strictEqual(consents[0]?.type, 'cookie_banner');
			// 2.x parity: granted codes only.
			assert.deepStrictEqual(consents[0]?.preferences, {
				measurement: true,
				necessary: true,
			});
			// The receipts, exactly as sent.
			assert.deepStrictEqual(consents[0]?.choice, {
				categories: {
					marketing: receipt(false),
					measurement: receipt(true),
				},
				version: 3,
			});
			assert.deepStrictEqual(read.body.subjectChoice, {
				categories: {
					marketing: receipt(false),
					measurement: receipt(true),
				},
				version: 3,
			});
		});

		it('keeps the original receipt for a category a later partial save did not mention', async () => {
			await harness.json('POST', '/subjects', {
				...base,
				choice: {
					categories: {
						marketing: receipt(true, T0),
						measurement: receipt(true, T0),
					},
					version: 3,
				},
				givenAt: T0,
				preferences: { marketing: true, measurement: true, necessary: true },
			});
			// Only marketing was confirmed by the second act.
			const second = await harness.json('POST', '/subjects', {
				...base,
				choice: {
					categories: { marketing: receipt(false, T1) },
					version: 3,
				},
				givenAt: T1,
				preferences: { marketing: false, measurement: true, necessary: true },
			});
			assert.strictEqual(second.status, 200, JSON.stringify(second.body));

			const read = await harness.json('GET', `/subjects/${base.subjectId}`);
			// measurement keeps its T0 receipt: the second save did not renew it.
			assert.deepStrictEqual(read.body.subjectChoice, {
				categories: {
					marketing: receipt(false, T1),
					measurement: receipt(true, T0),
				},
				version: 3,
			});
			assert.strictEqual(await harness.count('consent'), 2);
		});

		it('records a replay of the same payload once', async () => {
			const payload = {
				...base,
				choice: { categories: { marketing: receipt(true) }, version: 3 },
				givenAt: T0,
				preferences: { marketing: true, necessary: true },
			};
			const first = await harness.json('POST', '/subjects', payload);
			const second = await harness.json('POST', '/subjects', payload);

			assert.strictEqual(first.status, 200);
			assert.strictEqual(second.status, 200);
			assert.strictEqual(second.body.consentId, first.body.consentId);
			assert.strictEqual(await harness.count('consent'), 1);
			// One act, one audit entry.
			assert.strictEqual(
				await harness.count('auditLog', {
					column: 'actionType',
					value: 'consent_given',
				}),
				1
			);
		});

		it('refuses a replay that claims different receipts for the same act', async () => {
			await harness.json('POST', '/subjects', {
				...base,
				choice: { categories: { marketing: receipt(true) }, version: 3 },
				givenAt: T0,
				preferences: { marketing: true, necessary: true },
			});
			const changed = await harness.json('POST', '/subjects', {
				...base,
				choice: { categories: { marketing: receipt(false) }, version: 3 },
				givenAt: T0,
				preferences: { marketing: false, necessary: true },
			});
			assert.strictEqual(changed.status, 400);
			assert.strictEqual(
				(changed.body.cause as { code: string }).code,
				'CONFLICT'
			);
		});

		it('rejects a receipt later than the server clock rather than clamping it', async () => {
			const future = await harness.json('POST', '/subjects', {
				...base,
				choice: {
					categories: { marketing: receipt(true, Date.now() + 60_000) },
					version: 3,
				},
				givenAt: T0,
				preferences: { marketing: true, necessary: true },
			});
			assert.strictEqual(future.status, 400);
			assert.strictEqual(await harness.count('consent'), 0);
		});

		it('tells an unsupported receipt version apart from a malformed one, and both from none', async () => {
			const unsupported = await harness.json('POST', '/subjects', {
				...base,
				choice: { categories: { marketing: receipt(true) }, version: 99 },
				givenAt: T0,
				preferences: { marketing: true, necessary: true },
			});
			assert.strictEqual(unsupported.status, 400);
			assert.match(String(unsupported.body.message), /choice\.version/u);

			const malformed = await harness.json('POST', '/subjects', {
				...base,
				choice: 'not a receipt',
				givenAt: T0,
				preferences: { marketing: true, necessary: true },
			});
			assert.strictEqual(malformed.status, 400);
			assert.match(String(malformed.body.message), /choice/u);

			// Nothing was written by either rejection.
			assert.strictEqual(await harness.count('consent'), 0);

			// A save without receipts is the legacy path and still records.
			const legacy = await harness.json('POST', '/subjects', {
				...base,
				givenAt: T0,
				preferences: { marketing: true, necessary: true },
			});
			assert.strictEqual(legacy.status, 200, JSON.stringify(legacy.body));
		});

		it('refuses receipts that disagree with the preference map', async () => {
			const mismatch = await harness.json('POST', '/subjects', {
				...base,
				choice: { categories: { marketing: receipt(true) }, version: 3 },
				givenAt: T0,
				preferences: { marketing: false, necessary: true },
			});
			assert.strictEqual(mismatch.status, 400);
			assert.strictEqual(
				(mismatch.body.cause as { code: string }).code,
				'CHOICE_PREFERENCE_MISMATCH'
			);
		});

		it('keeps the refusals a save without receipts submitted', async () => {
			// A 2.x client sends its explicit map and no receipts. The values it
			// submitted, refusals included, become legacy receipts at its givenAt;
			// nothing is added for categories it did not mention.
			const legacy = await harness.json('POST', '/subjects', {
				...base,
				givenAt: T0,
				preferences: { marketing: true, measurement: false, necessary: true },
			});
			assert.strictEqual(legacy.status, 200, JSON.stringify(legacy.body));

			const read = await harness.json('GET', `/subjects/${base.subjectId}`);
			assert.deepStrictEqual(read.body.subjectChoice, {
				categories: {
					marketing: {
						basis: { kind: 'legacy-v2' },
						confirmedAt: T0,
						value: true,
					},
					measurement: {
						basis: { kind: 'legacy-v2' },
						confirmedAt: T0,
						value: false,
					},
				},
				version: 3,
			});

			// An all-false map is an explicit refusal, not an empty record.
			const denied = await harness.json('POST', '/subjects', {
				...base,
				givenAt: T1,
				preferences: { marketing: false, measurement: false },
			});
			assert.strictEqual(denied.status, 200, JSON.stringify(denied.body));
			const after = await harness.json('GET', `/subjects/${base.subjectId}`);
			assert.deepStrictEqual(
				(after.body.subjectChoice as { categories: Record<string, unknown> })
					.categories.marketing,
				{ basis: { kind: 'legacy-v2' }, confirmedAt: T1, value: false }
			);
		});

		it('reads a historical 2.x row as the grants it holds and invents no refusal', async () => {
			// A row the 2.x backend wrote: granted purpose codes only, no receipt
			// column. The refusal the client may have submitted was never stored.
			await harness.json('POST', '/subjects', {
				...base,
				givenAt: T0,
				preferences: { marketing: true, measurement: false, necessary: true },
			});
			await harness.runtime.runPromise(
				Effect.gen(function* strip() {
					const sql = yield* SqlClient.SqlClient;
					yield* sql`update ${sql('consent')} set ${sql('choice')} = null`;
				})
			);

			const read = await harness.json('GET', `/subjects/${base.subjectId}`);
			const consents = read.body.consents as {
				choice?: unknown;
				preferences?: unknown;
			}[];
			assert.isUndefined(consents[0]?.choice);
			assert.deepStrictEqual(consents[0]?.preferences, {
				marketing: true,
				necessary: true,
			});
			assert.deepStrictEqual(read.body.subjectChoice, {
				categories: {
					marketing: {
						basis: { kind: 'legacy-v2' },
						confirmedAt: T0,
						value: true,
					},
				},
				version: 3,
			});
		});

		it('skips a row whose stored receipts cannot be read rather than salvaging its grants', async () => {
			await harness.json('POST', '/subjects', {
				...base,
				choice: { categories: { marketing: receipt(true) }, version: 3 },
				givenAt: T0,
				preferences: { marketing: true, necessary: true },
			});
			await harness.runtime.runPromise(
				Effect.gen(function* poison() {
					const sql = yield* SqlClient.SqlClient;
					yield* sql`update ${sql('consent')} set ${sql('choice')} = ${'{"version":99,"categories":{"marketing":{"value":true,"confirmedAt":1,"basis":{"kind":"legacy-v2"}}}}'}`;
				})
			);

			const read = await harness.json('GET', `/subjects/${base.subjectId}`);
			assert.isUndefined(read.body.subjectChoice);
			const consents = read.body.consents as { choice?: unknown }[];
			assert.isUndefined(consents[0]?.choice);
		});

		it('lets a v3 receipt supersede a legacy receipt for its own category only', async () => {
			await harness.json('POST', '/subjects', {
				...base,
				givenAt: T0,
				preferences: { marketing: true, measurement: true, necessary: true },
			});
			await harness.json('POST', '/subjects', {
				...base,
				choice: { categories: { marketing: receipt(false, T1) }, version: 3 },
				givenAt: T1,
				preferences: { marketing: false, measurement: true, necessary: true },
			});

			const read = await harness.json('GET', `/subjects/${base.subjectId}`);
			const merged = read.body.subjectChoice as {
				categories: Record<string, { value: boolean; confirmedAt: number }>;
			};
			assert.deepStrictEqual(merged.categories.marketing, receipt(false, T1));
			assert.deepStrictEqual(merged.categories.measurement, {
				basis: { kind: 'legacy-v2' },
				confirmedAt: T0,
				value: true,
			});
		});

		it('is invisible to another tenant', async () => {
			await harness.json('POST', '/subjects', {
				...base,
				choice: { categories: { marketing: receipt(true) }, version: 3 },
				givenAt: T0,
				preferences: { marketing: true, necessary: true },
			});
			const other = harness.appWith({ tenantId: 'tenant_other' });
			const read = await harness.json(
				'GET',
				`/subjects/${base.subjectId}`,
				undefined,
				{},
				other
			);
			assert.strictEqual(read.status, 404);
		});
	});

	describe(`policy decision on save (${engine.name})`, () => {
		let harness: HttpHarness;

		beforeEach(async () => {
			harness = await createHttpHarness(engine, {
				manifest: { appName: 'Receipts', policyRules: RULES },
				policySnapshot: { signingKey: SIGNING_KEY },
				tenantId: 'tenant_r',
			});
		});

		afterEach(async () => {
			await harness.dispose();
		});

		const initFor = (country: string) =>
			harness.json('GET', '/init', undefined, { 'x-c15t-country': country });

		it('records the decision a verified snapshot token attests to', async () => {
			const init = await initFor('DE');
			const token = init.body.policySnapshotToken as string;
			assert.isString(token);

			const saved = await harness.json('POST', '/subjects', {
				...base,
				choice: { categories: { marketing: receipt(true) }, version: 3 },
				givenAt: T0,
				policySnapshotToken: token,
				preferences: { marketing: true, measurement: false, necessary: true },
			});
			assert.strictEqual(saved.status, 200, JSON.stringify(saved.body));
			assert.strictEqual(await harness.count('runtimePolicyDecision'), 1);
			assert.strictEqual(
				await harness.count('consent', {
					column: 'runtimePolicySource',
					value: 'snapshot_token',
				}),
				1
			);
		});

		it('refuses a token when the same policy ID now has different canonical behavior', async () => {
			const init = await initFor('DE');
			const app = harness.appWith({
				manifest: {
					policyRules: RULES.map((rule) => ({
						...rule,
						validity: { choiceDays: 30 },
					})),
				},
			});
			const saved = await harness.json(
				'POST',
				'/subjects',
				{
					...base,
					choice: { categories: { marketing: receipt(true) }, version: 3 },
					givenAt: T0,
					policySnapshotToken: init.body.policySnapshotToken,
					preferences: { marketing: true, necessary: true },
				},
				{},
				app
			);
			assert.strictEqual(saved.status, 409);
			assert.strictEqual(await harness.count('consent'), 0);
		});

		it('refuses a receipt that grants a category outside the resolved scope', async () => {
			const init = await initFor('DE');
			const token = init.body.policySnapshotToken as string;
			// The EU rule scopes marketing and measurement only. The preference
			// map stays inside scope so the receipt check is what refuses.
			const saved = await harness.json('POST', '/subjects', {
				...base,
				choice: { categories: { functionality: receipt(true) }, version: 3 },
				givenAt: T0,
				policySnapshotToken: token,
				preferences: { necessary: true },
			});
			assert.strictEqual(saved.status, 400);
			assert.strictEqual(
				(saved.body.cause as { code: string }).code,
				'CHOICE_OUT_OF_SCOPE'
			);

			// A denial outside scope is a persistent refusal and stays possible.
			const denial = await harness.json('POST', '/subjects', {
				...base,
				choice: { categories: { functionality: receipt(false) }, version: 3 },
				givenAt: T0,
				policySnapshotToken: token,
				preferences: { necessary: true },
			});
			assert.strictEqual(denial.status, 200, JSON.stringify(denial.body));
		});

		it('rejects a tampered token and a missing one when a decision exists to attest', async () => {
			const init = await initFor('DE');
			const token = init.body.policySnapshotToken as string;
			const tampered = await harness.json('POST', '/subjects', {
				...base,
				givenAt: T0,
				policySnapshotToken: `${token}x`,
				preferences: { marketing: true, necessary: true },
			});
			assert.strictEqual(tampered.status, 409);
			assert.strictEqual(
				(tampered.body.cause as { code: string }).code,
				'POLICY_SNAPSHOT_INVALID'
			);

			const missing = await harness.json('POST', '/subjects', {
				...base,
				givenAt: T0,
				preferences: { marketing: true, necessary: true },
			});
			assert.strictEqual(missing.status, 409);
			assert.strictEqual(
				(missing.body.cause as { code: string }).code,
				'POLICY_SNAPSHOT_REQUIRED'
			);
			assert.strictEqual(await harness.count('consent'), 0);
		});

		it('recomputes asserted manifest-mode inputs and refuses a stale decision', async () => {
			const init = await initFor('DE');
			const decision = init.body.policyResolution as {
				policyId: string;
				fingerprints: { policy: string };
			};

			const fresh = await harness.json('POST', '/subjects', {
				...base,
				country: 'DE',
				fingerprint: decision.fingerprints.policy,
				givenAt: T0,
				language: 'en',
				policyId: decision.policyId,
				preferences: { marketing: true, necessary: true },
				region: null,
			});
			assert.strictEqual(fresh.status, 200, JSON.stringify(fresh.body));
			assert.strictEqual(
				await harness.count('consent', {
					column: 'runtimePolicySource',
					value: 'write_time_fallback',
				}),
				1
			);

			const stale = await harness.json('POST', '/subjects', {
				...base,
				country: 'DE',
				fingerprint: 'not-the-fingerprint-init-issued',
				givenAt: T1,
				language: 'en',
				policyId: decision.policyId,
				preferences: { marketing: true, necessary: true },
				region: null,
			});
			assert.strictEqual(stale.status, 422);
			assert.strictEqual(
				(stale.body.cause as { code: string }).code,
				'STALE_POLICY'
			);

			const partial = await harness.json('POST', '/subjects', {
				...base,
				country: 'DE',
				givenAt: T1,
				language: 'en',
				preferences: { marketing: true, necessary: true },
			});
			assert.strictEqual(partial.status, 422);
		});
	});
}
