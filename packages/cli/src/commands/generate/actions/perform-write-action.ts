import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as p from '@clack/prompts';
import type { CliContext } from '~/context/types';

/**
 * Helper to perform the actual file write operation
 */
export async function performWriteAction(
	context: CliContext,
	filePath: string,
	code: string,
	actionDescription: string,
	successMessage: string
): Promise<void> {
	const { logger, error } = context;
	const spinner = p.spinner();
	spinner.start(actionDescription);
	logger.info(`Performing write action: ${actionDescription}`);
	logger.debug(`File path: ${filePath}`);
	logger.debug(`Code to write (first 100 chars): ${code.substring(0, 100)}...`);
	try {
		const dir = path.dirname(filePath);
		if (!existsSync(dir)) {
			logger.debug(`Directory ${dir} does not exist, creating...`);
			await fs.mkdir(dir, { recursive: true });
		}
		await fs.writeFile(filePath, code);
		logger.debug(`Successfully wrote file: ${filePath}`);
		spinner.stop(successMessage);
	} catch (writeError) {
		spinner.stop('File operation failed.');
		error.handleError(writeError, 'Error during file operation');
	}
}
