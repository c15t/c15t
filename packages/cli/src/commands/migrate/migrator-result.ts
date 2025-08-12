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

	const viewSQL = await p.confirm({
		message: 'View SQL for this migration?',
		initialValue: false,
	});

	if (p.isCancel(viewSQL)) {
		telemetry.trackEvent(TelemetryEventName.MIGRATION_FAILED, {
			viewSQL: false,
		});
		return;
	}

	if (viewSQL) {
		const sql = result.getSQL?.() ?? '';
		logger.info(sql);
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
