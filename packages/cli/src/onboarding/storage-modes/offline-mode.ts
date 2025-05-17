import type * as p from '@clack/prompts';
import type { CliContext } from '../../context/types';
import type { AvailiblePackages } from '../detection';
import { generateFiles } from '../generate-files';

/**
 * Result of offline mode setup
 */
export interface OfflineModeResult {
	clientConfigContent: string;
}

interface OfflineModeOptions {
	context: CliContext;
	projectRoot: string;
	spinner: ReturnType<typeof p.spinner>;
	pkg: AvailiblePackages;
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
	projectRoot,
	spinner,
	pkg,
}: OfflineModeOptions): Promise<OfflineModeResult> {
	const result = await generateFiles({
		context,
		projectRoot,
		mode: 'offline',
		pkg,
		spinner,
	});

	return {
		clientConfigContent: result.configContent ?? '',
	};
}
