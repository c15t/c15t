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
	const { logger } = context;
	logger.info('Planning migrations...');
	logger.debug('Config:', config);
	logger.debug(`Skip confirmation: ${skipConfirmation}`);

	const s = p.spinner();
	s.start('Preparing migration plan...');

	let migrationData: MigrationResult | undefined;
	try {
		migrationData = await getMigrations(config);
		logger.debug('Migration data:', migrationData);
	} catch (err) {
		s.stop('Migration preparation failed.');

		if (err instanceof Error) {
			logger.error(err.message);
		} else {
			logger.error(String(err));
		}

		logger.failed('Migration planning failed');
		return { shouldRun: false, runMigrationsFn: null };
	}

	if (!migrationData) {
		s.stop('Could not retrieve migration data.');
		logger.failed('Migration planning failed');
		return { shouldRun: false, runMigrationsFn: null };
	}

	const { toBeAdded, toBeCreated, runMigrations } = migrationData;
	logger.debug('Migrations to be added:', toBeAdded);
	logger.debug('Migrations to be created:', toBeCreated);

	if (!toBeAdded.length && !toBeCreated.length) {
		s.stop('No migrations needed.');
		logger.info('🚀 Database is up to date');
		return { shouldRun: false, runMigrationsFn: null };
	}

	s.stop('Migration plan prepared.');
	logger.info('🔑 The following migrations will be applied:');

	// Display migration details in the log
	for (const table of [...toBeCreated, ...toBeAdded]) {
		const fields = Object.keys(table.fields).join(', ');
		const tableName = table.table;
		logger.info(`  + Table ${tableName}: Add fields [${fields}]`);

		// Still display to user for better visibility with colors
		logger.message(
			`  ${color.cyan('+')} Table ${color.yellow(tableName)}: Add fields [${color.green(fields)}]`
		);
	}

	logger.message(''); // Spacing before confirmation

	let shouldMigrate = skipConfirmation;
	if (!shouldMigrate) {
		shouldMigrate = await context.confirm(
			'Apply these migrations to the database?',
			false
		);
		logger.debug(`User confirmation: ${shouldMigrate}`);
	}

	if (!shouldMigrate) {
		logger.failed('Migration cancelled');
		return { shouldRun: false, runMigrationsFn: null };
	}

	logger.debug('Proceeding with migration execution');
	return { shouldRun: true, runMigrationsFn: runMigrations };
}
