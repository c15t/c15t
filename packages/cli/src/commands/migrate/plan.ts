import type { C15TOptions, C15TPlugin } from '@c15t/backend';
import {
	type MigrationResult,
	getMigrations,
} from '@c15t/backend/pkgs/migrations';
import * as p from '@clack/prompts';
import color from 'picocolors';

import type { CliContext } from '~/context/types';

/**
 * Fetches migrations, displays the plan, and asks for confirmation.
 * Returns whether to proceed and the function to run migrations.
 */
export async function planMigrations(
	context: CliContext,
	config: C15TOptions<C15TPlugin[]>,
	skipConfirmation: boolean
): Promise<{
	shouldRun: boolean;
	runMigrationsFn: MigrationResult['runMigrations'] | null;
}> {
	const { logger, error } = context;
	logger.info('Planning migrations...');
	logger.debug('Config:', config);
	logger.debug(`Skip confirmation: ${skipConfirmation}`);
	const s = p.spinner();
	s.start('Preparing migration plan...');

	let migrationData: MigrationResult | undefined;
	try {
		logger.debug('Calling getMigrations...');
		migrationData = await getMigrations(config);
		logger.debug('getMigrations result:', migrationData);
	} catch (err) {
		logger.error('Error preparing migration plan:', err);
		s.stop('Migration preparation failed.');
		logger.error('Failed to prepare migrations');
		
		if (err instanceof Error) {
			logger.error(err.message);
		} else {
			logger.error(String(err));
		}
		
		logger.failed(`${color.red('Migration failed.')}`);
		// Indicate failure without providing run function
		return { shouldRun: false, runMigrationsFn: null };
	}

	if (!migrationData) {
		logger.warn('Could not retrieve migration data after getMigrations call.');
		s.stop('Could not retrieve migration data.');
		logger.failed(`${color.red('Migration failed.')}`);
		return { shouldRun: false, runMigrationsFn: null };
	}

	const { toBeAdded, toBeCreated, runMigrations } = migrationData;
	logger.debug('Migrations to be added:', toBeAdded);
	logger.debug('Migrations to be created:', toBeCreated);

	if (!toBeAdded.length && !toBeCreated.length) {
		logger.info('No migrations needed, database is up to date.');
		s.stop('No migrations needed.');
		logger.info('🚀 Database is already up to date.');
		logger.success('Migration check complete.');
		return { shouldRun: false, runMigrationsFn: null };
	}

	s.stop('Migration plan prepared.');
	logger.info('Migration plan generated.');
	logger.info('🔑 The following migrations will be applied:');

	// Display migration details in the log
	for (const table of [...toBeCreated, ...toBeAdded]) {
		const fields = Object.keys(table.fields).join(', ');
		const tableName = table.table;
		logger.info(`  + Table ${tableName}: Add fields [${fields}]`);
		
		// Still display to user for better visibility with colors
		p.log.message(
			`  ${color.cyan('+')} Table ${color.yellow(tableName)}: Add fields [${color.green(fields)}]`
		);
	}

	p.log.message(''); // Spacing before confirmation

	let shouldMigrate = skipConfirmation;
	if (!shouldMigrate) {
		logger.debug('Requesting user confirmation for migration.');
		shouldMigrate = await context.confirm(
			'Apply these migrations to the database?',
			false
		);
		logger.debug(`User confirmation result: ${shouldMigrate}`);
	}

	if (!shouldMigrate) {
		logger.info('Migration cancelled by user.');
		logger.failed('Migration aborted.');
		return { shouldRun: false, runMigrationsFn: null };
	}

	logger.info('Proceeding with migration execution.');
	return { shouldRun: true, runMigrationsFn: runMigrations };
}
