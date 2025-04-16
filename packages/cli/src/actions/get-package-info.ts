import path from 'node:path';
import fs from 'fs-extra';
import type { CliContext } from '~/context/types';

/**
 * Reads and returns the content of the package.json in the current directory.
 */
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export function getPackageInfo(context: CliContext): any {
	const { logger } = context;
	logger.info('Attempting to read package.json');
	const packageJsonPath = path.join(process.cwd(), 'package.json');
	logger.debug(`package.json path: ${packageJsonPath}`);
	try {
		const packageInfo = fs.readJSONSync(packageJsonPath);
		logger.debug('Successfully read package.json:', packageInfo);
		return packageInfo;
	} catch (error) {
		logger.error(`Error reading package.json at ${packageJsonPath}:`, error);
		return { name: 'unknown', version: 'unknown' };
	}
}
