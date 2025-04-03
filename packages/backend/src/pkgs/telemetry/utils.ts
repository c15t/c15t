import type { Tracer } from '@opentelemetry/api';
import type { DoubleTieOptions } from '../types';
import type { Endpoint, EndpointHandler } from '../types/endpoints';

export interface TelemetryConfig {
	tracer?: Tracer;
	disabled?: boolean;
	defaultAttributes?: Record<string, string | number | boolean>;
}

/**
 * Creates an endpoint handler that works directly with H3
 *
 * @param handler - The endpoint handler function
 * @param path - The endpoint path
 * @param options - Optional configuration for the endpoint
 * @returns An Endpoint object with the handler function
 */
export function createEndpoint(
	handler: EndpointHandler,
	path: string,
	options?: Endpoint['options']
): Endpoint {
	// Create an endpoint directly compatible with H3
	return {
		handler,
		path,
		options,
	};
}

/**
 * Creates telemetry configuration from provided options
 *
 * @param appName - The application name
 * @param telemetryConfig - Optional telemetry configuration
 * @returns Properly structured telemetry options
 */
export function createTelemetryOptions(
	appName = 'c15t',
	telemetryConfig?: TelemetryConfig
): DoubleTieOptions['telemetry'] {
	return {
		tracer: telemetryConfig?.tracer,
		disabled: telemetryConfig?.disabled,
		defaultAttributes: {
			'service.name': String(appName),
			'service.version': String(process.env.npm_package_version || 'unknown'),
			...(telemetryConfig?.defaultAttributes || {}),
		},
	};
}
