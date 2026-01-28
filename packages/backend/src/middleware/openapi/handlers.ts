import type { C15TOptions } from '~/types';
import { createOpenAPIConfig } from './config';

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
