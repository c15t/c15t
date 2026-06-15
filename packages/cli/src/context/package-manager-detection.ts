import { detectPackageManager as detectHexbusPackageManager } from 'hexbus';
import type { CliLogger, PackageManager, PackageManagerResult } from './types';

export type { PackageManager, PackageManagerResult };

/**
 * Detects the package manager used in the project
 *
 * @param projectRoot - The root directory of the project
 * @param logger - Optional logger instance for debug messages
 * @returns The detected package manager
 */
export async function detectPackageManager(
	projectRoot: string,
	logger?: CliLogger
): Promise<PackageManagerResult> {
	return detectHexbusPackageManager(projectRoot, logger, {
		interactive: true,
	});
}
