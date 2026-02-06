/**
 * Configuration file templates
 */

import { STORAGE_MODES, type StorageMode } from '../../../constants';
import type { GenerateOptions } from '../../../types';

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
	useEnvFile?: boolean
): string {
	switch (mode) {
		case STORAGE_MODES.C15T:
			return generateC15tConfig(backendURL, useEnvFile);
		case STORAGE_MODES.OFFLINE:
			return generateOfflineConfig();
		case STORAGE_MODES.SELF_HOSTED:
			return generateSelfHostedConfig(backendURL, useEnvFile);
		case STORAGE_MODES.CUSTOM:
			return generateCustomConfig(backendURL, useEnvFile);
		default:
			return generateOfflineConfig();
	}
}

/**
 * c15t cloud mode config
 */
function generateC15tConfig(backendURL?: string, useEnvFile?: boolean): string {
	const url = useEnvFile
		? 'process.env.NEXT_PUBLIC_C15T_URL'
		: `'${backendURL || 'https://your-instance.c15t.dev'}'`;

	return `import {
	type ConsentManagerOptions,
	configureConsentManager,
	createConsentManagerStore
} from 'c15t';

/**
 * c15t Cloud Mode Configuration
 *
 * Consent data is stored securely on consent.io
 */
export const consentManager = configureConsentManager({
	mode: 'c15t',
	backendURL: ${url},
});

export const store = createConsentManagerStore(consentManager, {
	// Consent categories to show in the banner
	initialGdprTypes: ['necessary', 'analytics', 'marketing'],
});
`;
}

/**
 * Offline/browser-only mode config
 */
function generateOfflineConfig(): string {
	return `import {
	type ConsentManagerOptions,
	configureConsentManager,
	createConsentManagerStore
} from 'c15t';

/**
 * Browser-Only Mode Configuration
 *
 * Consent data is stored in browser cookies/localStorage
 * No server required - fully client-side
 */
export const consentManager = configureConsentManager({
	mode: 'offline',
});

export const store = createConsentManagerStore(consentManager, {
	// Consent categories to show in the banner
	initialGdprTypes: ['necessary', 'analytics', 'marketing'],
});
`;
}

/**
 * Self-hosted mode config
 */
function generateSelfHostedConfig(
	backendURL?: string,
	useEnvFile?: boolean
): string {
	const url = useEnvFile
		? 'process.env.NEXT_PUBLIC_C15T_URL'
		: `'${backendURL || 'http://localhost:3001'}'`;

	return `import {
	type ConsentManagerOptions,
	configureConsentManager,
	createConsentManagerStore
} from 'c15t';

/**
 * Self-Hosted Mode Configuration
 *
 * Run your own c15t backend server
 */
export const consentManager = configureConsentManager({
	mode: 'c15t', // Uses the same API as c15t cloud
	backendURL: ${url},
});

export const store = createConsentManagerStore(consentManager, {
	// Consent categories to show in the banner
	initialGdprTypes: ['necessary', 'analytics', 'marketing'],
});
`;
}

/**
 * Custom backend mode config
 */
function generateCustomConfig(
	backendURL?: string,
	useEnvFile?: boolean
): string {
	const url = useEnvFile
		? 'process.env.NEXT_PUBLIC_CONSENT_API_URL'
		: `'${backendURL || '/api/consent'}'`;

	return `import {
	type ConsentManagerOptions,
	configureConsentManager,
	createConsentManagerStore,
	type EndpointHandlers
} from 'c15t';

/**
 * Custom endpoint handlers
 * Implement these to connect to your existing consent API
 */
function createCustomHandlers(): EndpointHandlers {
	return {
		// Get current consent state
		async getConsent() {
			const response = await fetch(${url});
			return response.json();
		},
		// Save consent state
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

/**
 * Custom Backend Mode Configuration
 *
 * Connect to your existing consent management API
 */
export const consentManager = configureConsentManager({
	mode: 'custom',
	endpointHandlers: createCustomHandlers(),
});

export const store = createConsentManagerStore(consentManager, {
	// Consent categories to show in the banner
	initialGdprTypes: ['necessary', 'analytics', 'marketing'],
});
`;
}

/**
 * Get the config file path
 */
export function getConfigFilePath(): string {
	return 'c15t.config.ts';
}
