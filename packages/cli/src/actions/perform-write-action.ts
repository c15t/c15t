import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as p from '@clack/prompts';
import color from 'picocolors';
import logger from '../utils/logger';

/**
 * Helper to perform the actual file write operation
 */
export async function performWriteAction(
	filePath: string,
	code: string,
	actionDescription: string,
	successMessage: string
): Promise<void> {
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
	} catch (error) {
		logger.error('File write operation failed:', error);
		spinner.stop('File operation failed.');
		p.log.error('Error during file operation:');
		if (error instanceof Error) {
			p.log.message(error.message);
		} else {
			p.log.message(String(error));
		}
		p.outro(`${color.red('Action failed.')}`); // Generic failure message
		throw error; // Re-throw to indicate failure
	}
}
