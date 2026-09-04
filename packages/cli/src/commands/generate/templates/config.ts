/**
 * Configuration file templates
 */

import { STORAGE_MODES } from '../../../constants';

/**
 * Offline/browser-only mode config
 */
const generateOfflineConfig = function generateOfflineConfig(
	enableDevTools = false
): string {
	const devToolsImport = enableDevTools
		? "import { createDevTools } from '@c15t/dev-tools';\n"
		: '';

	return `import { createConsentKernel, createOfflineTransport } from 'c15t';
${devToolsImport}
export const kernel = createConsentKernel({
	transport: createOfflineTransport(),
});

void kernel.commands.init();
${enableDevTools ? 'createDevTools({ kernel });\n' : ''}
/**
 * Usage Examples
 **/

// View all consents
// kernel.getSnapshot().consents;

// Update consent locally before saving
// kernel.set.consent({ measurement: true });

// Save the current choices
// await kernel.commands.save('custom');
`;
};

/**
 * Hosted mode config (inth.com or self-hosted backend)
 */
const generateHostedConfig = function generateHostedConfig(
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

	return `import { createConsentKernel, createHostedTransport } from 'c15t';
${devToolsImport}
export const kernel = createConsentKernel({
	transport: createHostedTransport({ backendURL: ${url} }),
});

void kernel.commands.init();
${enableDevTools ? 'createDevTools({ kernel });\n' : ''}
/**
 * Usage Examples
 **/

// View all consents
// kernel.getSnapshot().consents;

// Update consent locally before saving
// kernel.set.consent({ measurement: true });

// Save the current choices
// await kernel.commands.save('custom');
`;
};

/**
 * Custom backend mode config
 */
const generateCustomConfig = function generateCustomConfig(
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

	return `import { createConsentKernel, type KernelTransport } from 'c15t';
${devToolsImport}
const transport: KernelTransport = {
	async init() {
			const response = await fetch(${url});
			return response.json();
	},
	async save(payload) {
			const response = await fetch(${url}, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			return response.json();
	},
};

export const kernel = createConsentKernel({ transport });

void kernel.commands.init();
${enableDevTools ? 'createDevTools({ kernel });\n' : ''}
/**
 * Usage Examples
 **/

// View all consents
// kernel.getSnapshot().consents;

// Update consent locally before saving
// kernel.set.consent({ measurement: true });

// Save the current choices
// await kernel.commands.save('custom');
`;
};

/**
 * Self-hosted mode config
 */
const generateSelfHostedConfig = function generateSelfHostedConfig(
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

	return `import { createConsentKernel, createHostedTransport } from 'c15t';
${devToolsImport}
export const kernel = createConsentKernel({
	transport: createHostedTransport({ backendURL: ${url} }),
});

void kernel.commands.init();
${enableDevTools ? 'createDevTools({ kernel });\n' : ''}
/**
 * Usage Examples
 **/

// View all consents
// kernel.getSnapshot().consents;

// Update consent locally before saving
// kernel.set.consent({ measurement: true });

// Save the current choices
// await kernel.commands.save('custom');
`;
};

/**
 * Generate the consent manager configuration based on storage mode
 *
 * @param mode - The storage mode
 * @param backendURL - URL for the c15t backend/API
 * @param useEnvFile - Whether to use environment variable for backendURL
 * @returns The generated configuration file content
 */
export const generateClientConfigContent = function generateClientConfigContent(
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
};
