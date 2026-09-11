import type { DevelopmentEnvironment } from '~/context/framework-detection';

import { STORAGE_MODES } from '../../../constants';
import { getEnvVarPrefix } from './env';
/**
 * Configuration file templates
 */
import { DEFAULT_OFFLINE_RULES } from './shared/options';
import {
	generateScriptsImport,
	generateScriptsArrayValue,
} from './shared/scripts';

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
	transport: createOfflineTransport({ policyRules: ${DEFAULT_OFFLINE_RULES} }),
});

void kernel.commands.init();
${enableDevTools ? 'createDevTools({ kernel });\n' : ''}
/**
 * Usage Examples
 **/

// Read the permissions currently applied to processing
// kernel.getSnapshot().effectivePermissions;

// Confirm only the category the visitor chose
// await kernel.commands.save({ measurement: true });
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
		: JSON.stringify(backendURL || 'https://your-project.inth.app');
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

// Read the permissions currently applied to processing
// kernel.getSnapshot().effectivePermissions;

// Confirm only the category the visitor chose
// await kernel.commands.save({ measurement: true });
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
		: JSON.stringify(backendURL || '/api/consent');
	const devToolsImport = enableDevTools
		? "import { createDevTools } from '@c15t/dev-tools';\n"
		: '';

	return `import { createConsentKernel, type KernelTransport } from 'c15t';
${devToolsImport}
const transport: KernelTransport = {
	async init() {
			const response = await fetch(${url}, { headers: { 'x-c15t-policy-contract': '1' } });
			if (!response.ok) throw new Error('Consent initialization failed');
			return response.json();
	},
	async save(payload) {
			const response = await fetch(${url}, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'x-c15t-policy-contract': '1' },
				body: JSON.stringify(payload),
			});
			if (!response.ok) throw new Error('Consent save failed');
			return response.json();
	},
};

export const kernel = createConsentKernel({ transport });

void kernel.commands.init();
${enableDevTools ? 'createDevTools({ kernel });\n' : ''}
/**
 * Usage Examples
 **/

// Read the permissions currently applied to processing
// kernel.getSnapshot().effectivePermissions;

// Confirm only the category the visitor chose
// await kernel.commands.save({ measurement: true });
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
		: JSON.stringify(backendURL || 'http://localhost:3001');
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

// Read the permissions currently applied to processing
// kernel.getSnapshot().effectivePermissions;

// Confirm only the category the visitor chose
// await kernel.commands.save({ measurement: true });
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
const generateBaseConfig = function generateBaseConfig(
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

/** Generates the browser kernel and selected script loader configuration. */
export const generateClientConfigContent = function generateClientConfigContent(
	mode: string,
	backendURL?: string,
	useEnvFile?: boolean,
	enableDevTools = false,
	environment?: DevelopmentEnvironment,
	selectedScripts: string[] = []
): string {
	let content = generateBaseConfig(
		mode,
		backendURL,
		useEnvFile,
		enableDevTools
	);
	const prefix = getEnvVarPrefix('c15t', environment);
	content = content.replaceAll(
		'process.env.NEXT_PUBLIC_',
		environment === 'vite' ? 'import.meta.env.VITE_' : `process.env.${prefix}_`
	);
	if (selectedScripts.length) {
		content = `import { createScriptLoader } from 'c15t/modules/script-loader';\n${generateScriptsImport(selectedScripts)}\n${content}`;
		content = content.replace(
			'void kernel.commands.init();',
			`export const scriptLoader = createScriptLoader({ kernel, scripts: ${generateScriptsArrayValue(selectedScripts, '\t')} });\n\nvoid kernel.commands.init();`
		);
	}
	return content;
};
