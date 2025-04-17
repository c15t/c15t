import type { C15TOptions, C15TPlugin } from '@c15t/backend';
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
	const { logger } = context;
	logger.debug('Checking for existing configuration...');

	let config: C15TOptions<C15TPlugin[]> | null;
	try {
		// Use context.config.loadConfig() instead of getConfig directly
		config = await context.config.loadConfig();
	} catch (error) {
		// This shouldn't happen since loadConfig handles errors,
		// but just in case something unexpected occurs
		return context.error.handleError(
			error,
			'Unexpected error during configuration loading'
		);
	}

	if (!config) {
		logger.info('No config found, starting onboarding.');
		await startOnboarding(context);
		// Onboarding handles its own exit/completion. Exit here.
		logger.debug('Exiting after triggering onboarding.');
		process.exit(0);
	}

	logger.debug('Configuration loaded successfully.');
	// If we reach here, config is guaranteed to be defined.
	return config;
}
