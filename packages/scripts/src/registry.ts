/**
 * High-level product area for a built-in script integration.
 *
 * Used for discovery surfaces such as docs navigation and CLI grouping. This is
 * intentionally separate from a manifest consent category.
 */
export type IntegrationCategory =
	| 'analytics'
	| 'ads-and-pixels'
	| 'functional'
	| 'tag-manager';

/**
 * Consent bucket that a built-in integration maps to by default.
 *
 * These values mirror c15t's consent categories without importing core types, so
 * the registry stays safe to consume from docs and CLI code.
 */
export type IntegrationConsentCategory =
	| 'necessary'
	| 'functionality'
	| 'experience'
	| 'measurement'
	| 'marketing';

/**
 * Display metadata for an integration category.
 *
 * @example
 * ```ts
 * const label = BUILT_IN_INTEGRATION_CATEGORIES[0]?.label;
 * ```
 */
export interface IntegrationCategoryEntry {
	/** Stable category key used by registry entries. */
	key: IntegrationCategory;
	/** Human-readable label for display surfaces. */
	label: string;
}

/**
 * Identity and discovery metadata for a built-in script integration.
 *
 * All fields are required except `hint`, which is optional short help text for
 * picker UIs. Do not add runtime behavior, disclosure metadata, or vendor
 * implementation details here.
 */
export interface IntegrationRegistryEntry {
	/** Stable key used by tests and generated metadata. */
	key: string;
	/** Script id emitted by the resolved helper. */
	vendor: string;
	/** Human-readable integration name. */
	label: string;
	/** Optional short description for CLI or docs picker UIs. */
	hint?: string;
	/** Docs route slug for this integration. */
	docsSlug: string;
	/** Package subpath, e.g. `meta-pixel` for `@c15t/scripts/meta-pixel`. */
	packageSubpath: string;
	/** Product area used for grouping and discovery. */
	integrationCategory: IntegrationCategory;
	/** Default consent bucket expected from the generated script. */
	consentCategory: IntegrationConsentCategory;
}

/**
 * Canonical display list for built-in integration categories.
 *
 * Consumers should use this list for category labels and ordering instead of
 * re-declaring category names.
 */
export const BUILT_IN_INTEGRATION_CATEGORIES = [
	{
		key: 'analytics',
		label: 'Analytics',
	},
	{
		key: 'ads-and-pixels',
		label: 'Ads & Pixels',
	},
	{
		key: 'functional',
		label: 'Functional',
	},
	{
		key: 'tag-manager',
		label: 'Tag Managers',
	},
] as const satisfies readonly IntegrationCategoryEntry[];

/**
 * Canonical identity catalog for built-in `@c15t/scripts` integrations.
 *
 * Adding a new built-in integration should add one row here so docs, tests, and
 * the CLI can discover it from the same source.
 */
