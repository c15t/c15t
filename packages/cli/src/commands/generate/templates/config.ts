import { STORAGE_MODES } from '../../../constants';
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

	return `import { baseTranslations } from '@c15t/translations/all';
import {
	createConsentKernel,
	createOfflineTransport,
	resolveLocalTranslations,
} from 'c15t';
${devToolsImport}
export const kernel = createConsentKernel({
	transport: createOfflineTransport({
		policyRules: ${DEFAULT_OFFLINE_RULES},
		// Serve c15t's bundled copy for a language set later with
		// kernel.set.language(). To change wording, add your messages, such
		// as { ...baseTranslations, de: { cookieBanner: { title: '...' } } };
		// keys you leave out keep the bundled copy.
		translationsFor: (language) =>
			resolveLocalTranslations(language, baseTranslations),
	}),
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
	enableDevTools = false
): string {
	const url = JSON.stringify(backendURL || 'https://your-project.inth.app');
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
	enableDevTools = false
): string {
	const url = JSON.stringify(backendURL || '/api/consent');
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
	enableDevTools = false
): string {
	const url = JSON.stringify(backendURL || 'http://localhost:3001');
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

const BACKEND_CONFIG_MODES: ReadonlySet<string> = new Set([
	STORAGE_MODES.C15T,
	STORAGE_MODES.CUSTOM,
	STORAGE_MODES.HOSTED,
	STORAGE_MODES.SELF_HOSTED,
]);

/**
 * Packages the generated client config imports besides `c15t`. Every mode
 * without a backend gets the offline config, which imports the bundled
 * translations.
 *
 * @param mode - The storage mode, or `null` when none was chosen.
 * @returns Package names to install next to `c15t`.
 */
export const getClientConfigDependencies = function getClientConfigDependencies(
	mode: string | null
): string[] {
	return mode !== null && BACKEND_CONFIG_MODES.has(mode)
		? []
		: ['@c15t/translations'];
};

/**
 * Generate the consent manager configuration based on storage mode
 *
 * @param mode - The storage mode
 * @param backendURL - URL for the c15t backend/API
 * @returns The generated configuration file content
 */
const generateBaseConfig = function generateBaseConfig(
	mode: string,
	backendURL?: string,
	enableDevTools = false
): string {
	switch (mode) {
		case STORAGE_MODES.HOSTED:
		case STORAGE_MODES.C15T:
			return generateHostedConfig(backendURL, enableDevTools);
		case STORAGE_MODES.OFFLINE:
			return generateOfflineConfig(enableDevTools);
		case STORAGE_MODES.SELF_HOSTED:
			return generateSelfHostedConfig(backendURL, enableDevTools);
		case STORAGE_MODES.CUSTOM:
			return generateCustomConfig(backendURL, enableDevTools);
		default:
			return generateOfflineConfig(enableDevTools);
	}
};

/** Generates the browser kernel and selected script loader configuration. */
export const generateClientConfigContent = function generateClientConfigContent(
	mode: string,
	backendURL?: string,
	enableDevTools = false,
	selectedScripts: string[] = []
): string {
	let content = generateBaseConfig(mode, backendURL, enableDevTools);
	if (selectedScripts.length) {
		content = `import { createScriptLoader } from 'c15t/modules/script-loader';\n${generateScriptsImport(selectedScripts)}\n${content}`;
		content = content.replace(
			'void kernel.commands.init();',
			`export const scriptLoader = createScriptLoader({ kernel, scripts: ${generateScriptsArrayValue(selectedScripts, '\t')} });\n\nvoid kernel.commands.init();`
		);
	}
	return content;
};
