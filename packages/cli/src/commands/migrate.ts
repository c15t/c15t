import type { CliContext } from '~/context/types';
import { executeMigrations } from './migrate/execute';
import { planMigrations } from './migrate/plan';
import { setupEnvironment } from './migrate/setup';

export async function migrate(context: CliContext) {
	const { logger, flags } = context;
	logger.info('Starting migration process...');
	logger.debug('Context:', context);

	const skipConfirmation = flags.y as boolean;

	try {
		// 1. Setup environment
		const { config } = await setupEnvironment(context);

		// 2. Plan migrations
		const planResult = await planMigrations(context, config, skipConfirmation);
		logger.debug('Plan result:', planResult);

		// 3. Execute migrations if necessary
		if (planResult.shouldRun && planResult.runMigrationsFn) {
			await executeMigrations(context, planResult.runMigrationsFn);
		} else {
			logger.debug('Skipping migration execution based on plan result');
		}
	} catch (error) {
		context.error.handleError(
			error,
			'An unexpected error occurred during the migration process'
		);
	}
}
