/* oxlint-disable func-style, no-use-before-define -- Function hoisting keeps the public script generators in API order. */
/**
 * Script generation utilities
 * Generates import statements and configuration for selected c15t scripts
 */

/**
 * Code-generation snippet for one built-in script integration.
 */
interface ScriptSnippet {
	/** Named export of the `@c15t/integrations/<subpath>` module. */
	importName: string;
	/**
	 * Example call with the vendor's real required options. A multi-line
	 * example indents with tabs from column 0; generation re-indents it.
	 */
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
	ada: { example: "ada({ handle: 'YOUR_ADA_HANDLE' })", importName: 'ada' },
	'adobe-analytics': {
		example:
			"adobeAnalytics({ scriptUrl: 'https://assets.adobedtm.com/YOUR_ORG/YOUR_PROPERTY/launch-production.min.js' })",
		importName: 'adobeAnalytics',
	},
	'adobe-target': {
		example: "adobeTarget({ mode: 'atjs', scriptUrl: '/scripts/at.js' })",
		importName: 'adobeTarget',
	},
	adroll: {
		example:
			"adrollPixel({ advertiserId: 'ADVERTISER_ID', pixelId: 'PIXEL_ID' })",
		importName: 'adrollPixel',
	},
	'ahrefs-analytics': {
		example: "ahrefsAnalytics({ key: 'YOUR_ANALYTICS_KEY' })",
		importName: 'ahrefsAnalytics',
	},
	amplitude: {
		example: "amplitude({ apiKey: 'YOUR_API_KEY' })",
		importName: 'amplitude',
	},
	appcues: {
		example: "appcues({ accountId: 'YOUR_APPCUES_ID' })",
		importName: 'appcues',
	},
	attentive: {
		example: "attentiveTag({ siteSlug: 'YOUR_SITESLUG' })",
		importName: 'attentiveTag',
	},
	clay: { example: "clay({ siteId: 'YOUR_SITE_ID' })", importName: 'clay' },
	clearbit: {
		example: "clearbit({ publishableKey: 'pk_XXXXXXXXXX' })",
		importName: 'clearbit',
	},
	'cloudflare-web-analytics': {
		example: "cloudflareWebAnalytics({ token: 'YOUR_BEACON_TOKEN' })",
		importName: 'cloudflareWebAnalytics',
	},
	'cloudflare-zaraz': {
		example: `cloudflareZaraz({
	purposes: { measurement: ['YOUR_ZARAZ_PURPOSE_ID'] },
	// TODO(required): Disable Zaraz automatic pageviews and consent modal.
	// Keep this configuration stable outside render functions before adding onReady.
	// Follow https://c15t.com/docs/integrations/cloudflare-zaraz
	onReady: () => {
		// TODO(required): Send the initial Zaraz Pageview here after consent sync.
	},
})`,
		importName: 'cloudflareZaraz',
	},
	crisp: {
		example: "crisp({ websiteId: 'YOUR_WEBSITE_ID' })",
		importName: 'crisp',
	},
	'customer-io': {
		example: "customerIo({ writeKey: 'YOUR_WRITEKEY' })",
		importName: 'customerIo',
	},
	databuddy: {
		example: "databuddy({ clientId: 'YOUR_CLIENT_ID' })",
		importName: 'databuddy',
	},
	'dynamic-yield': {
		example: "dynamicYield({ sectionId: 'YOUR_SECTION_ID' })",
		importName: 'dynamicYield',
	},
	'fathom-analytics': {
		example: "fathomAnalytics({ site: 'YOUR_SITE_ID' })",
		importName: 'fathomAnalytics',
	},
	'front-chat': {
		example: "frontChat({ chatId: 'YOUR_FRONT_CHAT_ID' })",
		importName: 'frontChat',
	},
	'google-tag': {
		example: "gtag({ id: 'G-XXXXXXXXXX', category: 'measurement' })",
		importName: 'gtag',
	},
	'google-tag-manager': {
		example: "googleTagManager({ id: 'GTM-XXXXXX' })",
		importName: 'googleTagManager',
	},
	gorgias: {
		example: "gorgiasChat({ appKey: 'YOUR_GORGIAS_APP_KEY' })",
		importName: 'gorgiasChat',
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
	insider: {
		example:
			"insiderTag({ partnerName: 'yourpartner', partnerId: 'YOUR_PARTNER_ID' })",
		importName: 'insiderTag',
	},
	intercom: {
		example: "intercom({ appId: 'YOUR_APP_ID' })",
		importName: 'intercom',
	},
	klaviyo: {
		example: "klaviyo({ publicApiKey: 'YOUR_PUBLIC_API_KEY' })",
		importName: 'klaviyo',
	},
	'linkedin-insights': {
		example: "linkedinInsights({ id: 'XXXXXXX' })",
		importName: 'linkedinInsights',
	},
	liveintent: {
		example: "liveIntentTag({ tagId: 'YOUR_TAG_ID' })",
		importName: 'liveIntentTag',
	},
	logrocket: {
		example: "logRocket({ appId: 'org-slug/app-slug' })",
		importName: 'logRocket',
	},
	'lucky-orange': {
		example: "luckyOrange({ siteId: 'YOUR_SITEID' })",
		importName: 'luckyOrange',
	},
	marketo: {
		example: "marketoMunchkin({ munchkinId: 'YOUR_MUNCHKINID' })",
		importName: 'marketoMunchkin',
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
	'one-dollar-stats': {
		example: 'oneDollarStats()',
		importName: 'oneDollarStats',
	},
	'openai-pixel': {
		example: "openaiPixel({ pixelId: 'YOUR_PIXEL_ID' })",
		importName: 'openaiPixel',
	},
	optimizely: {
		example: "optimizelyWeb({ projectId: 'YOUR_PROJECT_ID' })",
		importName: 'optimizelyWeb',
	},
	'oracle-eloqua': {
		example: "eloquaTracking({ siteId: 'YOUR_SITEID' })",
		importName: 'eloquaTracking',
	},
	pendo: { example: "pendo({ apiKey: 'YOUR_APIKEY' })", importName: 'pendo' },
	'pinterest-tag': {
		example: "pinterestTag({ tagId: 'XXXXXXXX' })",
		importName: 'pinterestTag',
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
		// Matches the vendor every framework quickstart shows.
		example: `posthog({
	id: 'phc_your_project_key',
	initOptions: { cookieless_mode: 'never' },
	loadMode: 'after-consent',
})`,
		importName: 'posthog',
	},
	promptwatch: {
		example: "promptwatch({ projectId: 'YOUR_PROJECT_ID' })",
		importName: 'promptwatch',
	},
	rb2b: {
		example: "rb2b({ accountKey: 'YOUR_RB2B_KEY' })",
		importName: 'rb2b',
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
	'salesforce-pardot': {
		example:
			"pardotTracking({ piAId: 'YOUR_ACCOUNT_ID', piCId: 'YOUR_CAMPAIGN_ID', piDomain: 'go.example.com' })",
		importName: 'pardotTracking',
	},
	segment: {
		example: "segment({ writeKey: 'YOUR_WRITE_KEY' })",
		importName: 'segment',
	},
	sentry: {
		example:
			"sentry({ dsn: 'https://YOUR_KEY@oXXXXXX.ingest.sentry.io/XXXXXX' })",
		importName: 'sentry',
	},
	'snapchat-pixel': {
		example: "snapchatPixel({ pixelId: 'XXXXXXXXXXXXXXX' })",
		importName: 'snapchatPixel',
	},
	'statable-analytics': {
		example: "statableAnalytics({ siteId: '12345' })",
		importName: 'statableAnalytics',
	},
	'the-trade-desk': {
		example:
			"theTradeDeskPixel({ advertiserId: 'ADVERTISER_ID', pixelIds: ['PIXEL_ID'] })",
		importName: 'theTradeDeskPixel',
	},
	'tiktok-pixel': {
		example: "tiktokPixel({ pixelId: 'XXXXXXXXXXXXXXXXX' })",
		importName: 'tiktokPixel',
	},
	'umami-analytics': {
		example: "umamiAnalytics({ websiteId: 'YOUR_WEBSITE_ID' })",
		importName: 'umamiAnalytics',
	},
	vector: {
		example: "vector({ pixelId: 'YOUR_PIXEL_ID' })",
		importName: 'vector',
	},
	'vercel-analytics': {
		example: 'vercelAnalytics({})',
		importName: 'vercelAnalytics',
	},
	'vercel-speed-insights': {
		example: 'vercelSpeedInsights({})',
		importName: 'vercelSpeedInsights',
	},
	wisepops: {
		example: "wisepops({ siteId: 'YOUR_WISEPOPS_SITE_ID' })",
		importName: 'wisepops',
	},
	'x-pixel': {
		example: "xPixel({ pixelId: 'oXXXX' })",
		importName: 'xPixel',
	},
	zendesk: {
		example: "zendeskWidget({ key: 'YOUR_ZENDESK_WIDGET_KEY' })",
		importName: 'zendeskWidget',
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
	let result = '';
	for (let index = 0; index < scriptName.length; index += 1) {
		const character = scriptName.charAt(index);
		const next = scriptName.charAt(index + 1);
		if (character === '-' && next >= 'a' && next <= 'z') {
			result += next.toUpperCase();
			index += 1;
		} else {
			result += character;
		}
	}
	return result;
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
 * Each script uses a subpath import from @c15t/integrations
 *
 * @param selectedScripts - Array of script names to import
 * @returns The import statements string, or empty string if no scripts
 *
 * @example
 * ```ts
 * generateScriptsImport(['google-tag-manager', 'microsoft-clarity']);
 * // Returns:
 * // "import { googleTagManager } from '@c15t/integrations/google-tag-manager';
 * //  import { clarity } from '@c15t/integrations/microsoft-clarity';"
 * ```
 */
export function generateScriptsImport(selectedScripts: string[]): string {
	if (!selectedScripts.length) {
		return '';
	}

	return selectedScripts
		.map(
			(script) =>
				`import { ${getSnippet(script).importName} } from '@c15t/integrations/${script}';`
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
	if (!selectedScripts.length) {
		return '[]';
	}
	const scriptConfigs = selectedScripts.map((script) =>
		getSnippet(script).example.replaceAll('\n', `\n${indentation}\t`)
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
				// import { googleTagManager } from '@c15t/integrations/google-tag-manager';
				// scripts: [
				//   googleTagManager({ id: 'GTM-XXXXXX' }),
				// ],`;
}
