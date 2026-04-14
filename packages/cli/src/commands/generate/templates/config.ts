/**
 * Configuration file templates
 */

import { STORAGE_MODES } from '../../../constants';

/**
 * Generate the consent manager configuration based on storage mode
 *
 * @param mode - The storage mode
 * @param backendURL - URL for the c15t backend/API
 * @param useEnvFile - Whether to use environment variable for backendURL
 * @returns The generated configuration file content
 */
export function generateClientConfigContent(
	mode: string,
	backendURL?: string,
	useEnvFile?: boolean,
	enableDevTools = false
): string {
	switch (mode) {
		case STORAGE_MODES.HOSTED:
		case STORAGE_MODES.C15T:
			return generateHostedConfig(backendURL, useEnvFile, enableDevTools);
		case STORAGE_MODES.OFFLINE:
			return generateOfflineConfig(enableDevTools);
		case STORAGE_MODES.SELF_HOSTED:
			return generateSelfHostedConfig(backendURL, useEnvFile, enableDevTools);
		case STORAGE_MODES.CUSTOM:
			return generateCustomConfig(backendURL, useEnvFile, enableDevTools);
		default:
			return generateOfflineConfig(enableDevTools);
	}
}

/**
 * Hosted mode config (inth.com or self-hosted backend)
 */
function generateHostedConfig(
	backendURL?: string,
	useEnvFile?: boolean,
	enableDevTools = false
): string {
	const url = useEnvFile
		? 'process.env.NEXT_PUBLIC_C15T_URL'
		: `'${backendURL || 'https://your-project.inth.app'}'`;
	const devToolsImport = enableDevTools
		? "import { createDevTools } from '@c15t/dev-tools';\n"
		: '';
	const devToolsCall = enableDevTools ? 'createDevTools();\n' : '';

	return `import { getOrCreateConsentRuntime } from 'c15t';
${devToolsImport}
const runtime = getOrCreateConsentRuntime(
	{
		mode: 'hosted',
		backendURL: ${url},
		consentCategories: ['necessary', 'measurement', 'marketing'],
	},
);

export const store = runtime.consentStore;
${devToolsCall}
/**
 * Usage Examples
 **/

// View all consents
// store.getState().consents;

// Update a single consent type: (does not save automically, allowing you to batch updates together before saving)
// store.getState().setSelectedConsent('measurement', true);

// Update a single consent type and automically saves it
// store.getState().setConsent('marketing', true);

// When a user rejects all consents:
// store.getState().saveConsents("necessary")
`;
}

/**
 * Offline/browser-only mode config
 */
function generateOfflineConfig(enableDevTools = false): string {
	const devToolsImport = enableDevTools
		? "import { createDevTools } from '@c15t/dev-tools';\n"
		: '';
	const devToolsCall = enableDevTools ? 'createDevTools();\n' : '';

	return `import { getOrCreateConsentRuntime } from 'c15t';
${devToolsImport}
const runtime = getOrCreateConsentRuntime(
	{
		mode: 'offline',
		consentCategories: ['necessary', 'measurement', 'marketing'],
	},
);

export const store = runtime.consentStore;
${devToolsCall}
/**
 * Usage Examples
 **/

// View all consents
// store.getState().consents;

// Update a single consent type: (does not save automically, allowing you to batch updates together before saving)
// store.getState().setSelectedConsent('measurement', true);

// Update a single consent type and automically saves it
// store.getState().setConsent('marketing', true);

// When a user rejects all consents:
// store.getState().saveConsents("necessary")
`;
}

/**
 * Self-hosted mode config
 */
function generateSelfHostedConfig(
	backendURL?: string,
	useEnvFile?: boolean,
	enableDevTools = false
): string {
	const url = useEnvFile
		? 'process.env.NEXT_PUBLIC_C15T_URL'
		: `'${backendURL || 'http://localhost:3001'}'`;
	const devToolsImport = enableDevTools
		? "import { createDevTools } from '@c15t/dev-tools';\n"
		: '';
	const devToolsCall = enableDevTools ? 'createDevTools();\n' : '';

	return `import { getOrCreateConsentRuntime } from 'c15t';
${devToolsImport}
const runtime = getOrCreateConsentRuntime(
	{
		mode: 'hosted',
		backendURL: ${url},
		consentCategories: ['necessary', 'measurement', 'marketing'],
	},
);

export const store = runtime.consentStore;
${devToolsCall}
/**
 * Usage Examples
 **/

// View all consents
// store.getState().consents;

// Update a single consent type: (does not save automically, allowing you to batch updates together before saving)
// store.getState().setSelectedConsent('measurement', true);

// Update a single consent type and automically saves it
// store.getState().setConsent('marketing', true);

// When a user rejects all consents:
// store.getState().saveConsents("necessary")
`;
}

/**
 * Custom backend mode config
 */
function generateCustomConfig(
	backendURL?: string,
	useEnvFile?: boolean,
	enableDevTools = false
): string {
	const url = useEnvFile
		? 'process.env.NEXT_PUBLIC_CONSENT_API_URL'
		: `'${backendURL || '/api/consent'}'`;
	const devToolsImport = enableDevTools
		? "import { createDevTools } from '@c15t/dev-tools';\n"
		: '';
	const devToolsCall = enableDevTools ? 'createDevTools();\n' : '';

	return `import { getOrCreateConsentRuntime, type EndpointHandlers } from 'c15t';
${devToolsImport}
function createCustomHandlers(): EndpointHandlers {
	return {
		async getConsent() {
			const response = await fetch(${url});
			return response.json();
		},
		async setConsent(consent) {
			const response = await fetch(${url}, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(consent),
			});
			return response.json();
		},
	};
}

const runtime = getOrCreateConsentRuntime(
	{
		mode: 'custom',
		endpointHandlers: createCustomHandlers(),
		consentCategories: ['necessary', 'measurement', 'marketing'],
	},
);

export const store = runtime.consentStore;
${devToolsCall}
/**
 * Usage Examples
 **/

// View all consents
// store.getState().consents;

// Update a single consent type: (does not save automically, allowing you to batch updates together before saving)
// store.getState().setSelectedConsent('measurement', true);

// Update a single consent type and automically saves it
// store.getState().setConsent('marketing', true);

// When a user rejects all consents:
// store.getState().saveConsents("necessary")
`;
}
