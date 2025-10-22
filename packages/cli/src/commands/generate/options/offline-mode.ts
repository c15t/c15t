import type * as p from '@clack/prompts';
import type { CliContext } from '../../../context/types';
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
}: OfflineModeOptions): Promise<OfflineModeResult> {
	const result = await generateFiles({
		context,
		mode: 'offline',
		spinner,
	});

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
