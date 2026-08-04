/**
 * Migrating from outside Effect.
 *
 * `db/migrate.ts` is an `Effect`, which is right for anything already inside
 * one. The two callers that matter most are not: the CLI, and a self-hoster's
 * deploy script. Making them construct a `ManagedRuntime` and learn what a
 * `Layer` is to run one migration would be the same mistake as requiring it to
 * point the backend at a database — see `db/connect.ts`.
 *
 * So this is the promise-shaped face of the same function. It owns a runtime,
 * which owns a connection pool, which is why `dispose` exists and why a
 * process that forgets to call it will not exit.
 *
 * @example
 * ```ts
 * const migrator = createMigrator({ dialect: 'postgres', url });
 * try {
 * 	const planned = await migrator.plan();
 * 	if (!planned.blocked) await migrator.apply();
 * } finally {
 * 	await migrator.dispose();
 * }
 * ```
 */

import { type Layer, ManagedRuntime } from 'effect';
import type { SqlClient } from 'effect/unstable/sql';
import { type DatabaseOption, toLayer } from './db/connect';
import { type MigrateOptions, type MigrateReport, migrate } from './db/migrate';

export interface Migrator {
	/**
	 * Works out what migrating would do, and changes nothing.
	 *
	 * Always available, and worth calling first: `MigrateReport.blocked` is
	 * how a database that must not be migrated says so.
	 */
	readonly plan: (
		options?: Omit<MigrateOptions, 'dryRun'>
	) => Promise<MigrateReport>;
	/** Migrates the database. */
	readonly apply: (
		options?: Omit<MigrateOptions, 'dryRun'>
	) => Promise<MigrateReport>;
	/** Closes the connection pool. */
	readonly dispose: () => Promise<void>;
}

/**
 * A migrator for a database, described the same way `c15tInstance` describes
 * one.
 */
export const createMigrator = (database: DatabaseOption): Migrator => {
	const runtime = ManagedRuntime.make(
		toLayer(database) as Layer.Layer<SqlClient.SqlClient, never>
	);

	return {
		plan: (options) =>
			runtime.runPromise(migrate({ ...options, dryRun: true })),
		apply: (options) =>
			runtime.runPromise(migrate({ ...options, dryRun: false })),
		dispose: () => runtime.dispose(),
	};
};