export const builtInScriptIntegrations = [
	{
		consentCategory: 'necessary',
		docsSlug: 'google-tag-manager',
		hint: 'GTM container script',
		integrationCategory: 'tag-manager',
		key: 'googleTagManager',
		label: 'Google Tag Manager',
		packageSubpath: 'google-tag-manager',
		vendor: 'google-tag-manager',
	},
	{
		consentCategory: 'measurement',
		docsSlug: 'google-tag',
		hint: 'Google Analytics 4',
		integrationCategory: 'analytics',
		key: 'gtag',
		label: 'Google Tag (gtag.js)',
		packageSubpath: 'google-tag',
		vendor: 'gtag',
	},
	{
		consentCategory: 'measurement',
		docsSlug: 'ahrefs-analytics',
		hint: 'Cookieless web analytics from Ahrefs',
		integrationCategory: 'analytics',
		key: 'ahrefsAnalytics',
		label: 'Ahrefs Analytics',
		packageSubpath: 'ahrefs-analytics',
		vendor: 'ahrefs-analytics',
	},
	{
		consentCategory: 'measurement',
		docsSlug: 'adobe-analytics',
		hint: 'Adobe Experience Platform tags',
		integrationCategory: 'analytics',
		key: 'adobeAnalytics',
		label: 'Adobe Analytics',
		packageSubpath: 'adobe-analytics',
		vendor: 'adobe-analytics',
	},
	{
		consentCategory: 'measurement',
		docsSlug: 'amplitude',
		hint: 'Product analytics',
		integrationCategory: 'analytics',
		key: 'amplitude',
		label: 'Amplitude',
		packageSubpath: 'amplitude',
		vendor: 'amplitude',
	},
	{
		consentCategory: 'measurement',
		docsSlug: 'cloudflare-web-analytics',
		hint: 'Cookieless analytics from Cloudflare',
		integrationCategory: 'analytics',
		key: 'cloudflareWebAnalytics',
		label: 'Cloudflare Web Analytics',
		packageSubpath: 'cloudflare-web-analytics',
		vendor: 'cloudflare-web-analytics',
	},
	{
		consentCategory: 'marketing',
		docsSlug: 'clearbit',
		hint: 'Visitor and company enrichment',
		integrationCategory: 'analytics',
		key: 'clearbit',
		label: 'Clearbit',
		packageSubpath: 'clearbit',
		vendor: 'clearbit',
	},
	{
		consentCategory: 'measurement',
		docsSlug: 'microsoft-clarity',
		hint: 'Session replay and heatmaps',
		integrationCategory: 'analytics',
		key: 'microsoft-clarity',
		label: 'Microsoft Clarity',
		packageSubpath: 'microsoft-clarity',
		vendor: 'microsoft-clarity',
	},
	{
		consentCategory: 'measurement',
		docsSlug: 'databuddy',
		hint: 'Data collection',
		integrationCategory: 'analytics',
		key: 'databuddy',
		label: 'Databuddy',
		packageSubpath: 'databuddy',
		vendor: 'databuddy',
	},
	{
		consentCategory: 'measurement',
		docsSlug: 'fathom-analytics',
		hint: 'Privacy-friendly cookieless analytics',
		integrationCategory: 'analytics',
		key: 'fathomAnalytics',
		label: 'Fathom Analytics',
		packageSubpath: 'fathom-analytics',
		vendor: 'fathom-analytics',
	},
	{
		consentCategory: 'measurement',
		docsSlug: 'heap',
		hint: 'Autocapture product analytics',
		integrationCategory: 'analytics',
		key: 'heap',
		label: 'Heap',
		packageSubpath: 'heap',
		vendor: 'heap',
	},
	{
		consentCategory: 'measurement',
		docsSlug: 'mixpanel-analytics',
		hint: 'Product analytics and funnels',
		integrationCategory: 'analytics',
		key: 'mixpanelAnalytics',
		label: 'Mixpanel Analytics',
		packageSubpath: 'mixpanel-analytics',
		vendor: 'mixpanel-analytics',
	},
	{
		consentCategory: 'measurement',
		docsSlug: 'hotjar',
		hint: 'Heatmaps and session recordings',
		integrationCategory: 'analytics',
		key: 'hotjar',
		label: 'Hotjar',
		packageSubpath: 'hotjar',
		vendor: 'hotjar',
	},
	{
		consentCategory: 'measurement',
		docsSlug: 'hightouch',
		hint: 'Customer data platform events',
		integrationCategory: 'analytics',
		key: 'hightouch',
		label: 'Hightouch',
		packageSubpath: 'hightouch',
		vendor: 'hightouch',
	},
	{
		consentCategory: 'measurement',
		docsSlug: 'rudderstack',
		hint: 'Customer data platform events',
		integrationCategory: 'analytics',
		key: 'rudderstack',
		label: 'RudderStack',
		packageSubpath: 'rudderstack',
		vendor: 'rudderstack',
	},
	{
		consentCategory: 'measurement',
		docsSlug: 'logrocket',
		hint: 'Session replay and monitoring',
		integrationCategory: 'analytics',
		key: 'logRocket',
		label: 'LogRocket',
		packageSubpath: 'logrocket',
		vendor: 'logrocket',
	},
	{
		consentCategory: 'measurement',
		docsSlug: 'matomo-analytics',
		hint: 'Self-hosted privacy analytics',
		integrationCategory: 'analytics',
		key: 'matomoAnalytics',
		label: 'Matomo Analytics',
		packageSubpath: 'matomo-analytics',
		vendor: 'matomo-analytics',
	},
	{
		consentCategory: 'measurement',
		docsSlug: 'posthog',
		hint: 'Product analytics',
		integrationCategory: 'analytics',
		key: 'posthog',
		label: 'PostHog',
		packageSubpath: 'posthog',
		vendor: 'posthog',
	},
	{
		consentCategory: 'measurement',
		docsSlug: 'promptwatch',
		hint: 'AI traffic analytics',
		integrationCategory: 'analytics',
		key: 'promptwatch',
		label: 'Promptwatch',
		packageSubpath: 'promptwatch',
		vendor: 'promptwatch',
	},
	{
		consentCategory: 'measurement',
		docsSlug: 'pirsch',
		hint: 'Privacy-friendly cookieless analytics',
		integrationCategory: 'analytics',
		key: 'pirsch',
		label: 'Pirsch',
		packageSubpath: 'pirsch',
		vendor: 'pirsch',
	},
	{
		consentCategory: 'measurement',
		docsSlug: 'segment',
		hint: 'Customer data platform',
		integrationCategory: 'analytics',
		key: 'segment',
		label: 'Segment',
		packageSubpath: 'segment',
		vendor: 'segment',
	},
	{
		consentCategory: 'measurement',
		docsSlug: 'rybbit-analytics',
		hint: 'Privacy-friendly web analytics',
		integrationCategory: 'analytics',
		key: 'rybbitAnalytics',
		label: 'Rybbit Analytics',
		packageSubpath: 'rybbit-analytics',
		vendor: 'rybbit-analytics',
	},
	{
		consentCategory: 'measurement',
		docsSlug: 'plausible-analytics',
		hint: 'Privacy-friendly cookieless analytics',
		integrationCategory: 'analytics',
		key: 'plausibleAnalytics',
		label: 'Plausible Analytics',
		packageSubpath: 'plausible-analytics',
		vendor: 'plausible-analytics',
	},
	{
		consentCategory: 'measurement',
		docsSlug: 'umami-analytics',
		hint: 'Open-source cookieless analytics',
		integrationCategory: 'analytics',
		key: 'umamiAnalytics',
		label: 'Umami Analytics',
		packageSubpath: 'umami-analytics',
		vendor: 'umami-analytics',
	},
	{
		consentCategory: 'measurement',
		docsSlug: 'vercel-analytics',
		hint: 'Vercel web analytics',
		integrationCategory: 'analytics',
		key: 'vercelAnalytics',
		label: 'Vercel Analytics',
		packageSubpath: 'vercel-analytics',
		vendor: 'vercel-analytics',
	},
	{
		consentCategory: 'functionality',
		docsSlug: 'crisp',
		hint: 'Live chat widget',
		integrationCategory: 'functional',
		key: 'crisp',
		label: 'Crisp',
		packageSubpath: 'crisp',
		vendor: 'crisp',
	},
	{
		consentCategory: 'functionality',
		docsSlug: 'intercom',
		hint: 'Messenger and live chat widget',
		integrationCategory: 'functional',
		key: 'intercom',
		label: 'Intercom',
		packageSubpath: 'intercom',
		vendor: 'intercom',
	},
	{
		consentCategory: 'marketing',
		docsSlug: 'meta-pixel',
		hint: 'Facebook/Instagram tracking',
		integrationCategory: 'ads-and-pixels',
		key: 'metaPixel',
		label: 'Meta Pixel',
		packageSubpath: 'meta-pixel',
		vendor: 'meta-pixel',
	},
	{
		consentCategory: 'marketing',
		docsSlug: 'reddit-pixel',
		hint: 'Reddit ads tracking',
		integrationCategory: 'ads-and-pixels',
		key: 'redditPixel',
		label: 'Reddit Pixel',
		packageSubpath: 'reddit-pixel',
		vendor: 'reddit-pixel',
	},
	{
		consentCategory: 'marketing',
		docsSlug: 'tiktok-pixel',
		hint: 'TikTok ads tracking',
		integrationCategory: 'ads-and-pixels',
		key: 'tiktokPixel',
		label: 'TikTok Pixel',
		packageSubpath: 'tiktok-pixel',
		vendor: 'tiktok-pixel',
	},
	{
		consentCategory: 'marketing',
		docsSlug: 'linkedin-insights',
		hint: 'LinkedIn conversion tracking',
		integrationCategory: 'ads-and-pixels',
		key: 'linkedinInsights',
		label: 'LinkedIn Insight Tag',
		packageSubpath: 'linkedin-insights',
		vendor: 'linkedin-insights',
	},
	{
		consentCategory: 'marketing',
		docsSlug: 'microsoft-uet',
		hint: 'Bing Ads tracking',
		integrationCategory: 'ads-and-pixels',
		key: 'microsoftUet',
		label: 'Microsoft UET',
		packageSubpath: 'microsoft-uet',
		vendor: 'microsoft-uet',
	},
	{
		consentCategory: 'marketing',
		docsSlug: 'snapchat-pixel',
		hint: 'Snapchat ads tracking',
		integrationCategory: 'ads-and-pixels',
		key: 'snapchatPixel',
		label: 'Snapchat Pixel',
		packageSubpath: 'snapchat-pixel',
		vendor: 'snapchat-pixel',
	},
	{
		consentCategory: 'marketing',
		docsSlug: 'x-pixel',
		hint: 'X/Twitter conversion tracking',
		integrationCategory: 'ads-and-pixels',
		key: 'xPixel',
		label: 'X (Twitter) Pixel',
		packageSubpath: 'x-pixel',
		vendor: 'x-pixel',
	},
] as const satisfies readonly IntegrationRegistryEntry[];

