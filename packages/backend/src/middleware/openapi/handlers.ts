import { OpenAPIGenerator } from '@orpc/openapi';
import { ZodToJsonSchemaConverter } from '@orpc/zod';
import { router } from '~/router';
import type { C15TContext, C15TOptions } from '~/types';
import { createDefaultOpenAPIOptions, createOpenAPIConfig } from './config';

/**
 * Type for the memoized OpenAPI spec function
 */
type MemoizedSpecFunction = {
	(): Promise<Record<string, unknown>>;
	cached?: Record<string, unknown>;
};

/**
 * Merges user OpenAPI options with default options
 */
const mergeOpenAPIOptions = (
	defaultOptions: Record<string, unknown>,
	userOptions: Record<string, unknown>
): Record<string, unknown> => {
	const merged = { ...defaultOptions };

	// Handle nested info object specially
	if (userOptions.info && typeof userOptions.info === 'object') {
		merged.info = {
			...(merged.info as Record<string, unknown>),
			...userOptions.info,
		};
	}

	// For all other top-level properties, override defaults
	for (const [key, value] of Object.entries(userOptions)) {
		if (key !== 'info') {
			merged[key] = value;
		}
	}

	return merged;
};

/**
 * Generate the OpenAPI specification document
 *
 * @param options - Configuration options for the OpenAPI spec generation
 * @returns A memoized function that generates and caches the OpenAPI spec
 *
 * @throws {Error} When the OpenAPI generator fails to create a valid spec
 *
 * @example
 * ```ts
 * const getSpec = createOpenAPISpec(options);
 * const spec = await getSpec();
 * ```
 */
export const createOpenAPISpec = (
	context: C15TContext,
	options: C15TOptions
) => {
	// Initialize OpenAPI generator with schema converters
	const openAPIGenerator = new OpenAPIGenerator({
		schemaConverters: [new ZodToJsonSchemaConverter()],
	});

	// Memoise once per process
	const getOpenAPISpec = (async (): Promise<Record<string, unknown>> => {
		if (getOpenAPISpec.cached) {
			return getOpenAPISpec.cached;
		}

		const defaultOptions = createDefaultOpenAPIOptions(options);
		const mergedOptions = options.advanced?.openapi?.options
			? mergeOpenAPIOptions(
					defaultOptions,
					options.advanced.openapi.options as Record<string, unknown>
				)
			: defaultOptions;

		try {
			// We need to cast to the expected type due to incompatibilities between the types
			// This is safe as we control the options format and it's compatible with what the generator expects
			const spec = await openAPIGenerator.generate(
				router,
				mergedOptions as Record<string, unknown>
			);
			getOpenAPISpec.cached = spec;
			return spec;
		} catch (error) {
			context.logger?.error('Failed to generate OpenAPI spec:', error);
			// Return a minimal valid spec to prevent UI errors
			return {
				openapi: '3.0.0',
				info: { title: options.appName || 'c15t API', version: '0.0.0' },
				paths: {},
			};
		}
	}) as MemoizedSpecFunction;

	return getOpenAPISpec;
};

/**
 * Generate the default UI for API documentation
 */
export const createDocsUI = (options: C15TOptions) => {
	const config = createOpenAPIConfig(options);

	// If a custom template is provided, use it
	if (config.customUiTemplate) {
		return config.customUiTemplate;
	}

	// Otherwise, return the default Scalar UI
	return `
    <!doctype html>
    <html>
      <head>
        <title>${options.appName || 'c15t API'} Documentation</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/svg+xml" href="https://c15t.com/icon.svg" />
      </head>
      <body>
        <script
          id="api-reference"
          data-url="${encodeURI(config.specPath)}">
        </script>
        <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
      </body>
    </html>
  `;
};
