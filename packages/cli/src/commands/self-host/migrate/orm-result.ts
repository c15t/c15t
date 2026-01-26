import fs from 'node:fs/promises';
import path from 'node:path';
import type { ORMResult } from '@c15t/backend/db/migrator';
import type { CliContext } from '~/context/types';
import { TelemetryEventName } from '~/utils/telemetry';

export async function handleORMResult(context: CliContext, result: ORMResult) {
	const { logger, telemetry, cwd } = context;
	const filePath = path.join(cwd, result.path);

	// Ensure the target directory exists before writing the file
	await fs.mkdir(path.dirname(filePath), { recursive: true });
	await fs.writeFile(filePath, result.code);
	logger.info(`Migration file created at ${filePath}`);

	telemetry.trackEvent(TelemetryEventName.MIGRATION_COMPLETED, {
		success: true,
		migrationFileCreated: true,
	});
}