/**
 * Concrete registry entry type inferred from `builtInScriptIntegrations`.
 */
export type BuiltInScriptIntegration =
	(typeof builtInScriptIntegrations)[number];

/**
 * Union of stable keys for built-in integrations.
 */
export type BuiltInScriptIntegrationKey = BuiltInScriptIntegration['key'];

/**
 * Union of public package subpaths for built-in integrations.
 */
export type BuiltInScriptIntegrationSubpath =
	BuiltInScriptIntegration['packageSubpath'];

/**
 * Looks up a built-in integration by its registry key.
 *
 * @param key - Stable integration key.
 * @returns The matching built-in integration entry.
 * @throws {Error}("Unknown built-in script integration: <key>")` when the key is
 * not present. Catch this when accepting untrusted or user-provided keys.
 *
 * @example
 * ```ts
 * const integration = getBuiltInScriptIntegration('metaPixel');
 * console.log(integration.packageSubpath); // "meta-pixel"
 * ```
 */
export const getBuiltInScriptIntegration = function getBuiltInScriptIntegration(
	key: BuiltInScriptIntegrationKey
): BuiltInScriptIntegration {
	const integration = builtInScriptIntegrations.find(
		(item) => item.key === key
	);

	if (integration) {
		return integration;
	}

	throw new Error(`Unknown built-in script integration: ${key}`);
};

