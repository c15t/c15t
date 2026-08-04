/**
 * The migrator, end to end, as a deploy script uses it.
 *
 * `db/migrate.test.ts` covers the Effect underneath against every engine.
 * This covers the thing people actually call — and it had **no tests at all**,
 * which is a poor state for the API that runs DDL against production.
 *
 * Two differences from the layer below, and both are the point:
 *
 * - it takes a **connection description**, not a `Layer`, so this is the only
 *   test that exercises `db/connect.ts`'s driver loading — the code that
 *   decides which of three optional peer dependencies to import;
 * - it **owns a pool**, so `dispose` is part of the contract rather than a
 *   detail. A deploy script that leaks one does not exit, and CI hangs.
 *
 * SQLite runs everywhere. Postgres and MySQL join when their URLs are set;
 * see `__tests__/engines`.
 */

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assert, describe, expect, it } from '@effect/vitest';
import { Effect, type Layer, ManagedRuntime } from 'effect';
import { SqlClient } from 'effect/unstable/sql';
import { resetDatabase } from './__tests__/engines';
import type { DatabaseConfig } from './db/connect';
import { loadDriver, MissingDatabaseError, toLayer } from './db/connect';
import * as Dialect from './db/dialect';
import { createMigrator } from './migrator';

const PG_URL = process.env.C15T_TEST_PG_URL;
const MYSQL_URL = process.env.C15T_TEST_MYSQL_URL;

/** A fresh SQLite file per case; the file *is* the isolation on SQLite. */
const sqliteConfig = (): DatabaseConfig => ({
	dialect: 'sqlite',
	filename: join(mkdtempSync(join(tmpdir(), 'c15t-migrator-')), 'c15t.db'),
});

const CONFIGS: ReadonlyArray<readonly [string, () => DatabaseConfig]> = [
	['sqlite', sqliteConfig],
	...(PG_URL
		? ([
				[
					'postgres',
					// Its own schema per run, so this suite cannot collide with the
					// rest of the suite sharing the server.
					() =>
						({
							dialect: 'postgres',
							url: PG_URL,
							schema: 'c15t_migrator_e2e',
						}) as DatabaseConfig,
				],
			] as const)
		: []),
	...(MYSQL_URL
		? ([
				[
					'mysql',
					() => ({ dialect: 'mysql', url: MYSQL_URL }) as DatabaseConfig,
				],
			] as const)
		: []),
];

/**
 * Drops everything, so a case starts from an empty database.
 *
 * SQLite gets a fresh file per case and needs nothing. Postgres and MySQL are
 * shared servers where every case in this file would otherwise inherit the
 * last one's schema — which silently turned "a fresh database has work to do"
 * into "it does not".
 */
const reset = async (config: DatabaseConfig): Promise<void> => {
	if (config.dialect === 'sqlite') {
		return;
	}
	const runtime = ManagedRuntime.make(
		toLayer(config) as Layer.Layer<SqlClient.SqlClient, never>
	);
	try {
		await runtime.runPromise(resetDatabase);
	} finally {
		await runtime.dispose();
	}
};

/** Runs `use` with a migrator and always releases the pool. */
const withMigrator = async <A>(
	config: DatabaseConfig,
	use: (migrator: ReturnType<typeof createMigrator>) => Promise<A>
): Promise<A> => {
	const migrator = createMigrator(config);
	try {
		return await use(migrator);
	} finally {
		await migrator.dispose();
	}
};

describe('createMigrator: configuration', () => {
	it('refuses a missing database by name', () => {
		// The first thing anyone upgrading from 2.x hits, because `adapter` is
		// gone and its replacement is required. A bare TypeError mentioning the
		// `in` operator would tell them nothing.
		assert.throws(
			() => toLayer(undefined as unknown as DatabaseConfig),
			MissingDatabaseError
		);
		assert.throws(
			() => toLayer(undefined as unknown as DatabaseConfig),
			/replaced 2\.x/
		);
	});

	it('builds a layer for each dialect without connecting', () => {
		// Construction is lazy: nothing dials a database until the layer is
		// built, which is what lets a config file be imported safely.
		assert.isDefined(toLayer({ dialect: 'postgres', url: 'postgres://h/db' }));
		assert.isDefined(toLayer({ dialect: 'mysql', url: 'mysql://h/db' }));
		assert.isDefined(toLayer({ dialect: 'sqlite', filename: ':memory:' }));
	});
});

