/**
 * A real Postgres, in-process, for tests.
 *
 * PGlite is Postgres compiled to WASM, so `REFERENCES` clauses are genuinely
 * enforced. That matters more than it sounds: the mocked handler tests assert
 * on the arguments handed to a fake `db.create` and cannot see a constraint
 * violation, so an FK bug reaches production looking fully green.
 *
 * Same harness shape as `post.handler.integration.test.ts`, lifted into a
 * fixture so more than one suite can use it.
 */
import { Kysely } from 'kysely';
import { KyselyPGlite } from 'kysely-pglite';
import { kyselyAdapter } from '~/db/adapters/kysely';
import { DB } from '~/db/schema';

export interface PgliteDatabase {
	/** Adapter to hand to `c15tInstance({ adapter })`. */
	adapter: ReturnType<typeof kyselyAdapter>;
	/** Raw Kysely handle, for asserting on rows the handler wrote. */
	db: Kysely<Record<string, never>>;
	destroy(): Promise<void>;
}

/**
 * Boots PGlite and applies the latest c15t schema, constraints included.
 */
export async function createPgliteDatabase(): Promise<PgliteDatabase> {
	const pglite = await KyselyPGlite.create();
	const db = new Kysely<Record<string, never>>({ dialect: pglite.dialect });
	const adapter = kyselyAdapter({ db, provider: 'postgresql' });

	const migration = await DB.client(adapter)
		.createMigrator()
		.migrateToLatest({ mode: 'from-database' });
	await migration.execute();

	return {
		adapter,
		db,
		async destroy() {
			await db.destroy();
		},
	};
}
