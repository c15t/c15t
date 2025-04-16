import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as p from '@clack/prompts';
import color from 'picocolors';

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
	try {
		const dir = path.dirname(filePath);
		if (!existsSync(dir)) {
			await fs.mkdir(dir, { recursive: true });
		}
		await fs.writeFile(filePath, code);
		spinner.stop(successMessage);
	} catch (error) {
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
