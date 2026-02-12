import type * as p from '@clack/prompts';
import type { CliContext } from '../../../context/types';
import { getFrontendUIOptions, getScriptsToAdd } from './shared';
import type { BaseOptions, BaseResult } from './types';
import { installDependencies } from './utils/dependencies';
import { generateFiles } from './utils/generate-files';

/**
 * Result of offline mode setup
 */
export interface OfflineModeResult extends BaseResult {
	clientConfigContent: string;
}

interface OfflineModeOptions extends BaseOptions {
	context: CliContext;
	spinner: ReturnType<typeof p.spinner>;
	handleCancel?: (value: unknown) => boolean;
}

/**
 * Handles the setup process for offline mode (browser storage)
 *
 * @param context - CLI context
 * @param projectRoot - Project root directory
 * @param spinner - Spinner for loading indicators
 * @param handleCancel - Function to handle prompt cancellations
 * @returns Configuration data for the offline mode
 */
export async function setupOfflineMode({
	context,
	spinner,
	handleCancel,
}: OfflineModeOptions): Promise<OfflineModeResult> {
	// Frontend UI options (SSR for Next.js, UI style + theme for React/Next.js)
	const { enableDevTools, uiStyle, expandedTheme } = await getFrontendUIOptions(
		{
			context,
			handleCancel,
		}
	);

	// Scripts prompt
	const addScripts = await getScriptsToAdd({ context, handleCancel });

	const result = await generateFiles({
		context,
		mode: 'offline',
		spinner,
		enableSSR: false,
		enableDevTools,
		uiStyle,
		expandedTheme,
	});

	// Build dependencies list
	const dependenciesToAdd: string[] = [context.framework.pkg];
	if (addScripts) {
		dependenciesToAdd.push('@c15t/scripts');
	}
	if (enableDevTools) {
		dependenciesToAdd.push('@c15t/dev-tools');
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
