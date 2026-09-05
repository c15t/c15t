/* oxlint-disable func-style, no-use-before-define -- Function hoisting keeps the public script generators in API order. */
/**
 * Script generation utilities
 * Generates import statements and configuration for selected c15t scripts
 */

/**
 * Code-generation snippet for one built-in script integration.
 */
interface ScriptSnippet {
	/** Named export of the `@c15t/scripts/<subpath>` module. */
	importName: string;
	/** Example call with the vendor's real required options. */
	example: string;
}

/**
 * Canonical import names and example calls for every built-in integration,
 * keyed by package subpath. The naive camelCase + `{ id }` template produced
 * broken output for most vendors (wrong export names like `microsoftClarity`
 * instead of `clarity`, and wrong option names like `id` instead of
 * `writeKey`), so each vendor declares its snippet explicitly.
 *
 * `scripts-snippets.test.ts` fails when a registry vendor is missing here.
 */
export const SCRIPT_SNIPPETS: Record<string, ScriptSnippet> = {
	'adobe-analytics': {
		example:
			"adobeAnalytics({ scriptUrl: 'https://assets.adobedtm.com/YOUR_ORG/YOUR_PROPERTY/launch-production.min.js' })",
		importName: 'adobeAnalytics',
	},
	'ahrefs-analytics': {
		example: "ahrefsAnalytics({ key: 'YOUR_ANALYTICS_KEY' })",
		importName: 'ahrefsAnalytics',
	},
	amplitude: {
		example: "amplitude({ apiKey: 'YOUR_API_KEY' })",
		importName: 'amplitude',
	},
	clearbit: {
		example: "clearbit({ publishableKey: 'pk_XXXXXXXXXX' })",
		importName: 'clearbit',
	},
	'cloudflare-web-analytics': {
		example: "cloudflareWebAnalytics({ token: 'YOUR_BEACON_TOKEN' })",
		importName: 'cloudflareWebAnalytics',
	},
	crisp: {
		example: "crisp({ websiteId: 'YOUR_WEBSITE_ID' })",
		importName: 'crisp',
	},
	databuddy: {
		example: "databuddy({ clientId: 'YOUR_CLIENT_ID' })",
		importName: 'databuddy',
	},
	'fathom-analytics': {
		example: "fathomAnalytics({ site: 'YOUR_SITE_ID' })",
		importName: 'fathomAnalytics',
	},
	'google-tag': {
		example: "gtag({ id: 'G-XXXXXXXXXX', category: 'measurement' })",
		importName: 'gtag',
	},
	'google-tag-manager': {
		example: "googleTagManager({ id: 'GTM-XXXXXX' })",
		importName: 'googleTagManager',
	},
	heap: {
		example: "heap({ envId: 'YOUR_ENV_ID' })",
		importName: 'heap',
	},
	hightouch: {
		example: "hightouch({ writeKey: 'YOUR_WRITE_KEY' })",
		importName: 'hightouch',
	},
	hotjar: {
		example: 'hotjar({ siteId: 1234567 })',
		importName: 'hotjar',
	},
	intercom: {
		example: "intercom({ appId: 'YOUR_APP_ID' })",
		importName: 'intercom',
	},
	'linkedin-insights': {
		example: "linkedinInsights({ id: 'XXXXXXX' })",
		importName: 'linkedinInsights',
	},
	logrocket: {
		example: "logRocket({ appId: 'org-slug/app-slug' })",
		importName: 'logRocket',
	},
	'matomo-analytics': {
		example:
			"matomoAnalytics({ matomoUrl: 'https://analytics.example.com', siteId: 1 })",
		importName: 'matomoAnalytics',
	},
	'meta-pixel': {
		example: "metaPixel({ pixelId: 'XXXXXXXXXXXXXXX' })",
		importName: 'metaPixel',
	},
	'microsoft-clarity': {
		example: "clarity({ id: 'YOUR_PROJECT_ID' })",
		importName: 'clarity',
	},
	'microsoft-uet': {
		example: "microsoftUet({ id: 'XXXXXXXXX' })",
		importName: 'microsoftUet',
	},
	'mixpanel-analytics': {
		example: "mixpanelAnalytics({ token: 'YOUR_32_CHAR_PROJECT_TOKEN' })",
		importName: 'mixpanelAnalytics',
	},
	pirsch: {
		example: "pirsch({ identificationCode: 'YOUR_IDENTIFICATION_CODE' })",
		importName: 'pirsch',
	},
	'plausible-analytics': {
		example: "plausibleAnalytics({ domain: 'example.com' })",
		importName: 'plausibleAnalytics',
	},
	posthog: {
		example: "posthog({ id: 'phc_XXXXXXXXXX' })",
		importName: 'posthog',
	},
	promptwatch: {
		example: "promptwatch({ projectId: 'YOUR_PROJECT_ID' })",
		importName: 'promptwatch',
	},
	'reddit-pixel': {
		example: "redditPixel({ pixelId: 't2_XXXXXXX' })",
		importName: 'redditPixel',
	},
	rudderstack: {
		example:
			"rudderstack({ writeKey: 'YOUR_WRITE_KEY', dataPlaneUrl: 'https://your-dataplane.example.com' })",
		importName: 'rudderstack',
	},
	'rybbit-analytics': {
		example: "rybbitAnalytics({ siteId: 'YOUR_SITE_ID' })",
		importName: 'rybbitAnalytics',
	},
	segment: {
		example: "segment({ writeKey: 'YOUR_WRITE_KEY' })",
		importName: 'segment',
	},
	'snapchat-pixel': {
		example: "snapchatPixel({ pixelId: 'XXXXXXXXXXXXXXX' })",
		importName: 'snapchatPixel',
	},
	'tiktok-pixel': {
		example: "tiktokPixel({ pixelId: 'XXXXXXXXXXXXXXXXX' })",
		importName: 'tiktokPixel',
	},
	'umami-analytics': {
		example: "umamiAnalytics({ websiteId: 'YOUR_WEBSITE_ID' })",
		importName: 'umamiAnalytics',
	},
	'vercel-analytics': {
		example: 'vercelAnalytics({})',
		importName: 'vercelAnalytics',
	},
	'x-pixel': {
		example: "xPixel({ pixelId: 'oXXXX' })",
		importName: 'xPixel',
	},
};

