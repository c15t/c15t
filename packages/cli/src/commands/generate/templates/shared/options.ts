/**
 * Shared template configuration generators
 * These functions generate template configuration content for different storage modes
 * Used by both App Directory and Pages Directory implementations
 */

/**
 * Gets the backend URL value for templates based on configuration
 *
 * @param backendURL - The raw backend URL
 * @param useEnvFile - Whether to use environment variable
 * @param proxyNextjs - Whether to use Next.js proxy
 * @returns The backend URL value as a string (quoted literal or env var expression)
 *
 * @example
 * ```ts
 * // With proxy
 * getBackendURLValue('https://api.example.com', false, true);
 * // Returns: '"/api/c15t"'
 *
 * // With env file
 * getBackendURLValue('https://api.example.com', true, false);
 * // Returns: 'process.env.NEXT_PUBLIC_C15T_URL!'
 *
 * // Direct URL
 * getBackendURLValue('https://api.example.com', false, false);
 * // Returns: '"https://api.example.com"'
 * ```
 */
export function getBackendURLValue(
	backendURL?: string,
	useEnvFile?: boolean,
	proxyNextjs?: boolean
): string {
	if (proxyNextjs) {
		return '"/api/c15t"';
	}

	if (useEnvFile) {
		return 'process.env.NEXT_PUBLIC_C15T_URL!';
	}

	return `'${backendURL || 'https://your-instance.c15t.dev'}'`;
}

/**
 * Generates the inner options text for ConsentManagerProvider based on mode and configuration
 *
 * @param mode - The storage mode ('c15t', 'offline', or 'custom')
 * @param backendURL - URL for the c15t backend/API (for 'c15t' mode)
 * @param useEnvFile - Whether to use environment variable for backendURL
 * @param proxyNextjs - Whether to use Next.js API proxy for c15t mode
 * @returns The formatted options content (without outer braces) as a string
 *
 * @remarks
 * This returns the inner content of the options object, suitable for embedding
 * in template literals. The outer braces and additional options like `ssrData`
 * are added by the template generators.
 *
 * @example
 * ```ts
 * const options = generateOptionsText('c15t', 'https://api.example.com', false, true);
 * // Returns: "mode: 'c15t',\n\t\t\t\tbackendURL: '/api/c15t', ..."
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
			const backendURLValue = getBackendURLValue(
				backendURL,
				useEnvFile,
				proxyNextjs
			);
			return `mode: 'c15t',
				backendURL: ${backendURLValue},`;
		}
		case 'custom':
			return `mode: 'custom',
				endpointHandlers: createCustomHandlers(),`;
		default:
			return `mode: 'offline',`;
	}
}

/**
 * Generates the options text with outer braces (for inline usage)
 *
 * @deprecated Use generateOptionsText for new templates that separate server/client
 * @param mode - The storage mode
 * @param backendURL - URL for the c15t backend/API
 * @param useEnvFile - Whether to use environment variable
 * @param proxyNextjs - Whether to use Next.js API proxy
 * @returns The formatted options object as a string with braces
 */
export function generateOptionsTextWithBraces(
	mode: string,
	backendURL?: string,
	useEnvFile?: boolean,
	proxyNextjs?: boolean
): string {
	const innerOptions = generateOptionsText(
		mode,
		backendURL,
		useEnvFile,
		proxyNextjs
	);
	return `{
				${innerOptions}
			}`;
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
