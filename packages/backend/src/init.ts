import type { C15TContext, C15TOptions } from '~/types';
import { createRegistry } from './db/registry';
import { DB } from './db/schema';
import { withTenantScope } from './db/tenant-scope';
import {
	createTelemetryOptions,
	isTelemetryEnabled,
} from './utils/create-telemetry-options';
import { initLogger } from './utils/logger';

/**
 * Initializes the c15t backend context.
 *
 * Telemetry (tracing and metrics) is opt-in and disabled by default.
 * Users must:
 * 1. Set up their own OpenTelemetry SDK (Node.js, Bun, edge runtime, etc.)
 * 2. Pass enabled: true and optionally a tracer/meter to the telemetry config
 *
 * @example
 * ```typescript
 * // User sets up their own SDK before calling init
 * import { NodeSDK } from '@opentelemetry/sdk-node';
 * const sdk = new NodeSDK({ ... });
 * sdk.start();
 *
 * // Then pass telemetry config
 * const instance = c15tInstance({
 *   advanced: {
 *     telemetry: {
 *       enabled: true,
 *       tracer: trace.getTracer('my-app'),
 *       meter: metrics.getMeter('my-app'),
 *     },
 *   },
 * });
 * ```
 */
export const init = (options: C15TOptions): C15TContext => {
	const appName = options.appName || 'c15t';

	const logger = initLogger({
		...options.logger,
		appName: String(appName),
	});

	// Create telemetry options (validates and merges with defaults)
	const telemetryOptions = createTelemetryOptions(
		String(appName),
		options.advanced?.telemetry,
		options.tenantId
	);

	// Log telemetry status
	if (isTelemetryEnabled(options)) {
		logger.debug('Telemetry is enabled', {
			hasTracer: !!telemetryOptions?.tracer,
			hasMeter: !!telemetryOptions?.meter,
			attributes: telemetryOptions?.defaultAttributes,
		});
	} else {
		logger.debug('Telemetry is disabled (opt-in required)');
	}

	// Initialize core components
	const client = DB.client(options.adapter);

	const rawOrm = client.orm('2.0.0');
	const orm = options.tenantId
		? withTenantScope(rawOrm, options.tenantId)
		: rawOrm;

	const context: C15TContext = {
		...options,
		appName,
		logger,
		db: orm,
		registry: createRegistry({
			db: orm,
			ctx: {
				logger,
			},
		}),
	};

	return context;
};
