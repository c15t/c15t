/**
 * Shared template configuration generators
 * These functions generate template configuration content for different storage modes
 * Used by both App Directory and Pages Directory implementations
 */

import { detectFramework } from '~/context/framework-detection';

import { DEFAULT_OFFLINE_RULES } from '../../../../generate/options';
import { isTailwindV3 } from '../../../shared/postcss-config';

export { DEFAULT_OFFLINE_RULES } from '../../../../generate/options';

/**
 * Gets the backend URL value for templates based on configuration
 *
 * @param backendURL - The raw backend URL
 * @param proxyNextjs - Whether to use Next.js proxy
 * @returns The backend URL value as a quoted string literal
 *
 * @example
 * ```ts
 * // With proxy
 * getBackendURLValue('https://api.example.com', true);
 * // Returns: '"/api/c15t"'
 *
 * // Direct URL
 * getBackendURLValue('https://api.example.com', false);
 * // Returns: '"https://api.example.com"'
 * ```
 */
export const getBackendURLValue = function getBackendURLValue(
	backendURL?: string,
	proxyNextjs?: boolean
): string {
	if (proxyNextjs) {
		return '"/api/c15t"';
	}

	return JSON.stringify(backendURL || 'https://your-project.inth.app');
};

/**
 * Generates the inner options text for ConsentProvider based on mode and configuration
 *
 * @param mode - The storage mode ('hosted', 'self-hosted', 'offline', or 'custom')
 * @param backendURL - URL for the c15t backend/API (for 'hosted'/'self-hosted' modes)
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
 * const options = generateOptionsText('hosted', 'https://api.example.com', true);
 * // Returns: "mode: hosted({ backendURL: '/api/c15t' }),"
 * ```
 */
export const generateOptionsText = function generateOptionsText(
	mode: string,
	backendURL?: string,
	proxyNextjs?: boolean,
	_inlineCustomHandlers?: boolean
): string {
	switch (mode) {
		case 'hosted':
		case 'c15t':
		case 'self-hosted': {
			const backendURLValue = getBackendURLValue(backendURL, proxyNextjs);
			return `mode: hosted({ backendURL: ${backendURLValue} }),`;
		}
		case 'custom': {
			const url = JSON.stringify(backendURL || '/api/consent');

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

/**
 * Generates provider options for an existing app. Tailwind 3 uses the external
 * stylesheet so its PostCSS plugin can flatten c15t's named layers.
 * @param projectRoot - App root containing package.json.
 * @param mode - Consent transport mode.
 * @param backendURL - Backend URL for hosted or custom transports.
 * @param proxyNextjs - Whether browser requests use the Next.js proxy.
 * @returns Options with automatic styles disabled only for Tailwind 3.
 */
export const generateProjectOptionsText =
	async function generateProjectOptionsText(
		projectRoot: string,
		mode: string,
		backendURL?: string,
		proxyNextjs?: boolean
	): Promise<string> {
		const { tailwindVersion } = await detectFramework(projectRoot);
		const options = generateOptionsText(mode, backendURL, proxyNextjs);
		return isTailwindV3(tailwindVersion)
			? `${options}\nstyles: false,`
			: options;
	};
