import path from 'node:path';
import type * as p from '@clack/prompts';
import color from 'picocolors';
import type { CliContext } from '../../../context/types';
import type { BaseOptions, BaseResult } from './types';
import { installDependencies } from './utils/dependencies';
import { generateFiles } from './utils/generate-files';

/**
 * Result of custom mode setup
 */
export interface CustomModeResult extends BaseResult {
	clientConfigContent: string;
}

interface CustomModeOptions extends BaseOptions {
	context: CliContext;
	spinner: ReturnType<typeof p.spinner>;
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
	spinner,
}: CustomModeOptions): Promise<CustomModeResult> {
	const {
		logger,
		cwd,
		framework: { pkg },
	} = context;

	if (!pkg) {
		throw new Error('Error detecting framework');
	}

	const result = await generateFiles({
		context,
		mode: 'custom',
		spinner,
	});

	logger.info(
		`Remember to implement custom endpoint handlers ${result.configPath ? `(see ${color.cyan(path.relative(cwd, result.configPath))})` : ''}`
	);

	const { ranInstall, installDepsConfirmed } = await installDependencies({
		context,
		dependenciesToAdd: [context.framework.pkg],
	});

	return {
		clientConfigContent: result.configContent ?? '',
		installDepsConfirmed,
		ranInstall,
	};
}
