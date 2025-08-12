import { migrator } from '@c15t/backend/v2/db/migrator';
import { ensureBackendConfig } from '~/commands/migrate/ensure-backend-config';
import { handleMigrationResult } from '~/commands/migrate/migrator-result';
import { handleORMResult } from '~/commands/migrate/orm-result';
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

	const { db, adapter } = await readConfigAndGetDb(context, configPath);

	logger.info('Loaded c15t-backend.config.ts');

	const result = await migrator({ db, adapter, schema: 'latest' });

	if ('path' in result) {
		await handleORMResult(context, result);
	} else {
		await handleMigrationResult(context, result);
	}
}
