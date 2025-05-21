import * as p from '@clack/prompts';
import color from 'picocolors';
import type { CliContext } from '~/context/types';
import { startOnboarding } from '~/onboarding';
import { formatLogMessage } from '~/utils/logger';
import { TelemetryEventName } from '~/utils/telemetry';
import {
	isC15TOptions,
	isClientOptions,
} from '../actions/get-config/config-extraction';
import { setupGenerateEnvironment } from './generate/setup';

/**
 * Generate command - loads config, allows updating via onboarding, then generates artifacts.
 */
export async function generate(context: CliContext) {
	const { logger, error, telemetry } = context;
	logger.debug('Starting generate command...');

	// Track generate command start
	telemetry.trackEvent(TelemetryEventName.GENERATE_STARTED, {});

	// Load config & adapter
	const setupResult = await setupGenerateEnvironment(context);
	let { config, adapter } = setupResult;

	// Config update/onboarding flow
	if (config) {
		// Config exists - ask user if they want to update it
		let currentMode = 'unknown';
		if (isClientOptions(config)) {
			if (config.mode) {
				currentMode = config.mode;
			}
		} else if (isC15TOptions(config)) {
			currentMode = 'backend'; // Indicate it's a backend config
		}

		// Track found existing configuration
		telemetry.trackEvent(TelemetryEventName.CONFIG_LOADED, {
			type: currentMode,
			exists: true,
		});

		const shouldUpdate = await p.confirm({
			message: formatLogMessage(
				'warn',
				`A c15t configuration already exists. Would you like to update it before generating? (${color.dim(`Current mode: ${currentMode}`)})`
			),
			initialValue: false, // Default to NOT updating
		});

		if (!shouldUpdate) {
			telemetry.trackEvent(TelemetryEventName.GENERATE_COMPLETED, {
				success: false,
				reason: 'user_cancelled',
			});
			return error.handleCancel('Operation cancelled.', {
				command: 'generate',
				stage: 'config_update_prompt',
			});
		}

		if (shouldUpdate) {
			await startOnboarding(context, config);

			// Reload config with less verbose logging
			logger.debug('Reloading configuration after update...');
			const postUpdateResult = await setupGenerateEnvironment(context);
			if (!postUpdateResult.config) {
				telemetry.trackEvent(TelemetryEventName.GENERATE_FAILED, {
					error: 'Failed to load configuration after update',
				});
				return error.handleError(
					new Error('Failed to load configuration after update.'),
					'Configuration Error'
				);
			}
			config = postUpdateResult.config;
			adapter = postUpdateResult.adapter;
			logger.info('Configuration updated successfully.');

			// Track successful config update
			telemetry.trackEvent(TelemetryEventName.GENERATE_COMPLETED, {
				success: true,
				configUpdated: true,
			});
		} else {
			logger.debug('Proceeding with existing configuration.');

			// Track completion with existing config
			telemetry.trackEvent(TelemetryEventName.GENERATE_COMPLETED, {
				success: true,
				configUpdated: false,
			});
		}
	} else {
		logger.info('No configuration found.');

		// Track missing configuration
		telemetry.trackEvent(TelemetryEventName.CONFIG_LOADED, {
			exists: false,
		});

		const shouldOnboard = await p.confirm({
			message: 'No c15t configuration found. Would you like to create one now?',
			initialValue: true,
		});
		if (p.isCancel(shouldOnboard) || !shouldOnboard) {
			telemetry.trackEvent(TelemetryEventName.GENERATE_COMPLETED, {
				success: false,
				reason: 'onboarding_declined',
			});
			return error.handleCancel('Configuration setup cancelled.', {
				command: 'generate',
				stage: 'onboarding_prompt',
			});
		}

		// Run onboarding
		await startOnboarding(context);

		// Reload config with less verbose logging
		logger.debug('Reloading configuration after onboarding...');
		const postOnboardResult = await setupGenerateEnvironment(context);
		if (!postOnboardResult.config) {
			telemetry.trackEvent(TelemetryEventName.GENERATE_FAILED, {
				error: 'Failed to load configuration even after onboarding',
			});
			return error.handleError(
				new Error('Failed to load configuration even after onboarding.'),
				'Configuration Error'
			);
		}
		config = postOnboardResult.config;
		adapter = postOnboardResult.adapter;
		logger.info('New configuration loaded successfully.');

		// Track successful creation of new config
		telemetry.trackEvent(TelemetryEventName.GENERATE_COMPLETED, {
			success: true,
			newConfigCreated: true,
		});
	}
}