/**
 * Converts a script name to camelCase for import usage. Fallback for scripts
 * without a snippet entry; prefer {@link SCRIPT_SNIPPETS}.
 *
 * @param scriptName - The script name (e.g., 'google-tag-manager')
 * @returns The camelCase version (e.g., 'googleTagManager')
 */
export function toCamelCase(scriptName: string): string {
	return scriptName.replace(/-(?<letter>[a-z])/gu, (_, letter) =>
		letter.toUpperCase()
	);
}

function getSnippet(scriptName: string): ScriptSnippet {
	const snippet = SCRIPT_SNIPPETS[scriptName];
	if (snippet) {
		return snippet;
	}

	return {
		example: `${toCamelCase(scriptName)}({ /* TODO: configure ${scriptName} */ })`,
		importName: toCamelCase(scriptName),
	};
}

/**
 * Generates the import statements for selected scripts
 * Each script uses a subpath import from @c15t/scripts
 *
 * @param selectedScripts - Array of script names to import
 * @returns The import statements string, or empty string if no scripts
 *
 * @example
 * ```ts
 * generateScriptsImport(['google-tag-manager', 'microsoft-clarity']);
 * // Returns:
 * // "import { googleTagManager } from '@c15t/scripts/google-tag-manager';
 * //  import { clarity } from '@c15t/scripts/microsoft-clarity';"
 * ```
 */
export function generateScriptsImport(selectedScripts: string[]): string {
	if (!selectedScripts.length) {
		return '';
	}

	return selectedScripts
		.map(
			(script) =>
				`import { ${getSnippet(script).importName} } from '@c15t/scripts/${script}';`
		)
		.join('\n');
}

/**
 * Generates the scripts configuration array for `ConsentProvider` options.
 *
 * @param selectedScripts - Array of script names to configure
 * @returns The scripts configuration string, or empty string if no scripts
 *
 * @remarks
 * Each script is rendered with its real required option names and placeholder
 * values for the user to replace.
 *
 * @example
 * ```ts
 * generateScriptsConfig(['google-tag-manager', 'segment']);
 * // Returns:
 * // "scripts: [
 * //   googleTagManager({ id: 'GTM-XXXXXX' }),
 * //   segment({ writeKey: 'YOUR_WRITE_KEY' }),
 * // ],"
 * ```
 */
export function generateScriptsConfig(selectedScripts: string[]): string {
	if (!selectedScripts.length) {
		return '';
	}

	return `scripts: ${generateScriptsArrayValue(selectedScripts)},`;
}

/** Generates an array expression for framework adapters with a scripts prop. */
export function generateScriptsArrayValue(
	selectedScripts: string[],
	indentation = '\t\t\t\t'
): string {
	const scriptConfigs = selectedScripts.map(
		(script) => getSnippet(script).example
	);

	return `[\n${indentation}\t${scriptConfigs.join(`,\n${indentation}\t`)},\n${indentation}]`;
}

/**
 * Generates a comment block showing example script configuration
 * Used when no scripts are selected but user might want to add them later
 *
 * @returns A comment block with example script usage
 */
export function generateScriptsCommentPlaceholder(): string {
	return `// Add your scripts here:
				// import { googleTagManager } from '@c15t/scripts/google-tag-manager';
				// scripts: [
				//   googleTagManager({ id: 'GTM-XXXXXX' }),
				// ],`;
}
