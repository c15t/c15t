import { validateMessages } from '~/handlers/init/translations';
import type { C15TContext, C15TOptions } from '~/types';
import { createRegistry } from './db/registry';
import { DB } from './db/schema';
import { withTenantScope } from './db/tenant-scope';
import { inspectPolicies } from './handlers/init/policy';
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
 *   telemetry: {
 *     enabled: true,
 *     tracer: trace.getTracer('my-app'),
 *     meter: metrics.getMeter('my-app'),
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
		options.telemetry,
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
	const db = options.tablePrefix ? DB.names.prefix(options.tablePrefix) : DB;
	const client = db.client(options.adapter);

	const rawOrm = client.orm('2.0.0');
	const orm = options.tenantId
		? withTenantScope(rawOrm, options.tenantId)
		: rawOrm;

	// Destructure ipAddress config to avoid type conflict with C15TContext.ipAddress (resolved string)
	const { ipAddress: _ipAddressConfig, ...baseOptions } = options;

	const i18nValidation = validateMessages({
		i18n: options.i18n,
		customTranslations: options.customTranslations,
		policies: options.policies,
	});

	for (const warning of i18nValidation.warnings) {
		logger.warn(`i18n: ${warning}`);
	}

	if (i18nValidation.errors.length > 0) {
		throw new Error(
			`Invalid i18n configuration:\n${i18nValidation.errors
				.map((error) => `- ${error}`)
				.join('\n')}`
		);
	}

	const policyValidation = inspectPolicies(options.policies ?? [], {
		iabEnabled: options.iab?.enabled === true,
	});

	for (const warning of policyValidation.warnings) {
		logger.warn(`policies: ${warning}`);
	}

	if (policyValidation.errors.length > 0) {
		throw new Error(policyValidation.errors[0]);
	}

	const context: C15TContext = {
		...baseOptions,
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
