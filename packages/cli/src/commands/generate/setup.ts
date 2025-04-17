import { existsSync } from 'node:fs';
import type { C15TOptions, C15TPlugin } from '@c15t/backend';
import { type Adapter, getAdapter } from '@c15t/backend/pkgs/db-adapters';
import type { ConsentManagerOptions } from '@c15t/react';
import type { CliContext } from '~/context/types';
import { TelemetryEventName } from '~/utils/telemetry';

/**
 * Handles config loading, onboarding, and adapter setup using the context.
 * Returns the loaded config (if any) and adapter.
 */
export async function setupGenerateEnvironment(context: CliContext): Promise<{
	config: C15TOptions<C15TPlugin[]> | ConsentManagerOptions | null;
	adapter: Adapter;
}> {
	const { logger, flags, cwd, error, telemetry } = context;

	logger.debug('Setting up generate environment...');
	logger.debug('Context flags:', flags);
	logger.debug(`Context CWD: ${cwd}`);

	if (!existsSync(cwd)) {
		telemetry.trackEvent(TelemetryEventName.GENERATE_FAILED, {
			error: `Directory ${cwd} does not exist`,
			stage: 'setup',
		});
		return error.handleError(
			new Error(`The directory "${cwd}" does not exist`),
			'Generate setup failed'
		);
	}

	logger.debug('Attempting to load configuration...');
	const config = await context.config.loadConfig();

	if (!config) {
		logger.debug(
			'No config found during setup, generate command will handle onboarding.'
		);
		try {
			const memAdapter = await getAdapter({
				appName: 'temp-for-setup',
				database: { adapter: 'memory' },
			});
			return { config: null, adapter: memAdapter };
		} catch (adapterError) {
			telemetry.trackEvent(TelemetryEventName.GENERATE_FAILED, {
				error:
					adapterError instanceof Error
						? adapterError.message
						: String(adapterError),
				stage: 'adapter_initialization',
			});
			return error.handleError(
				adapterError,
				'Failed to initialize default memory adapter'
			);
		}
	}

	logger.debug('Config loaded, initializing adapter...');

	let adapter: Adapter | undefined;
	try {
		adapter = await getAdapter(config);
		logger.debug('Adapter initialized successfully');
	} catch (e) {
		telemetry.trackEvent(TelemetryEventName.GENERATE_FAILED, {
			error: e instanceof Error ? e.message : String(e),
			stage: 'adapter_initialization_with_config',
		});
		return error.handleError(e, 'Failed to initialize database adapter');
	}

	if (!adapter) {
		telemetry.trackEvent(TelemetryEventName.GENERATE_FAILED, {
			error: 'Adapter initialization returned undefined',
			stage: 'adapter_initialization_check',
		});
		return error.handleError(
			new Error('Adapter initialization returned undefined'),
			'Database adapter could not be initialized'
		);
	}

	logger.debug('Environment setup complete');
	return { config, adapter };
}
