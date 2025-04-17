import type { CliContext } from '~/context/types';
import { TelemetryEventName } from '~/utils/telemetry';
import { executeMigrations } from './migrate/execute';
import { planMigrations } from './migrate/plan';
import { setupEnvironment } from './migrate/setup';

export async function migrate(context: CliContext) {
	const { logger, flags, telemetry } = context;
	logger.info('Starting migration process...');
	logger.debug('Context:', context);
	
	// Track migration start
	telemetry.trackEvent(TelemetryEventName.MIGRATION_STARTED, {
		skipConfirmation: flags.y === true
	});

	const skipConfirmation = flags.y as boolean;

	try {
		// 1. Setup environment
		const { config } = await setupEnvironment(context);

		// 2. Plan migrations
		const planResult = await planMigrations(context, config, skipConfirmation);
		logger.debug('Plan result:', planResult);
		
		// Track migration plan
		telemetry.trackEvent(TelemetryEventName.MIGRATION_PLANNED, {
			shouldRun: planResult.shouldRun,
			hasMigrations: !!planResult.runMigrationsFn
		});

		// 3. Execute migrations if necessary
		if (planResult.shouldRun && planResult.runMigrationsFn) {
			await executeMigrations(context, planResult.runMigrationsFn);
			
			// Track migration completion
			telemetry.trackEvent(TelemetryEventName.MIGRATION_COMPLETED, {
				success: true
			});
		} else {
			logger.debug('Skipping migration execution based on plan result');
			
			// Track that no migration was needed or user cancelled
			telemetry.trackEvent(TelemetryEventName.MIGRATION_COMPLETED, {
				success: true,
				reason: planResult.shouldRun ? 'no_migrations_needed' : 'user_cancelled'
			});
		}
	} catch (error) {
		// Track migration failure
		telemetry.trackEvent(TelemetryEventName.MIGRATION_FAILED, {
			error: error instanceof Error ? error.message : String(error)
		});
		
		context.error.handleError(
			error,
			'An unexpected error occurred during the migration process'
		);
	}
}
