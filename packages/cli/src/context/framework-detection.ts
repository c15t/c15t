import {
	detectFramework as detectHexbusFramework,
	detectProjectRoot,
} from 'hexbus';
import type { CliLogger, FrameworkDetectionResult } from './types';

/**
 * Supported package managers
 */
export type AvailablePackages = '@c15t/nextjs' | '@c15t/react' | 'c15t';

/**
 * Detects the framework and React usage in the project
 *
 * @param projectRoot - The root directory of the project
 * @param logger - Optional logger instance for debug messages
 * @returns Object containing framework info and whether React is used
 */
export async function detectFramework(
	projectRoot: string,
	logger?: CliLogger
): Promise<FrameworkDetectionResult> {
	const result = await detectHexbusFramework(projectRoot, logger, {
		core: 'c15t',
		next: '@c15t/nextjs',
		react: '@c15t/react',
	});

	return {
		...result,
		pkg: result.pkg ?? 'c15t',
	};
}

export { detectProjectRoot };
