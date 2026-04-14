// /**
//  * Telemetry utilities for c15t
//  *
//  * This module provides tracer and meter instances for use with c15t backend.
//  * It connects to the OpenTelemetry SDK configured in instrumentation.ts.
//  */

// import { trace, metrics } from '@opentelemetry/api';

// /**
//  * Check if telemetry is available (Axiom is configured)
//  */
// export function isTelemetryAvailable(): boolean {
// 	return Boolean(process.env.AXIOM_API_TOKEN);
// }

// /**
//  * Get a tracer instance for c15t
//  */
// export function getTracer() {
// 	return trace.getTracer('c15t-demo');
// }

// /**
//  * Get a meter instance for c15t metrics
//  */
// export function getMeter() {
// 	return metrics.getMeter('c15t-demo');
// }

// /**
//  * Get telemetry configuration for c15t backend
//  *
//  * @example
//  * ```ts
//  * import { getTelemetryConfig } from '@/lib/telemetry';
//  *
//  * const handler = c15tInstance({
//  *   // ... other config
//  *   advanced: {
//  *     telemetry: getTelemetryConfig(),
//  *   },
//  * });
//  * ```
//  */
// export function getTelemetryConfig() {
// 	if (!isTelemetryAvailable()) {
// 		return undefined;
// 	}

// 	return {
// 		enabled: true,
// 		tracer: getTracer(),
// 		meter: getMeter(),
// 		defaultAttributes: {
// 			environment: process.env.NODE_ENV || 'development',
// 			deployment: process.env.VERCEL_ENV || 'local',
// 		},
// 	};
// }
