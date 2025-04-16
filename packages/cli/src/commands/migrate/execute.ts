import type { MigrationResult } from '@c15t/backend/pkgs/migrations';
import * as p from '@clack/prompts';
import color from 'picocolors';

/**
 * Executes the provided runMigrations function with spinner and error handling.
 */
export async function executeMigrations(
	runMigrationsFn: MigrationResult['runMigrations']
): Promise<void> {
	const s = p.spinner();
	s.start('Running migrations...');

	try {
		await runMigrationsFn();
		s.stop('Migrations completed successfully!');
		p.log.success('🚀 Database migrated successfully!');
		p.outro('Migration complete.');
	} catch (error) {
		s.stop('Migration failed.');
		p.log.error('Error running migrations:');
		if (error instanceof Error) {
			p.log.message(error.message);
		} else {
			p.log.message(String(error));
		}
		p.outro(`${color.red('Migration failed.')}`);
		// Indicate failure by allowing the main function to potentially catch
		// or handle the fact that the outro wasn't successful.
		// We avoid process.exit here to allow potential cleanup or further actions.
	}
}
