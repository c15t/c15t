import fs from 'node:fs/promises';
import path from 'node:path';
import type * as p from '@clack/prompts';
import color from 'picocolors';
import type { CliContext } from '../../context/types';
import { formatLogMessage } from '../../utils/logger';
import { generateClientConfigContent } from '../templates';

/**
 * Result of offline mode setup
 */
export interface OfflineModeResult {
	clientConfigContent: string;
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
export async function setupOfflineMode(
	context: CliContext,
	projectRoot: string,
	spinner: ReturnType<typeof p.spinner>,
	handleCancel?: (value: unknown) => boolean
): Promise<OfflineModeResult> {
	const { logger, cwd } = context;
	let spinnerActive = false;

	// Generate client config
	const clientConfigContent = generateClientConfigContent(
		'offline',
		undefined,
		false
	);

	const configPath = path.join(projectRoot, 'c15t.config.ts');

	// Write the client config
	spinner.start('Creating client configuration file...');
	spinnerActive = true;
	try {
		await fs.writeFile(configPath, clientConfigContent);
		spinner.stop(
			formatLogMessage(
				'info',
				`Client configuration created: ${color.cyan(path.relative(cwd, configPath))}`
			)
		);
	} catch (error) {
		spinner.stop(
			formatLogMessage(
				'error',
				`Failed to create configuration file: ${error instanceof Error ? error.message : 'Unknown error'}`
			)
		);
		throw error;
	} finally {
		spinnerActive = false;
	}

	return {
		clientConfigContent,
	};
}
