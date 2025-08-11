import type { InferFumaDB } from 'fumadb';
import type { DB } from '~/v2/schema';

type DatabaseInstance = InferFumaDB<typeof DB>;
type MigratorInstance = ReturnType<DatabaseInstance['createMigrator']>;
type VersionTag = ReturnType<(typeof DB)['version']>;

type MigrateToLatestResult = Awaited<
	ReturnType<MigratorInstance['migrateToLatest']>
>;
type MigrateToResult = Awaited<ReturnType<MigratorInstance['migrateTo']>>;
type DownResult = Awaited<ReturnType<MigratorInstance['down']>>;

type MigrationResult = MigrateToLatestResult | MigrateToResult | DownResult;

type ORMResult = {
	code: string;
	path: string;
};

interface BaseOptions {
	db: DatabaseInstance;
}

// Discriminated unions by adapter
interface KyselyMigratorOptions extends BaseOptions {
	adapter: 'kysely';
	direction: VersionTag | 'latest' | 'down';
}

interface MongoMigratorOptions extends BaseOptions {
	adapter: 'mongo';
	direction: VersionTag | 'latest' | 'down';
}

interface DrizzleOrmOptions extends BaseOptions {
	adapter: 'drizzle';
	schema: VersionTag | 'latest';
}

interface PrismaOrmOptions extends BaseOptions {
	adapter: 'prisma';
	schema: VersionTag | 'latest';
}

interface TypeOrmOptions extends BaseOptions {
	adapter: 'typeorm';
	schema: VersionTag | 'latest';
}

type AnyMigratorOptions = KyselyMigratorOptions | MongoMigratorOptions;
type AnyOrmOptions = DrizzleOrmOptions | PrismaOrmOptions | TypeOrmOptions;
type AnyOptions = AnyMigratorOptions | AnyOrmOptions;

/**
 * Executes database migrations for supported adapters, or generates ORM schema
 * code for ORM-based adapters.
 *
 * - For 'kysely' and 'mongo', this function runs migrations using the
 *   underlying migrator returned by `db.createMigrator()`.
 * - For 'drizzle', 'prisma', and 'typeorm', this function generates schema
 *   code via `db.generateSchema()`.
 *
 */

export function migrator(options: AnyMigratorOptions): Promise<MigrationResult>;
export function migrator(options: AnyOrmOptions): Promise<ORMResult>;

export async function migrator(
	options: AnyOptions
): Promise<MigrationResult | ORMResult> {
	const { db } = options;

	switch (options.adapter) {
		case 'kysely':
		case 'mongo': {
			if (!('direction' in options)) {
				throw new Error('Missing migration direction');
			}

			const migratorInstance = db.createMigrator();

			switch (options.direction) {
				case 'latest':
					return await migratorInstance.migrateToLatest();
				case 'down':
					return await migratorInstance.down();
				default:
					return await migratorInstance.migrateTo(options.direction);
			}
		}

		case 'drizzle':
		case 'prisma':
		case 'typeorm': {
			if (!('schema' in options)) {
				throw new Error('Missing schema version');
			}

			return db.generateSchema(options.schema);
		}

		default: {
			throw new Error('Unsupported adapter');
		}
	}
}
