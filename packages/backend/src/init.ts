import { defu } from 'defu';
import { getAdapter } from '~/pkgs/db-adapters';
import { createLogger } from '~/pkgs/logger';
import type { RegistryContext } from '~/pkgs/types';
import { generateId } from './pkgs/data-model/fields/id-generator';
import type { EntityName } from './pkgs/data-model/schema/types';
import {
	ERROR_CODES,
	type SDKResult,
	fail,
	failAsync,
	ok,
	promiseToResult,
} from './pkgs/results';
import { createRegistry } from './schema/create-registry';
import { getConsentTables } from './schema/definition';

import { env, getBaseURL, isProduction } from '~/pkgs/utils';
/**
 * c15t Initialization Module
 *
 * This module handles the initialization of the c15t consent management system.
 * It sets up the consent context, configures storage adapters, initializes plugins,
 * and establishes security settings like secrets and trusted origins.
 *
 * The initialization process includes:
 * - Setting up storage adapters for consent data
 * - Configuring security credentials and trusted origins
 * - Initializing core and custom plugins
 * - Creating the consent context object that serves as the foundation for the system
 *
 * This is an internal module typically not used directly by consumers of the c15t library.
 */
import type { C15TContext, C15TOptions, C15TPlugin } from '~/types';

/**
 * Default secret used when no secret is provided
 * This should only be used in development environments
 */
const DEFAULT_SECRET = 'c15t-default-secret-please-change-in-production';

/**
 * Initializes the c15t consent management system using Result pattern
 *
 * This function creates and configures the consent context based on the provided options.
 * It sets up storage adapters, initializes plugins, configures security settings,
 * and establishes the foundation for the consent management system.
 *
 * This version uses the neverthrow Result pattern for error handling.
 *
 * @template P - The plugin types used in the configuration
 * @param options - Configuration options for the c15t instance
 * @returns A Promise resolving to a Result containing the initialized consent context
 *
 * @example
 * ```typescript
 * const contextResult = await init({
 *   secret: process.env.CONSENT_SECRET,
 *   storage: memoryAdapter(),
 *   plugins: [geoPlugin()]
 * });
 *
 * // Handle success and error cases explicitly
 * contextResult.match(
 *   (context) => {
 *     // Use the successfully initialized context
 *   },
 *   (error) => {
 *     // Handle the initialization error
 *     console.error('Failed to initialize:', error.message);
 *   }
 * );
 * ```
 */
export const init = async <P extends C15TPlugin[]>(
	options: C15TOptions<P>
): Promise<SDKResult<C15TContext>> => {
	try {
		// Initialize core components
		const adapterResult = await promiseToResult(
			getAdapter(options),
			ERROR_CODES.INITIALIZATION_FAILED
		);

		return adapterResult.andThen((adapter) => {
			const logger = createLogger(options.logger);
			const baseURL = getBaseURL(options.baseURL, options.basePath);
			const secret =
				options.secret ||
				env.C15T_SECRET ||
				env.CONSENT_SECRET ||
				DEFAULT_SECRET;

			// Secret warning
			if (secret === DEFAULT_SECRET && isProduction) {
				logger.error(
					'Using default secret in production. Set C15T_SECRET or pass secret in config.'
				);
			}

			// Create normalized options
			const finalOptions = {
				...options,
				secret,
				baseURL: baseURL ? new URL(baseURL).origin : '',
				basePath: options.basePath || '/api/c15t',
				plugins: [...(options.plugins || []), ...getInternalPlugins(options)],
			};

			// Create ID generator
			const generateIdFunc = ({
				model,
				size = 16,
			}: { model: EntityName; size?: number }) => {
				return (
					finalOptions?.advanced?.generateId?.({ model, size }) ||
					generateId(getConsentTables(finalOptions)[model].entityPrefix)
				);
			};

			// Create registry context - just what registries need
			const registryContext: RegistryContext = {
				adapter,
				options: finalOptions,
				logger,
				hooks: options.databaseHooks || [],
				generateId: generateIdFunc,
			};

			// Create full application context
			const ctx: C15TContext = {
				appName: finalOptions.appName || 'c15t Consent Manager',
				options: finalOptions,
				trustedOrigins: getTrustedOrigins(finalOptions),
				baseURL: baseURL || '',
				secret,
				logger,
				generateId: generateIdFunc,
				adapter,
				registry: createRegistry(registryContext),
				tables: getConsentTables(options),
			};

			// Initialize plugins and return
			return runPluginInit(ctx);
		});
	} catch (error) {
		return failAsync(
			`Failed to initialize consent system: ${error instanceof Error ? error.message : String(error)}`,
			{
				code: ERROR_CODES.INITIALIZATION_FAILED,
				meta: { error },
			}
		);
	}
};

/**
 * Initializes all registered plugins using the Result pattern
 *
 * This function runs the init method of each plugin in sequence,
 * collecting any context or options modifications they provide.
 *
 * @param ctx - The current consent context
 * @returns A Result with the updated context after plugin initialization
 */
function runPluginInit(ctx: C15TContext): SDKResult<C15TContext> {
	try {
		let options = ctx.options;
		const plugins = options.plugins || [];
		let context: C15TContext = ctx;

		for (const plugin of plugins) {
			if (plugin.init) {
				const result = plugin.init(ctx);
				if (typeof result === 'object') {
					if (result.options) {
						options = defu(result.options, options);
					}
					if (result.context) {
						context = {
							...context,
							...(result.context as Partial<C15TContext>),
						};
					}
				}
			}
		}

		context.options = options;
		return ok(context);
	} catch (error) {
		return fail(
			`Plugin initialization failed: ${error instanceof Error ? error.message : String(error)}`,
			{
				code: ERROR_CODES.PLUGIN_INITIALIZATION_FAILED,
				meta: { error },
			}
		);
	}
}

/**
 * Retrieves internal plugins based on configuration options
 *
 * This function determines which internal plugins should be automatically
 * included based on the provided options.
 *
 * @param options - The c15t configuration options
 * @returns An array of internal plugins to include
 */
function getInternalPlugins(_options: C15TOptions): C15TPlugin[] {
	const plugins: C15TPlugin[] = [];

	return plugins;
}

/**
 * Builds a list of trusted origins for CORS
 *
 * This function determines which origins should be trusted for
 * cross-origin requests based on configuration and environment.
 *
 * @param options - The c15t configuration options
 * @returns An array of trusted origin URLs
 */
function getTrustedOrigins(options: C15TOptions): string[] {
	const baseURL = getBaseURL(options.baseURL, options.basePath);
	if (!baseURL) {
		return [];
	}

	const trustedOrigins = [new URL(baseURL).origin];

	if (options.trustedOrigins && Array.isArray(options.trustedOrigins)) {
		trustedOrigins.push(...options.trustedOrigins);
	}

	const envTrustedOrigins = env.C15T_TRUSTED_ORIGINS;
	if (envTrustedOrigins) {
		trustedOrigins.push(...envTrustedOrigins.split(','));
	}

	return trustedOrigins;
}
