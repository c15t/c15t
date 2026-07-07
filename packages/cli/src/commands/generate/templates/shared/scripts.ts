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
	'google-tag-manager': {
		importName: 'googleTagManager',
		example: "googleTagManager({ id: 'GTM-XXXXXX' })",
	},
	'google-tag': {
		importName: 'gtag',
		example: "gtag({ id: 'G-XXXXXXXXXX', category: 'measurement' })",
	},
	'ahrefs-analytics': {
		importName: 'ahrefsAnalytics',
		example: "ahrefsAnalytics({ key: 'YOUR_ANALYTICS_KEY' })",
	},
	'cloudflare-web-analytics': {
		importName: 'cloudflareWebAnalytics',
		example: "cloudflareWebAnalytics({ token: 'YOUR_BEACON_TOKEN' })",
	},
	'microsoft-clarity': {
		importName: 'clarity',
		example: "clarity({ id: 'YOUR_PROJECT_ID' })",
	},
	databuddy: {
		importName: 'databuddy',
		example: "databuddy({ clientId: 'YOUR_CLIENT_ID' })",
	},
	'fathom-analytics': {
		importName: 'fathomAnalytics',
		example: "fathomAnalytics({ site: 'YOUR_SITE_ID' })",
	},
	'mixpanel-analytics': {
		importName: 'mixpanelAnalytics',
		example: "mixpanelAnalytics({ token: 'YOUR_32_CHAR_PROJECT_TOKEN' })",
	},
	hotjar: {
		importName: 'hotjar',
		example: 'hotjar({ siteId: 1234567 })',
	},
	'matomo-analytics': {
		importName: 'matomoAnalytics',
		example:
			"matomoAnalytics({ matomoUrl: 'https://analytics.example.com', siteId: 1 })",
	},
	posthog: {
		importName: 'posthog',
		example: "posthog({ id: 'phc_XXXXXXXXXX' })",
	},
	promptwatch: {
		importName: 'promptwatch',
		example: "promptwatch({ projectId: 'YOUR_PROJECT_ID' })",
	},
	segment: {
		importName: 'segment',
		example: "segment({ writeKey: 'YOUR_WRITE_KEY' })",
	},
	'rybbit-analytics': {
		importName: 'rybbitAnalytics',
		example: "rybbitAnalytics({ siteId: 'YOUR_SITE_ID' })",
	},
	'plausible-analytics': {
		importName: 'plausibleAnalytics',
		example: "plausibleAnalytics({ domain: 'example.com' })",
	},
	'umami-analytics': {
		importName: 'umamiAnalytics',
		example: "umamiAnalytics({ websiteId: 'YOUR_WEBSITE_ID' })",
	},
	'vercel-analytics': {
		importName: 'vercelAnalytics',
		example: 'vercelAnalytics({})',
	},
	pirsch: {
		importName: 'pirsch',
		example: "pirsch({ identificationCode: 'YOUR_IDENTIFICATION_CODE' })",
	},
	clearbit: {
		importName: 'clearbit',
		example: "clearbit({ publishableKey: 'pk_XXXXXXXXXX' })",
	},
	'adobe-analytics': {
		importName: 'adobeAnalytics',
		example:
			"adobeAnalytics({ scriptUrl: 'https://assets.adobedtm.com/YOUR_ORG/YOUR_PROPERTY/launch-production.min.js' })",
	},
	logrocket: {
		importName: 'logRocket',
		example: "logRocket({ appId: 'org-slug/app-slug' })",
	},
	hightouch: {
		importName: 'hightouch',
		example: "hightouch({ writeKey: 'YOUR_WRITE_KEY' })",
	},
	rudderstack: {
		importName: 'rudderstack',
		example:
			"rudderstack({ writeKey: 'YOUR_WRITE_KEY', dataPlaneUrl: 'https://your-dataplane.example.com' })",
	},
	amplitude: {
		importName: 'amplitude',
		example: "amplitude({ apiKey: 'YOUR_API_KEY' })",
	},
	heap: {
		importName: 'heap',
		example: "heap({ envId: 'YOUR_ENV_ID' })",
	},
	crisp: {
		importName: 'crisp',
		example: "crisp({ websiteId: 'YOUR_WEBSITE_ID' })",
	},
	intercom: {
		importName: 'intercom',
		example: "intercom({ appId: 'YOUR_APP_ID' })",
	},
	'meta-pixel': {
		importName: 'metaPixel',
		example: "metaPixel({ pixelId: 'XXXXXXXXXXXXXXX' })",
	},
	'reddit-pixel': {
		importName: 'redditPixel',
		example: "redditPixel({ pixelId: 't2_XXXXXXX' })",
	},
	'tiktok-pixel': {
		importName: 'tiktokPixel',
		example: "tiktokPixel({ pixelId: 'XXXXXXXXXXXXXXXXX' })",
	},
	'linkedin-insights': {
		importName: 'linkedinInsights',
		example: "linkedinInsights({ id: 'XXXXXXX' })",
	},
	'microsoft-uet': {
		importName: 'microsoftUet',
		example: "microsoftUet({ id: 'XXXXXXXXX' })",
	},
	'snapchat-pixel': {
		importName: 'snapchatPixel',
		example: "snapchatPixel({ pixelId: 'XXXXXXXXXXXXXXX' })",
	},
	'x-pixel': {
		importName: 'xPixel',
		example: "xPixel({ pixelId: 'oXXXX' })",
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
	return scriptName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function getSnippet(scriptName: string): ScriptSnippet {
	const snippet = SCRIPT_SNIPPETS[scriptName];
	if (snippet) {
		return snippet;
	}

	return {
		importName: toCamelCase(scriptName),
		example: `${toCamelCase(scriptName)}({ /* TODO: configure ${scriptName} */ })`,
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
	if (!selectedScripts.length) return '';

	return selectedScripts
		.map(
			(script) =>
				`import { ${getSnippet(script).importName} } from '@c15t/scripts/${script}';`
		)
		.join('\n');
}

/**
 * Generates the scripts configuration array for ConsentManagerProvider options
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
	if (!selectedScripts.length) return '';

	const scriptConfigs = selectedScripts.map(
		(script) => getSnippet(script).example
	);

	return `scripts: [
					${scriptConfigs.join(',\n\t\t\t\t\t')},
				],`;
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
