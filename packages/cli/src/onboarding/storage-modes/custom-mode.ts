import fs from 'node:fs/promises';
import path from 'node:path';
import type * as p from '@clack/prompts';
import color from 'picocolors';
import type { CliContext } from '../../context/types';
import { formatLogMessage } from '../../utils/logger';
import { generateClientConfigContent } from '../templates';

/**
 * Result of custom mode setup
 */
export interface CustomModeResult {
	clientConfigContent: string;
}

/**
 * Handles the setup process for custom implementation mode
 *
 * @param context - CLI context
 * @param projectRoot - Project root directory
 * @param spinner - Spinner for loading indicators
 * @returns Configuration data for the custom mode
 */
export async function setupCustomMode(
	context: CliContext,
	projectRoot: string,
	spinner: ReturnType<typeof p.spinner>
): Promise<CustomModeResult> {
	const { logger, cwd } = context;
	let spinnerActive = false;

	// Generate client config
	const clientConfigContent = generateClientConfigContent('custom');
	const configPath = path.join(projectRoot, 'c15t.config.ts');

	// Write the client config
	spinner.start('Creating client configuration file...');
	spinnerActive = true;
	await fs.writeFile(configPath, clientConfigContent);
	spinner.stop(
		formatLogMessage(
			'info',
			`Client configuration created: ${color.cyan(path.relative(cwd, configPath))}`
		)
	);
	spinnerActive = false;

	logger.info(
		`Remember to implement custom endpoint handlers (see ${color.cyan(path.relative(cwd, configPath))}).`
	);

	return {
		clientConfigContent,
	};
}
