import type { C15TOptions } from '~/types';
import { version } from '~/version';

type TelemetryConfig = NonNullable<C15TOptions['advanced']>['telemetry'];

/**
 * Creates telemetry configuration from provided options
 *
 * This function merges user-provided telemetry options with sensible defaults,
 * ensuring that service name and version are always properly set.
 *
 * @param appName - The application name to use for service.name attribute
 * @param telemetryConfig - Optional user-provided telemetry configuration
 * @returns Properly structured telemetry options for the OpenTelemetry SDK
 */
export function createTelemetryOptions(
	appName = 'c15t',
	telemetryConfig?: TelemetryConfig
): TelemetryConfig {
	const config: TelemetryConfig = {
		disabled: telemetryConfig?.disabled ?? false,
		tracer: telemetryConfig?.tracer,

		defaultAttributes: {
			...(telemetryConfig?.defaultAttributes || {}),

			// Always ensure these core attributes are set
			// (will override user values if they exist)
			'service.name': String(appName),
			'service.version': version,
		},
	};

	return config;
}
