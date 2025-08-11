import { ensureBackendConfig } from '~/commands/migrate/ensure-backend-config';
import { readConfigAndGetDb } from '~/commands/migrate/read-config';
import type { CliContext } from '~/context/types';

export async function migrate(context: CliContext) {
	const { logger } = context;
	logger.info('Starting migration process...');

	// Ensure backend config exists (create if missing)
	const configPath = await ensureBackendConfig(context);

	if (!configPath) {
		logger.error('No backend config found.');
		return;
	}

	// Load config and get db client from default export
	logger.info(`Loading backend config from ${configPath}`);
	const _db = await readConfigAndGetDb(context, configPath);
	logger.info('Loaded backend config and obtained database client.');
	// logger.debug(_db);
	// logger.info(await _db.createMigrator().getVersion());
	// logger.info(JSON.stringify(_db.generateSchema('latest'), null, 2));
	// logger.info(await _db.version());

	// TODO: implement actual migration runner using packages/backend/src/v2/pkgs/migrator
	// Example placeholder usage:
	// const migrator = db.createMigrator();
	// await migrator.migrateToLatest();
	logger.info('Migration TBD.');
}
