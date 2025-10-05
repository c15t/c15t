/**
 * @fileoverview Scripts endpoint handler for generating client-side analytics scripts.
 *
 * This handler generates dynamic client-side scripts based on user consent and
 * enabled universal destinations, ensuring GDPR compliance.
 */

import type { Logger } from '@doubletie/logger';
import { z } from 'zod';
import { os } from '../../contracts';
import type { C15TContext } from '../../types';
import type { AnalyticsConsent, UniversalScript } from './core-types';
import { isUniversalDestination } from './core-types';
import type { DestinationManager } from './destination-manager';

/**
 * Query validation schema for scripts endpoint
 *
 * @internal
 * Validates incoming query parameters to ensure they meet requirements
 */
const ScriptsRequestQuerySchema = z.object({
	consent: z.string().min(1, 'Consent is required'),
	organizationId: z.string().optional(),
	environment: z.string().optional(),
});

/**
 * Consent validation schema
 *
 * @internal
 * Validates the parsed consent object structure
 */
const ConsentSchema = z.object({
	necessary: z.boolean(),
	measurement: z.boolean(),
	marketing: z.boolean(),
	functionality: z.boolean(),
	experience: z.boolean(),
});

/**
 * Custom error types for scripts endpoint
 *
 * @internal
 * Provides specific error types for better error handling and debugging
 */
export class ScriptsError extends Error {
	constructor(
		message: string,
		public code: string,
		public statusCode = 400
	) {
		super(message);
		this.name = 'ScriptsError';
	}
}

export class ConsentParseError extends ScriptsError {
	constructor(message: string) {
		super(message, 'CONSENT_PARSE_ERROR', 400);
	}
}

export class ScriptGenerationError extends ScriptsError {
	constructor(
		message: string,
		public destination?: string
	) {
		super(message, 'SCRIPT_GENERATION_ERROR', 500);
	}
}

/**
 * Generates client-side scripts from universal destinations based on consent
 *
 * @param destinationManager - Manager for loaded destinations
 * @param consent - User consent preferences
 * @param options - Optional organization and environment context
 * @param logger - Logger instance for debugging
 * @returns Promise resolving to array of generated scripts
 *
 * @throws {ScriptGenerationError} When script generation fails for a destination
 *
 * @example
 * ```typescript
 * const scripts = await generateScriptsFromDestinations(
 *   destinationManager,
 *   { necessary: true, measurement: true, marketing: false },
 *   { organizationId: 'org-123', environment: 'production' },
 *   logger
 * );
 * ```
 */
async function generateScriptsFromDestinations(
	destinationManager: DestinationManager,
	consent: AnalyticsConsent,
	options: { organizationId?: string; environment?: string },
	logger: Logger
): Promise<UniversalScript[]> {
	const scripts: UniversalScript[] = [];
	const loadedDestinations = destinationManager.getLoadedDestinations();

	for (const destination of loadedDestinations) {
		try {
			// Check if destination supports script generation
			if (!isUniversalDestination(destination.plugin)) {
				continue;
			}

			// Check if destination is enabled for this organization/environment
			if (!isDestinationEnabled(destination, options)) {
				continue;
			}

			// Generate scripts
			const generatedScripts = destination.plugin.generateScript(
				destination.config.settings,
				consent
			);

			if (generatedScripts) {
				const scriptArray = Array.isArray(generatedScripts)
					? generatedScripts
					: [generatedScripts];

				// Filter scripts by consent
				const filteredScripts = scriptArray.filter(
					(script) =>
						!script.requiredConsent ||
						script.requiredConsent.every((purpose) => consent[purpose])
				);

				scripts.push(...filteredScripts);

				logger.debug('Scripts generated for destination', {
					destination: destination.config.type,
					scriptCount: filteredScripts.length,
				});
			}
		} catch (error) {
			logger.error('Failed to generate scripts for destination', {
				destination: destination.config.type,
				error: error instanceof Error ? error.message : String(error),
			});
			// Continue with other destinations
		}
	}

	// Sort scripts by dependencies
	return sortScriptsByDependencies(scripts);
}

/**
 * Checks if a destination is enabled for the given organization/environment
 *
 * @internal
 * @param destination - Destination instance to check
 * @param _options - Organization and environment context
 * @returns True if destination is enabled, false otherwise
 *
 * @example
 * ```typescript
 * const enabled = isDestinationEnabled(destination, {
 *   organizationId: 'org-123',
 *   environment: 'production'
 * });
 * ```
 */
function isDestinationEnabled(
	_destination: unknown,
	_options: { organizationId?: string; environment?: string }
): boolean {
	// This would check against database configuration in Phase 3
	// For now, assume all loaded destinations are enabled
	return true;
}