for (const [name, makeConfig] of CONFIGS) {
	describe(`createMigrator: ${name}`, () => {
		it('takes a fresh database to the current schema', async () => {
			const config = makeConfig();
			await reset(config);
			await withMigrator(config, async (migrator) => {
				const planned = await migrator.plan();
				assert.isUndefined(planned.blocked);
				assert.isFalse(planned.applied, 'plan must not write');
				assert.isAbove(planned.adoption.length, 0);
				assert.deepStrictEqual(planned.pending, ['2-hot-path-indexes']);

				const applied = await migrator.apply();
				assert.isTrue(applied.applied);

				// The database is up to date, so a fresh plan has nothing left.
				const after = await migrator.plan();
				assert.strictEqual(after.shape._tag, 'Baseline');
				assert.deepStrictEqual(after.adoption, []);
				assert.deepStrictEqual(after.pending, []);
			});
		}, 120_000);

		it('is idempotent across separate migrator instances', async () => {
			// A deploy runs this per release, in a new process each time.
			const config = makeConfig();
			await reset(config);
			await withMigrator(config, (migrator) => migrator.apply());
			const second = await withMigrator(config, (migrator) => migrator.apply());

			assert.deepStrictEqual(second.adoption, []);
			assert.deepStrictEqual(second.pending, []);
		}, 120_000);

		it('plan writes nothing', async () => {
			const config = makeConfig();
			await reset(config);
			await withMigrator(config, async (migrator) => {
				await migrator.plan();
				await migrator.plan();
			});

			// A second migrator sees an untouched database: if `plan` had
			// applied anything, this would report nothing left to do.
			await withMigrator(config, async (migrator) => {
				const planned = await migrator.plan();
				assert.isAbove(
					planned.adoption.length,
					0,
					'plan appears to have written'
				);
			});
		}, 120_000);

		it('releases the pool', async () => {
			const config = makeConfig();
			await reset(config);
			const migrator = createMigrator(config);
			await migrator.apply();
			await migrator.dispose();

			// `dispose` resolving is most of the claim — a pool that cannot be
			// released hangs the process that opened it, which for a CLI or a
			// deploy step means a job that never finishes, and this test would
			// then time out rather than pass.
			//
			// What it can still assert is that the pool is actually gone: using
			// the migrator afterwards must not quietly work off a live
			// connection.
			await expect(migrator.plan()).rejects.toThrow();
		}, 120_000);

		it('reports a refusal rather than throwing', async () => {
			const config = makeConfig();
			await reset(config);

			// An unrecognisable database: c15t-shaped, no ledger, and a fumadb
			// marker naming a schema version nothing has a fixture for.
			const runtime = ManagedRuntime.make(
				toLayer(config) as Layer.Layer<SqlClient.SqlClient, never>
			);
			try {
				await runtime.runPromise(
					Effect.gen(function* () {
						const sql = yield* SqlClient.SqlClient;
						const q = Dialect.escaperFor(yield* Dialect.current);
						yield* sql.unsafe(
							`create table ${q('subject')} (${q('id')} varchar(255) primary key)`
						);
						yield* sql.unsafe(
							`create table ${q('consent')} (${q('id')} varchar(255) primary key)`
						);
						yield* sql.unsafe(
							`create table ${q('private_c15t_settings')} (${q('key')} varchar(255) primary key, ${q('value')} text)`
						);
						yield* sql`
							insert into ${sql('private_c15t_settings')} ${sql.insert({
								key: 'version',
								value: '9.9.9',
							})}
						`;
					})
				);
			} finally {
				await runtime.dispose();
			}

			await withMigrator(config, async (migrator) => {
				const planned = await migrator.plan();

				// Reported, not thrown: refusing is a normal outcome the caller
				// decides about, and the CLI prints it. Throwing would make a
				// deploy script treat "I do not recognise this database" the same
				// as "the network is down".
				assert.isDefined(planned.blocked);
				assert.include(planned.blocked ?? '', '9.9.9');
				assert.isFalse(planned.applied);

				// And applying it changes nothing rather than guessing.
				const applied = await migrator.apply();
				assert.isDefined(applied.blocked);
				assert.isFalse(applied.applied);
			});
		}, 120_000);
	});
}

describe('createMigrator: driver resolution', () => {
	it('names the package to install when a driver is missing', async () => {
		// The error a self-hoster meets first if they configure an engine whose
		// optional peer they did not install. All three are present in this
		// repo, so the only way to exercise it is to hand the loader an importer
		// that fails — which is exactly what a missing module does.
		const missing = loadDriver('mysql', () =>
			Promise.reject(new Error('Cannot find module'))
		);

		// A defect rather than a typed failure: a missing driver is a
		// configuration mistake the operator must fix, not something the backend
		// can recover from, so every caller is spared threading it through.
		await expect(Effect.runPromise(missing)).rejects.toThrow(
			/@effect\/sql-mysql2 is not installed/
		);
	});

	it('names the right package per dialect', async () => {
		for (const [dialect, pkg] of [
			['postgres', '@effect/sql-pg'],
			['mysql', '@effect/sql-mysql2'],
			['sqlite', '@effect/sql-sqlite-node'],
		] as const) {
			await expect(
				Effect.runPromise(
					loadDriver(dialect, () => Promise.reject(new Error('nope')))
				)
			).rejects.toThrow(pkg);
		}
	});

	it('passes a working import straight through', async () => {
		const loaded = await Effect.runPromise(
			loadDriver('sqlite', () => Promise.resolve({ marker: true }))
		);
		assert.deepStrictEqual(loaded, { marker: true });
	});
});