/**
 * Finds a built-in integration by its public package subpath.
 *
 * @param subpath - Kebab-case subpath such as `google-tag`.
 * @returns The matching integration, or `undefined` when no entry matches.
 *
 * @example
 * ```ts
 * const integration = getBuiltInScriptIntegrationBySubpath('meta-pixel');
 * console.log(integration?.label); // "Meta Pixel"
 * ```
 */
export const getBuiltInScriptIntegrationBySubpath =
	function getBuiltInScriptIntegrationBySubpath(
		subpath: string
	): BuiltInScriptIntegration | undefined {
		return builtInScriptIntegrations.find(
			(integration) => integration.packageSubpath === subpath
		);
	};

/**
 * Finds a built-in integration by the emitted script vendor id.
 *
 * Use this to connect a resolved manifest/script id back to registry metadata.
 *
 * @param vendor - Vendor id emitted as `Script.id`.
 * @returns The matching integration, or `undefined` when no entry matches.
 *
 * @example
 * ```ts
 * const integration = getBuiltInScriptIntegrationByVendor('google-tag-manager');
 * console.log(integration?.label); // "Google Tag Manager"
 * ```
 */
export const getBuiltInScriptIntegrationByVendor =
	function getBuiltInScriptIntegrationByVendor(
		vendor: string
	): BuiltInScriptIntegration | undefined {
		return builtInScriptIntegrations.find(
			(integration) => integration.vendor === vendor
		);
	};
