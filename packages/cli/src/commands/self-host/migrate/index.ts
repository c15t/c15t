import { migrator } from '@c15t/backend/v2/db/migrator';
import { installDependencies } from '~/commands/generate/options/utils/dependencies';
import { ensureBackendConfig } from '~/commands/self-host/migrate/ensure-backend-config';
import { handleMigrationResult } from '~/commands/self-host/migrate/migrator-result';
import { handleORMResult } from '~/commands/self-host/migrate/orm-result';
import { readConfigAndGetDb } from '~/commands/self-host/migrate/read-config';
import type { CliContext } from '~/context/types';

export async function migrate(context: CliContext) {
	const { logger } = context;
	logger.info('Starting migration process...');

	// Ensure backend config exists (create if missing)
	const { path, dependencies } = await ensureBackendConfig(context);

	if (!path) {
		logger.error('No backend config found.');
		return;
	}

	if (dependencies.length > 0) {
		await installDependencies({
			context,
			dependenciesToAdd: dependencies,
			autoInstall: true,
		});
	}

	const { db } = await readConfigAndGetDb(context, path);

	logger.info('Loaded c15t-backend.config.ts');

	const result = await migrator({ db, schema: 'latest' });

	if ('path' in result) {
		await handleORMResult(context, result);
	} else {
		await handleMigrationResult(context, result);
	}
}
