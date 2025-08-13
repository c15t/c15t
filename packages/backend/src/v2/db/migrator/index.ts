import type { InferFumaDB } from 'fumadb';
import type { DB } from '~/v2/db/schema';

type DatabaseInstance = InferFumaDB<typeof DB>;
type MigratorInstance = ReturnType<DatabaseInstance['createMigrator']>;
type VersionTag = ReturnType<(typeof DB)['version']>;

type MigrateToLatestResult = Awaited<
	ReturnType<MigratorInstance['migrateToLatest']>
>;
type MigrateToResult = Awaited<ReturnType<MigratorInstance['migrateTo']>>;
type DownResult = Awaited<ReturnType<MigratorInstance['down']>>;

export type MigrationResult =
	| MigrateToLatestResult
	| MigrateToResult
	| DownResult;

export type ORMResult = {
	code: string;
	path: string;
};

interface BaseOptions {
	db: DatabaseInstance;
	schema: VersionTag | 'latest';
}

/**
 * Executes database migrations for supported adapters, or generates ORM schema
 * code for ORM-based adapters.
 *
 * - For 'kysely' and 'mongo', this function runs migrations using the
 *   underlying migrator returned by `db.createMigrator()`.
 * - For 'drizzle', 'prisma', and 'typeorm', this function generates schema
 *   code via `db.generateSchema()`.
 */
export async function migrator(
	options: BaseOptions
): Promise<MigrationResult | ORMResult> {
	const { db } = options;

	let version: VersionTag | 'legacy';
	try {
		version = await db.version();
	} catch {
		// If FumaDB isn't initalized yet, we're in legacy mode
		version = 'legacy';
	}

	const migratorInstance = db.adapter?.createMigrationEngine
		? db.createMigrator()
		: undefined;

	const schema = db.adapter?.generateSchema
		? db.generateSchema(options.schema)
		: undefined;

	if (migratorInstance) {
		switch (options.schema) {
			case 'latest':
				return await migratorInstance.migrateToLatest({
					mode: version === 'legacy' ? 'from-database' : 'from-schema',
				});
			default:
				return await migratorInstance.migrateTo(options.schema, {
					mode: version === 'legacy' ? 'from-database' : 'from-schema',
				});
		}
	}

	if (schema) {
		return {
			code: schema.code,
			path: schema.path,
		};
	}

	throw new Error('Adapter does not support migrations or schema generation');
}
