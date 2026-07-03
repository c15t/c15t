import type { InferFumaDB } from 'fumadb';
import type { DB } from '~/db/schema';
import {
	compareNameVariants,
	exportNameVariantsForVersion,
	type NamingMismatchRecovery,
	throwNamingMismatchError,
} from '~/db/schema/naming';

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
	/**
	 * Recovery mode for a naming mismatch between the current DB factory and
	 * FumaDB's persisted name variants.
	 */
	namingMismatch?: NamingMismatchRecovery;
}

type MutableMigrationResult = {
	operations: unknown[];
	getSQL?: () => string;
	execute: () => Promise<void>;
};

const SETTINGS_TABLE = 'private_c15t_settings';

const isSettingsOperation = (operation: unknown): boolean => {
	if (
		!operation ||
		typeof operation !== 'object' ||
		(operation as { type?: unknown }).type !== 'custom'
	) {
		return false;
	}

	const custom = operation as Record<string, unknown>;
	if (custom.key === 'version' || custom.key === 'name-variants') {
		return true;
	}

	if (typeof custom.sql !== 'string') {
		return false;
	}

	return (
		custom.sql.includes(SETTINGS_TABLE) &&
		(custom.sql.includes('version') || custom.sql.includes('name-variants'))
	);
};

const keepOnlySettingsOperations = <T extends MutableMigrationResult>(
	result: T
): T => {
	const settingsOperations = result.operations.filter(isSettingsOperation);
	if (settingsOperations.length === 0) {
		throw new Error(
			'Unable to build a naming adoption migration: no FumaDB settings operations were generated.'
		);
	}

	result.operations.splice(0, result.operations.length, ...settingsOperations);
	return result;
};

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
		const storedNameVariants = await migratorInstance.getNameVariants();
		const storedVersion = await migratorInstance.getVersion();
		if (storedNameVariants && storedVersion) {
			const currentNameVariants = exportNameVariantsForVersion(
				db.schemas,
				storedVersion
			);
			if (currentNameVariants) {
				const mismatches = compareNameVariants(
					storedNameVariants,
					currentNameVariants
				);
				if (mismatches.length > 0) {
					if (options.namingMismatch === 'adopt-current') {
						return keepOnlySettingsOperations(
							await migratorInstance.migrateTo(storedVersion, {
								mode: 'from-schema',
							})
						) as MigrationResult;
					}

					throwNamingMismatchError(
						mismatches,
						storedNameVariants,
						currentNameVariants
					);
				}
			}
		}

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
