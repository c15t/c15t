import { OpenAPIGenerator } from '@orpc/openapi';
import { ZodToJsonSchemaConverter } from '@orpc/zod';
import { router } from '~/router';
import type { C15TOptions } from '~/types';
import { createDefaultOpenAPIOptions, createOpenAPIConfig } from './config';

/**
 * Generate the OpenAPI specification document
 */
export const createOpenAPISpec = (options: C15TOptions) => {
	// Initialize OpenAPI generator with schema converters
	const openAPIGenerator = new OpenAPIGenerator({
		schemaConverters: [new ZodToJsonSchemaConverter()],
	});

	// Memoise once per process
	const getOpenAPISpec = async (): Promise<Record<string, unknown>> => {
		if (getOpenAPISpec.cached) {
			return getOpenAPISpec.cached;
		}

		// Start with our defaults
		const mergedOptions = { ...createDefaultOpenAPIOptions(options) };

		// If user provided options, merge them with defaults
		if (options.openapi?.options) {
			// biome-ignore lint: OpenAPI options are dynamically merged
			const userOptions = options.openapi.options as Record<string, any>;

			// Handle nested info object (title, description, version) specially
			if (userOptions.info) {
				mergedOptions.info = {
					...mergedOptions.info,
					...userOptions.info,
				};
			}

			// For all other top-level properties, override defaults with user settings
			for (const [key, value] of Object.entries(userOptions)) {
				if (key !== 'info') {
					(mergedOptions as Record<string, unknown>)[key] = value;
				}
			}
		}

		// We need to cast to the expected type due to incompatibilities between the types
		// This is safe as we control the options format and it's compatible with what the generator expects
		const spec = await openAPIGenerator.generate(
			router,
			mergedOptions as Record<string, unknown>
		);
		getOpenAPISpec.cached = spec;
		return spec;
	};

	return getOpenAPISpec as (() => Promise<Record<string, unknown>>) & {
		cached?: Record<string, unknown>;
	};
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
        <link rel="icon" type="image/svg+xml" href="https://orpc.unnoq.com/icon.svg" />
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
