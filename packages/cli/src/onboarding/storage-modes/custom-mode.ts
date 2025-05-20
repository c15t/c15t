import path from 'node:path';
import type * as p from '@clack/prompts';
import color from 'picocolors';
import type { AvailablePackages } from '~/context/framework-detection';
import type { CliContext } from '../../context/types';
import { generateFiles } from '../generate-files';

/**
 * Result of custom mode setup
 */
export interface CustomModeResult {
	clientConfigContent: string;
}

interface CustomModeOptions {
	context: CliContext;
	projectRoot: string;
	spinner: ReturnType<typeof p.spinner>;
	pkg: AvailablePackages;
}

/**
 * Handles the setup process for custom implementation mode
 *
 * @param context - CLI context
 * @param projectRoot - Project root directory
 * @param spinner - Spinner for loading indicators
 * @returns Configuration data for the custom mode
 */
export async function setupCustomMode({
	context,
	projectRoot,
	spinner,
	pkg,
}: CustomModeOptions): Promise<CustomModeResult> {
	const { logger, cwd } = context;

	const result = await generateFiles({
		context,
		projectRoot,
		mode: 'custom',
		pkg,
		spinner,
	});

	logger.info(
		`Remember to implement custom endpoint handlers ${result.configPath ? `(see ${color.cyan(path.relative(cwd, result.configPath))})` : ''}`
	);

	return {
		clientConfigContent: result.configContent ?? '',
	};
}
