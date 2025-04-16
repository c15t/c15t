import { existsSync } from 'node:fs';
import type { C15TOptions, C15TPlugin } from '@c15t/backend';
import { type Adapter, getAdapter } from '@c15t/backend/pkgs/db-adapters';
import { loadConfigAndOnboard } from '~/actions/load-config-and-onboard';
import type { CliContext } from '~/context/types';

/**
 * Handles config loading, onboarding, and adapter setup using the context.
 */
export async function setupGenerateEnvironment(context: CliContext): Promise<{
	config: C15TOptions<C15TPlugin[]>;
	adapter: Adapter;
}> {
	const { logger, flags, cwd, error } = context;

	logger.info('Setting up generate environment...');
	logger.debug('Context flags:', flags);
	logger.debug(`Context CWD: ${cwd}`);

	if (!existsSync(cwd)) {
		return error.handleError(
			new Error(`The directory "${cwd}" does not exist`),
			'Generate setup failed'
		);
	}

	const config = await loadConfigAndOnboard(context);
	logger.info('Config loaded successfully for generate.');

	let adapter: Adapter | undefined;
	try {
		logger.debug('Initializing adapter for generate...');
		adapter = await getAdapter(config);
		logger.debug('Adapter initialized for generate:', adapter);
	} catch (e) {
		return error.handleError(e, 'Failed to initialize database adapter');
	}

	if (!adapter) {
		return error.handleError(
			new Error('Adapter initialization returned undefined'),
			'Database adapter could not be initialized'
		);
	}

	logger.info('Generate environment setup complete.');
	return { config, adapter };
}
