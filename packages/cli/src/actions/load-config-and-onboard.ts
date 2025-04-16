import type { C15TOptions, C15TPlugin } from '@c15t/backend';
import * as p from '@clack/prompts';
import color from 'picocolors';
import { getConfig } from '~/actions/get-config';
import type { CliContext } from '~/context/types';
import { startOnboarding } from '../onboarding';

/**
 * Loads the c15t configuration, triggering onboarding if necessary.
 * Exits the process if loading fails or after onboarding is triggered.
 * Returns the loaded config if found.
 */
export async function loadConfigAndOnboard(
	context: CliContext
): Promise<C15TOptions<C15TPlugin[]>> {
	const { logger, cwd, flags } = context;
	logger.info('Attempting to load configuration...');
	logger.debug(`Load options: cwd=${cwd}, configPath=${flags.config}`);
	let config: C15TOptions<C15TPlugin[]> | undefined;
	try {
		const configResult = await getConfig(context);
		config = configResult ?? undefined;
		logger.debug('Config result:', config);
	} catch (error) {
		logger.error('Failed during getConfig call:', error);
		p.log.error('Error loading configuration:');
		if (error instanceof Error) {
			p.log.message(error.message);
		} else {
			p.log.message(String(error));
		}
		p.outro(`${color.red('Operation failed: Could not load config.')}`);
		process.exit(1);
	}

	if (!config) {
		logger.info('No config found, starting onboarding.');
		await startOnboarding(context);
		// Onboarding handles its own exit/completion. Exit here.
		logger.debug('Exiting after triggering onboarding.');
		process.exit(0);
	}

	logger.info('Configuration loaded successfully.');
	// If we reach here, config is guaranteed to be defined.
	return config;
}
