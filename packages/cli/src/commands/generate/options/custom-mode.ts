import path from 'node:path';
import type * as p from '@clack/prompts';
import color from 'picocolors';
import type { CliContext } from '../../../context/types';
import { getFrontendUIOptions, getScriptsToAdd } from './shared';
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
	handleCancel?: (value: unknown) => boolean;
}

/**
 * Handles the setup process for custom implementation mode
 *
 * @param context - CLI context
 * @param projectRoot - Project root directory
 * @param spinner - Spinner for loading indicators
 * @param handleCancel - Function to handle prompt cancellations
 * @returns Configuration data for the custom mode
 */
export async function setupCustomMode({
	context,
	spinner,
	handleCancel,
}: CustomModeOptions): Promise<CustomModeResult> {
	const {
		logger,
		cwd,
		framework: { pkg },
	} = context;

	if (!pkg) {
		throw new Error('Error detecting framework');
	}

	// Frontend UI options (SSR for Next.js, UI style + theme for React/Next.js)
	const { enableSSR, uiStyle, expandedTheme } = await getFrontendUIOptions({
		context,
		handleCancel,
	});

	// Scripts prompt
	const addScripts = await getScriptsToAdd({ context, handleCancel });

	const result = await generateFiles({
		context,
		mode: 'custom',
		spinner,
		enableSSR,
		uiStyle,
		expandedTheme,
	});

	logger.info(
		`Remember to implement custom endpoint handlers ${result.configPath ? `(see ${color.cyan(path.relative(cwd, result.configPath))})` : ''}`
	);

	// Build dependencies list
	const dependenciesToAdd: string[] = [context.framework.pkg];
	if (addScripts) {
		dependenciesToAdd.push('@c15t/scripts');
	}

	const { ranInstall, installDepsConfirmed } = await installDependencies({
		context,
		dependenciesToAdd,
		handleCancel,
	});

	return {
		clientConfigContent: result.configContent ?? '',
		installDepsConfirmed,
		ranInstall,
	};
}
