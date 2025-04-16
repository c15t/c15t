import type { C15TOptions, C15TPlugin } from '@c15t/backend';
import {
	type MigrationResult,
	getMigrations,
} from '@c15t/backend/pkgs/migrations';
import * as p from '@clack/prompts';
import color from 'picocolors';

import { confirmAction } from '~/actions/confirm-action';

/**
 * Fetches migrations, displays the plan, and asks for confirmation.
 * Returns whether to proceed and the function to run migrations.
 */
export async function planMigrations(
	config: C15TOptions<C15TPlugin[]>,
	skipConfirmation: boolean
): Promise<{
	shouldRun: boolean;
	runMigrationsFn: MigrationResult['runMigrations'] | null;
}> {
	const s = p.spinner();
	s.start('Preparing migration plan...');

	let migrationData: MigrationResult | undefined;
	try {
		migrationData = await getMigrations(config);
	} catch (error) {
		s.stop('Migration preparation failed.');
		p.log.error('Failed to prepare migrations:');
		if (error instanceof Error) {
			p.log.message(error.message);
		} else {
			p.log.message(String(error));
		}
		p.outro(`${color.red('Migration failed.')}`);
		// Indicate failure without providing run function
		return { shouldRun: false, runMigrationsFn: null };
	}

	if (!migrationData) {
		s.stop('Could not retrieve migration data.');
		p.outro(`${color.red('Migration failed.')}`);
		return { shouldRun: false, runMigrationsFn: null };
	}

	const { toBeAdded, toBeCreated, runMigrations } = migrationData;

	if (!toBeAdded.length && !toBeCreated.length) {
		s.stop('No migrations needed.');
		p.log.success('🚀 Database is already up to date.');
		p.outro('Migration check complete.');
		return { shouldRun: false, runMigrationsFn: null };
	}

	s.stop('Migration plan prepared.');
	p.log.info('🔑 The following migrations will be applied:');

	for (const table of [...toBeCreated, ...toBeAdded]) {
		const fields = Object.keys(table.fields).join(', ');
		const tableName = table.table;
		// Using note for better visibility of the plan
		p.log.message(
			`  ${color.cyan('+')} Table ${color.yellow(tableName)}: Add fields [${color.green(fields)}]`
		);
	}

	p.log.message(''); // Spacing before confirmation

	let shouldMigrate = skipConfirmation;
	if (!shouldMigrate) {
		shouldMigrate = await confirmAction(
			'Apply these migrations to the database?',
			false
		);
		// Note: ConfirmAction calls HandleCancel internally if cancelled
	}

	if (!shouldMigrate) {
		p.log.info('Migration cancelled by user.');
		p.outro('Migration aborted.');
		return { shouldRun: false, runMigrationsFn: null };
	}

	return { shouldRun: true, runMigrationsFn: runMigrations };
}
