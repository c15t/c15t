/**
 * Upgrading a @c15t/backend 3.0 database to 3.1, on every engine.
 *
 * Starts from a database exactly as the 3.0 migrator left it, with an IAB
 * consent already recorded, then runs the current migrator. It must apply
 * only the migrations after 8, keep the 3.0 consent as it was, and leave a
 * database the app can store Additional Consent strings and configured
 * scripts in.
 */

import type { PolicyRule } from '@c15t/schema';
import { Effect, ManagedRuntime } from 'effect';
import { SqlClient } from 'effect/sql';
import { afterEach, assert, describe, it } from 'vitest';

import { ENGINES, resetDatabase } from '../__tests__/engines';
import { createApp } from '../http/app';
import { apply, LEDGER_TABLE, plan } from './adopt';
import { MIGRATIONS, migrate } from './migrate';
import { encodeRow, encoder } from './values';

const T0 = 1_700_000_000_000;
/** When the 3.0 backend recorded its consent. */
const BEFORE = new Date(T0 - 86_400_000);
const TC_STRING = 'CQPj0AAQPj0AAAKA1AENBYFgAAAAAAAAAAAAAAAAAAAA';
const AC_STRING = '2~89.486~dv.2572';
/** The last migration @c15t/backend 3.0.0 shipped. */
const LAST_3_0_MIGRATION = 8;

const RULES: PolicyRule[] = [
	{
		id: 'world_opt_in',
		match: { isDefault: true },
		model: 'opt-in',
		prompt: 'choice',
	},
];

/**
 * A database as @c15t/backend 3.0.0 left it, with one IAB consent recorded.
 *
 * What `migrate()` in 3.0.0 does on an empty database: adopt to the baseline,
 * then apply and stamp migrations 2 to 8. Those migrations and the adoption
 * code are unchanged since 3.0.0, so this is the same schema and ledger.
 */
const databaseFrom30 = Effect.gen(function* databaseFrom30() {
	yield* resetDatabase;
	const sql = yield* SqlClient.SqlClient;
	const encode = yield* encoder;

	yield* apply(yield* plan);
	for (const migration of MIGRATIONS) {
		if (migration.id === 1 || migration.id > LAST_3_0_MIGRATION) {
			continue;
		}
		yield* migration.up;
		yield* sql`insert into ${sql(LEDGER_TABLE)} ${sql.insert(
			encodeRow(encode, {
				appliedAt: BEFORE,
				id: migration.id,
				name: migration.name,
			})
		)}`;
	}

	// An IAB consent a 3.0 backend recorded: a TC string, no AC column.
	yield* sql`insert into ${sql('subject')} ${sql.insert(
		encodeRow(encode, { createdAt: BEFORE, id: 'sub_v3', updatedAt: BEFORE })
	)}`;
	yield* sql`insert into ${sql('domain')} ${sql.insert(
		encodeRow(encode, {
			createdAt: BEFORE,
			id: 'dom_v3',
			name: 'example.com',
			updatedAt: BEFORE,
		})
	)}`;
	yield* sql`insert into ${sql('consent')} ${sql.insert(
		encodeRow(encode, {
			domainId: 'dom_v3',
			givenAt: BEFORE,
			id: 'cns_v3',
			purposeIds: '[]',
			subjectId: 'sub_v3',
			tcString: 'CQ_SAVED_BY_3_0',
		})
	)}`;
});

const ledgerIds = Effect.gen(function* ledgerIds() {
	const sql = yield* SqlClient.SqlClient;
	const rows = yield* sql<{ id: number | string }>`
		select * from ${sql(LEDGER_TABLE)}
	`;
	return rows.map((row) => Number(row.id)).sort((a, b) => a - b);
});

const storedStrings = (subjectId: string) =>
	Effect.gen(function* read() {
		const sql = yield* SqlClient.SqlClient;
		return yield* sql<{
			addtlConsent: string | null;
			tcString: string | null;
		}>`
			select ${sql('addtlConsent')}, ${sql('tcString')}
			from ${sql('consent')}
			where ${sql('subjectId')} = ${subjectId}
		`;
	});

for (const engine of ENGINES) {
	describe(`upgrading a 3.0 database to 3.1 (${engine.name})`, () => {
		let runtime:
			| ManagedRuntime.ManagedRuntime<SqlClient.SqlClient, never>
			| undefined;

		afterEach(async () => {
			await runtime?.dispose();
			runtime = undefined;
		});

		it('applies only migrations 9 and 10 and keeps 3.0 consents', async () => {
			runtime = ManagedRuntime.make(engine.client);
			const report = await runtime.runPromise(
				Effect.gen(function* upgrade() {
					yield* databaseFrom30;
					return yield* migrate();
				})
			);

			assert.isTrue(report.applied);
			assert.isUndefined(report.blocked);
			assert.strictEqual(report['shape']._tag, 'Baseline');
			assert.deepStrictEqual(report.adoption, []);
			assert.deepStrictEqual(report.pending, [
				'9-additional-consent',
				'10-consent-scripts',
			]);
			assert.deepStrictEqual(report.drift, []);
			assert.deepStrictEqual(
				await runtime.runPromise(ledgerIds),
				MIGRATIONS.map((migration) => migration.id)
			);

			// The 3.0 consent is untouched and has no AC string.
			assert.deepStrictEqual(
				await runtime.runPromise(storedStrings('sub_v3')),
				[{ addtlConsent: null, tcString: 'CQ_SAVED_BY_3_0' }]
			);

			// A second run finds nothing left to do.
			const again = await runtime.runPromise(migrate());
			assert.deepStrictEqual(again.pending, []);
		}, 120_000);

		it('stores AC strings once migrated, and still reads 3.0 subjects', async () => {
			runtime = ManagedRuntime.make(engine.client);
			await runtime.runPromise(
				Effect.gen(function* upgrade() {
					yield* databaseFrom30;
					yield* migrate();
				})
			);
			const app = createApp(runtime, {
				manifest: { appName: 'Upgraded', policyRules: RULES },
			});

			const saved = await app.request('/subjects', {
				body: JSON.stringify({
					addtlConsent: AC_STRING,
					domain: 'example.com',
					givenAt: T0,
					preferences: { marketing: true, necessary: true },
					subjectId: 'sub_upgraded1',
					tcString: TC_STRING,
					type: 'cookie_banner',
				}),
				headers: { 'Content-Type': 'application/json' },
				method: 'POST',
			});
			assert.strictEqual(saved.status, 200, await saved.text());
			assert.deepStrictEqual(
				await runtime.runPromise(storedStrings('sub_upgraded1')),
				[{ addtlConsent: AC_STRING, tcString: TC_STRING }]
			);

			const read = await app.request('/subjects/sub_v3');
			assert.strictEqual(read.status, 200, await read.text());
		}, 120_000);
	});
}
