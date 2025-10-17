import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { MigrationResult } from '@c15t/backend/v2/db/migrator';
import * as p from '@clack/prompts';
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

	const saveSQL = await p.confirm({
		message: 'Save SQL to file?',
		initialValue: true,
	});

	if (p.isCancel(saveSQL)) {
		telemetry.trackEvent(TelemetryEventName.MIGRATION_FAILED, {
			viewSQL: false,
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

	const execute = await p.confirm({
		message: 'Execute this migration?',
		initialValue: false,
	});

	if (p.isCancel(execute)) {
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
