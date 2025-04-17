import type { MigrationResult } from '@c15t/backend/pkgs/migrations';
import * as p from '@clack/prompts';
import type { CliContext } from '~/context/types';
import { TelemetryEventName } from '~/utils/telemetry';

/**
 * Executes the provided runMigrations function with spinner and error handling.
 */
export async function executeMigrations(
	context: CliContext,
	runMigrationsFn: MigrationResult['runMigrations']
): Promise<void> {
	const { logger, telemetry } = context;
	logger.info('Executing migrations...');
	const s = p.spinner();
	s.start('Running migrations...');

	// Track migration execution start
	telemetry.trackEvent(TelemetryEventName.MIGRATION_EXECUTED, {
		status: 'started',
	});

	try {
		await runMigrationsFn();
		s.stop('Migrations completed successfully!');
		logger.success('🚀 Database migrated successfully');

		// Track successful migration execution
		telemetry.trackEvent(TelemetryEventName.MIGRATION_EXECUTED, {
			status: 'completed',
		});
	} catch (error) {
		logger.error('Migration failed.');

		// Track failed migration execution
		telemetry.trackEvent(TelemetryEventName.MIGRATION_EXECUTED, {
			status: 'failed',
			error: error instanceof Error ? error.message : String(error),
		});

		context.error.handleError(error, 'Error running migrations');
	}
}
