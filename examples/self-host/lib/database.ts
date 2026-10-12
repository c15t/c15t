import { createMigrator } from '@c15t/backend';
import type { DatabaseOption } from '@c15t/backend';
import { PgliteClient } from '@effect/sql-pglite';

const url = process.env.DATABASE_URL;

/**
 * Postgres from `DATABASE_URL` when deployed. In development, PGlite runs
 * Postgres in-process and keeps its data in `.pgdata/`.
 */
export const database: DatabaseOption = url
	? { dialect: 'postgres', url }
	: PgliteClient.layer({ dataDir: '.pgdata' });

/**
 * Runs once when the server starts, from `instrumentation.ts`. Creates the
 * local schema in development. A deployed database is migrated with
 * `bun run db:migrate` before the deploy, not on boot.
 */
export const prepareDatabase = async () => {
	if (url) {
		return;
	}
	if (process.env.NODE_ENV === 'production') {
		throw new Error(
			'Set DATABASE_URL to a Postgres database and run `bun run db:migrate`.'
		);
	}
	const migrator = createMigrator(database);
	try {
		await migrator.apply();
	} finally {
		await migrator.dispose();
	}
};