/**
 * Sorts scripts by their dependencies to ensure proper loading order
 *
 * @internal
 * @param scripts - Array of scripts to sort
 * @returns Sorted array of scripts with dependencies loaded first
 *
 * @example
 * ```typescript
 * const sortedScripts = sortScriptsByDependencies(scripts);
 * ```
 */
function sortScriptsByDependencies(
	scripts: UniversalScript[]
): UniversalScript[] {
	const sorted: UniversalScript[] = [];
	const visited = new Set<string>();

	function visit(script: UniversalScript) {
		if (visited.has(script.src || script.content || '')) return;

		// Add dependencies first
		const dependencies = scripts.filter(
			(s) =>
				s.src !== script.src &&
				s.content !== script.content &&
				script.src?.includes(s.src || '') // Simple dependency check
		);

		for (const dep of dependencies) {
			visit(dep);
		}

		visited.add(script.src || script.content || '');
		sorted.push(script);
	}

	for (const script of scripts) {
		visit(script);
	}

	return sorted;
}

/**
 * Generates ETag for caching based on scripts and consent
 *
 * @internal
 * @param scripts - Array of scripts to generate ETag for
 * @param consent - Consent preferences used
 * @returns ETag string for HTTP caching
 *
 * @example
 * ```typescript
 * const etag = generateETag(scripts, consent);
 * ```
 */
function generateETag(
	scripts: UniversalScript[],
	consent: AnalyticsConsent
): string {
	const content = JSON.stringify({ scripts, consent });
	return `"${Buffer.from(content).toString('base64').slice(0, 16)}"`;
}

/**
 * Scripts endpoint handler for generating client-side analytics scripts
 *
 * @param input - Query parameters containing consent and context
 * @param context - c15t context with destination manager and logger
 * @returns Generated scripts with metadata
 *
 * @throws {ConsentParseError} When consent parsing fails
 * @throws {ScriptGenerationError} When script generation fails
 *
 * @example
 * ```typescript
 * const result = await analytics.scripts({
 *   consent: JSON.stringify({
 *     necessary: true,
 *     measurement: true,
 *     marketing: false
 *   }),
 *   organizationId: 'org-123'
 * });
 * ```
 */
export const getScriptsHandler = os.analytics.scripts.handler(
	async ({ input, context }) => {
		const typedContext = context as C15TContext;
		const logger = typedContext.logger;

		try {
			// Validate query parameters
			const queryResult = ScriptsRequestQuerySchema.safeParse(input);
			if (!queryResult.success) {
				logger.warn('Invalid query parameters', {
					errors: queryResult.error.issues,
					query: input,
				});

				throw new ScriptsError(
					'Invalid query parameters',
					'INVALID_QUERY',
					400
				);
			}

			const {
				consent: consentString,
				organizationId,
				environment,
			} = queryResult.data;

			// Parse and validate consent
			let consent: AnalyticsConsent;
			try {
				const parsedConsent = JSON.parse(consentString);
				const consentResult = ConsentSchema.safeParse(parsedConsent);

				if (!consentResult.success) {
					throw new ConsentParseError('Invalid consent format');
				}

				consent = consentResult.data;
			} catch {
				logger.warn('Invalid consent format', { consent: consentString });

				throw new ConsentParseError(
					'Consent must be a valid JSON object with required boolean fields'
				);
			}

			// Get destination manager from context
			const destinationManager = typedContext.destinationManager;
			if (!destinationManager) {
				throw new ScriptsError(
					'Destination manager not available',
					'SERVICE_UNAVAILABLE',
					503
				);
			}

			// Generate scripts from destinations
			const scripts = await generateScriptsFromDestinations(
				destinationManager,
				consent,
				{ organizationId, environment },
				logger
			);

			// Generate ETag for caching
			const etag = generateETag(scripts, consent);
			const cacheMaxAge = 300; // 5 minutes

			// Convert scripts to match contract schema (convert readonly arrays to regular arrays)
			const convertedScripts = scripts.map((script) => ({
				...script,
				requiredConsent: script.requiredConsent
					? [...script.requiredConsent]
					: undefined,
			}));

			// Return scripts with metadata
			const response = {
				scripts: convertedScripts,
				metadata: {
					generatedAt: new Date().toISOString(),
					consent,
					destinationCount: scripts.length,
					cache: {
						etag,
						maxAge: cacheMaxAge,
					},
				},
			};

			logger.info('Scripts generated successfully', {
				scriptCount: scripts.length,
				consent,
				organizationId,
				environment,
			});

			return response;
		} catch (error) {
			if (error instanceof ScriptsError) {
				throw error;
			}

			logger.error('Failed to generate scripts', {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				query: input,
			});

			throw new ScriptGenerationError('Failed to generate scripts');
		}
	}
);
