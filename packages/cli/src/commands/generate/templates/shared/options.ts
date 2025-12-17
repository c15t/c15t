/**
 * Shared template configuration generators
 * These functions generate template configuration content for different storage modes
 * Used by both App Directory and Pages Directory implementations
 */

/**
 * Generates the options text for ConsentManagerProvider based on mode and configuration
 *
 * @param mode - The storage mode ('c15t', 'offline', or 'custom')
 * @param backendURL - URL for the c15t backend/API (for 'c15t' mode)
 * @param useEnvFile - Whether to use environment variable for backendURL
 * @param proxyNextjs - Whether to use Next.js API proxy for c15t mode
 * @returns The formatted options object as a string
 *
 * @example
 * ```ts
 * const options = generateOptionsText('c15t', 'https://api.example.com', false, true);
 * // Returns: "{ mode: 'c15t', backendURL: '/api/c15t', ... }"
 * ```
 */
export function generateOptionsText(
	mode: string,
	backendURL?: string,
	useEnvFile?: boolean,
	proxyNextjs?: boolean
): string {
	switch (mode) {
		case 'c15t': {
			if (proxyNextjs) {
				return `{
					mode: 'c15t',
					backendURL: '/api/c15t',
					consentCategories: ['necessary', 'marketing'], // Optional: Specify which consent categories to show in the banner. 
          overrides: {
            country: 'GB', // Useful for development to always view the banner.
          }
        }`;
			}

			if (useEnvFile) {
				return `{
					mode: 'c15t',
					backendURL: process.env.NEXT_PUBLIC_C15T_URL!,
					consentCategories: ['necessary', 'marketing'], // Optional: Specify which consent categories to show in the banner. 
          overrides: {
            country: 'GB', // Useful for development to always view the banner.
          }
        }`;
			}

			return `{
				mode: 'c15t',
				backendURL: '${backendURL || 'https://your-instance.c15t.dev'}',
				consentCategories: ['necessary', 'marketing'], // Optional: Specify which consent categories to show in the banner. 
        overrides: {
          country: 'GB', // Useful for development to always view the banner.
        }
      }`;
		}
		case 'custom':
			return `{
				mode: 'custom',
				endpointHandlers: createCustomHandlers(),
			}`;
		default:
			return `{
				mode: 'offline',
				consentCategories: ['necessary', 'marketing'], // Optional: Specify which consent categories to show in the banner. 
			}`;
	}
}

/**
 * Gets the required base imports for ConsentManagerProvider
 *
 * @returns Array of import names needed for basic consent management
 */
export function getBaseImports(): string[] {
	return ['CookieBanner', 'ConsentManagerDialog'];
}

/**
 * Gets additional imports needed for custom mode
 *
 * @returns Array of import configurations for custom handlers
 */
export function getCustomModeImports(): Array<{
	namedImports: string[];
	moduleSpecifier: string;
}> {
	return [
		{
			namedImports: ['createCustomHandlers'],
			moduleSpecifier: './consent-handlers',
		},
	];
}
