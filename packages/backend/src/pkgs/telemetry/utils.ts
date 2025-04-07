import type { Tracer } from '@opentelemetry/api';
import type { DoubleTieOptions } from '../types';

/**
 * Configuration options for the telemetry system
 */
export interface TelemetryConfig {
	/**
	 * Custom OpenTelemetry tracer to use instead of the default
	 */
	tracer?: Tracer;

	/**
	 * Whether telemetry should be disabled
	 */
	disabled?: boolean;

	/**
	 * Default attributes to add to all telemetry spans
	 */
	defaultAttributes?: Record<string, string | number | boolean>;
}

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
): DoubleTieOptions['telemetry'] {
	// Ensure we have a valid semver for OpenTelemetry (which requires valid SemVer)
	const serviceVersion = process.env.npm_package_version || '1.0.0'; // Use 1.0.0 as fallback instead of 'unknown'

	// Create the base configuration
	const config: DoubleTieOptions['telemetry'] = {
		// User can explicitly disable telemetry if needed
		disabled: telemetryConfig?.disabled ?? false,

		// Use provided tracer if available
		tracer: telemetryConfig?.tracer,

		// Merge default attributes with user-provided ones
		defaultAttributes: {
			// Start with user-provided attributes
			...(telemetryConfig?.defaultAttributes || {}),

			// Always ensure these core attributes are set
			// (will override user values if they exist)
			'service.name': String(appName),
			'service.version': serviceVersion,
		},
	};

	return config;
}
