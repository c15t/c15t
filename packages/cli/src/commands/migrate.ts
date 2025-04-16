import * as p from '@clack/prompts';
import color from 'picocolors';
import type { CliContext } from '~/context/types';
import { executeMigrations } from './migrate/execute';
import { planMigrations } from './migrate/plan';
import { setupEnvironment } from './migrate/setup';

export async function migrate(context: CliContext) {
	const { logger, flags } = context;
	logger.info('Starting migrate command...');
	logger.debug('Received context:', context);

	const skipConfirmation = flags.y as boolean;

	try {
		// 1. Setup environment (accepts context)
		const { config /* , adapter */ } = await setupEnvironment(context);
		logger.info('Migrate environment setup completed.');

		// 2. Plan migrations (accepts context)
		const planResult = await planMigrations(context, config, skipConfirmation);
		logger.info('Migration planning process completed.');
		logger.debug('Plan result:', planResult);

		// 3. Execute migrations if necessary (accepts context)
		if (planResult.shouldRun && planResult.runMigrationsFn) {
			logger.info('Proceeding to execute migrations.');
			await executeMigrations(context, planResult.runMigrationsFn);
			logger.info('Migration execution process completed.');
		} else {
			logger.info('Skipping migration execution based on plan result.');
		}

		logger.info('Migrate command finished successfully.');
	} catch (error) {
		logger.error('Unexpected error during migrate command:', error);
		p.log.error('An unexpected error occurred during the migration process:');
		if (error instanceof Error) {
			p.log.message(error.message);
		} else {
			p.log.message(String(error));
		}
		p.outro(`${color.red('Migration process failed unexpectedly.')}`);
		process.exit(1);
	}
}
