import type { MigrationResult } from '@c15t/backend/pkgs/migrations';
import * as p from '@clack/prompts';
import color from 'picocolors';
import type { CliContext } from '~/context/types';

/**
 * Executes the provided runMigrations function with spinner and error handling.
 */
export async function executeMigrations(
	context: CliContext,
	runMigrationsFn: MigrationResult['runMigrations']
): Promise<void> {
	const { logger } = context;
	logger.info('Executing migrations...');
	const s = p.spinner();
	s.start('Running migrations...');

	try {
		logger.debug('Calling runMigrations function...');
		await runMigrationsFn();
		logger.info('Migrations completed successfully.');
		s.stop('Migrations completed successfully!');
		logger.success('🚀 Database migrated successfully!');
		p.outro('Migration complete.');
	} catch (error) {
		logger.error('Error occurred during migration execution:', error);
		s.stop('Migration failed.');
		logger.error('Error running migrations:');
		if (error instanceof Error) {
			logger.error(error.message);
		} else {
			logger.error(String(error));
		}
		p.outro(`${color.red('Migration failed.')}`);
		// Indicate failure by allowing the main function to potentially catch
		// or handle the fact that the outro wasn't successful.
		// We avoid process.exit here to allow potential cleanup or further actions.
	}
}
