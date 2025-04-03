import type { NodeSDK } from '@opentelemetry/sdk-node';
import { createLogger } from '../logger';

// The SDK reference is now moved to init.ts
// This variable will be set by init.ts through the setTelemetrySdk function
let sdk: NodeSDK | undefined;

/**
 * Updates the SDK reference - called from init.ts after initialization
 *
 * @param sdkInstance - The initialized NodeSDK instance
 */
export const setTelemetrySdk = (sdkInstance: NodeSDK) => {
	sdk = sdkInstance;
};

/**
 * Shuts down the OpenTelemetry SDK gracefully
 *
 * @returns A promise that resolves when shutdown is complete
 */
export const shutdownTelemetry = async () => {
	if (sdk) {
		const logger = createLogger({ level: 'info', appName: 'telemetry' });
		logger.debug('Shutting down telemetry SDK');

		try {
			await sdk.shutdown();
			logger.info('Telemetry SDK shut down successfully');
			sdk = undefined;
			return true;
		} catch (error) {
			logger.error('Error shutting down telemetry SDK', {
				error: error instanceof Error ? error.message : String(error),
			});
			return false;
		}
	}
	return true;
};
