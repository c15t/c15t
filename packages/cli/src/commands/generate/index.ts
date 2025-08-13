import type { CliContext } from '~/context/types';
import { TelemetryEventName } from '~/utils/telemetry';
import { startOnboarding } from './actions';

/**
 * Generate command - loads config, allows updating via onboarding, then generates artifacts.
 */
export async function generate(context: CliContext) {
	const { logger, error, telemetry } = context;
	logger.debug('Starting generate command...');

	// Track generate command start
	telemetry.trackEvent(TelemetryEventName.GENERATE_STARTED, {});

	await startOnboarding(context);

	telemetry.trackEvent(TelemetryEventName.GENERATE_COMPLETED, {
		success: true,
		newConfigCreated: true,
	});
}
