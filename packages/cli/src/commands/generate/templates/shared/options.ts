/**
 * Shared template configuration generators
 * These functions generate template configuration content for different storage modes
 * Used by both App Directory and Pages Directory implementations
 */

/** Explicit starting rule for generated offline applications. */
export const DEFAULT_OFFLINE_RULES = `[{
				id: 'site-consent',
				match: { fallback: true },
				model: 'opt-in',
				prompt: 'choice',
				categories: ['functionality', 'measurement', 'experience', 'marketing'],
				scopeMode: 'strict',
			}]`;

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
export const getBackendURLValue = function getBackendURLValue(
	backendURL?: string,
	useEnvFile?: boolean,
	proxyNextjs?: boolean,
	envVarPrefix = 'NEXT_PUBLIC'
): string {
	if (proxyNextjs) {
		return '"/api/c15t"';
	}

	if (useEnvFile) {
		return `process.env.${envVarPrefix}_C15T_URL!`;
	}

	return `'${backendURL || 'https://your-project.inth.app'}'`;
};

/**
 * Generates the inner options text for ConsentProvider based on mode and configuration
 *
 * @param mode - The storage mode ('hosted', 'self-hosted', 'offline', or 'custom')
 * @param backendURL - URL for the c15t backend/API (for 'hosted'/'self-hosted' modes)
 * @param useEnvFile - Whether to use environment variable for backendURL
 * @param proxyNextjs - Whether to use Next.js API proxy for hosted mode
 * @param _inlineCustomHandlers - Reserved positional argument; custom transports are inline.
 * @returns The formatted options content (without outer braces) as a string
 *
 * @remarks
 * This returns the inner content of the options object, suitable for embedding
 * in template literals. The outer braces and additional options like `ssrData`
 * are added by the template generators.
 *
 * @example
 * ```ts
 * const options = generateOptionsText('hosted', 'https://api.example.com', false, true);
 * // Returns: "mode: hosted({ url: '/api/c15t' }),"
 * ```
 */
export const generateOptionsText = function generateOptionsText(
	mode: string,
	backendURL?: string,
	useEnvFile?: boolean,
	proxyNextjs?: boolean,
	_inlineCustomHandlers?: boolean,
	envVarPrefix = 'NEXT_PUBLIC'
): string {
	switch (mode) {
		case 'hosted':
		case 'c15t':
		case 'self-hosted': {
			const backendURLValue = getBackendURLValue(
				backendURL,
				useEnvFile,
				proxyNextjs,
				envVarPrefix
			);
			return `mode: hosted({ url: ${backendURLValue} }),`;
		}
		case 'custom': {
			const url = useEnvFile
				? `process.env.${envVarPrefix}_CONSENT_API_URL`
				: `'${backendURL || '/api/consent'}'`;
			return `mode: custom({
				async init() {
					const res = await fetch(${url}, {
						headers: { 'x-c15t-policy-contract': '1' },
					});
					if (!res.ok) throw new Error('Consent initialization failed');
					return res.json();
				},
				async save(payload) {
					const res = await fetch(${url}, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'x-c15t-policy-contract': '1',
						},
						body: JSON.stringify(payload),
					});
					if (!res.ok) throw new Error('Consent save failed');
					return res.json();
				},
			}),`;
		}
		default:
			return `mode: offline({ policyRules: ${DEFAULT_OFFLINE_RULES} }),`;
	}
};
