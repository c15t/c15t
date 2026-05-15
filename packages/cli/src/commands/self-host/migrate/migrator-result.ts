import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { MigrationResult } from '@c15t/backend/db/migrator';
import { promptConfirm } from 'hexbus';
import type { CliContext } from '~/context/types';
import { TelemetryEventName } from '~/utils/telemetry';

export async function handleMigrationResult(
	context: CliContext,
	result: MigrationResult
) {
	const { logger, telemetry } = context;
	telemetry.trackEvent(TelemetryEventName.MIGRATION_PLANNED, {
		success: true,
	});

	const saveSQL = await promptConfirm({
		cancel: 'silent',
		message: 'Save SQL to file?',
		initialValue: true,
		stage: 'migration_save_sql',
		telemetry,
	});

	if (saveSQL === undefined) {
		telemetry.trackEvent(TelemetryEventName.MIGRATION_FAILED, {
			saveSql: false,
		});
		return;
	}

	if (saveSQL) {
		const sql = result.getSQL?.() ?? '';
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const filename = `migration-${timestamp}.sql`;
		const filepath = join(process.cwd(), filename);

		await writeFile(filepath, sql, 'utf-8');
		logger.success(`SQL saved to: ${filename}`);
	}

	const execute = await promptConfirm({
		cancel: 'silent',
		message: 'Execute this migration?',
		initialValue: false,
		stage: 'migration_execute',
		telemetry,
	});

	if (execute === undefined) {
		telemetry.trackEvent(TelemetryEventName.MIGRATION_FAILED, {
			execute: false,
		});
		return;
	}

	await result.execute();

	logger.success('Migration completed.');

	telemetry.trackEvent(TelemetryEventName.MIGRATION_COMPLETED, {
		success: true,
	});
}
