/**
 * High-level product area for a built-in script integration.
 *
 * Used for discovery surfaces such as docs navigation and CLI grouping. This is
 * intentionally separate from a manifest consent category.
 */
export type IntegrationCategory =
	| 'analytics'
	| 'ads-and-pixels'
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
	/** Stable camelCase key used by tests and generated metadata. */
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
		key: 'googleTagManager',
		vendor: 'google-tag-manager',
		label: 'Google Tag Manager',
		hint: 'GTM container script',
		docsSlug: 'google-tag-manager',
		packageSubpath: 'google-tag-manager',
		integrationCategory: 'tag-manager',
		consentCategory: 'necessary',
	},
	{
		key: 'gtag',
		vendor: 'gtag',
		label: 'Google Tag (gtag.js)',
		hint: 'Google Analytics 4',
		docsSlug: 'google-tag',
		packageSubpath: 'google-tag',
		integrationCategory: 'analytics',
		consentCategory: 'measurement',
	},
	{
		key: 'ahrefsAnalytics',
		vendor: 'ahrefs-analytics',
		label: 'Ahrefs Analytics',
		hint: 'Cookieless web analytics from Ahrefs',
		docsSlug: 'ahrefs-analytics',
		packageSubpath: 'ahrefs-analytics',
		integrationCategory: 'analytics',
		consentCategory: 'measurement',
	},
	{
		key: 'cloudflareWebAnalytics',
		vendor: 'cloudflare-web-analytics',
		label: 'Cloudflare Web Analytics',
		hint: 'Cookieless analytics from Cloudflare',
		docsSlug: 'cloudflare-web-analytics',
		packageSubpath: 'cloudflare-web-analytics',
		integrationCategory: 'analytics',
		consentCategory: 'measurement',
	},
	{
		key: 'databuddy',
		vendor: 'databuddy',
		label: 'Databuddy',
		hint: 'Data collection',
		docsSlug: 'databuddy',
		packageSubpath: 'databuddy',
		integrationCategory: 'analytics',
		consentCategory: 'measurement',
	},
	{
		key: 'fathomAnalytics',
		vendor: 'fathom-analytics',
		label: 'Fathom Analytics',
		hint: 'Privacy-friendly cookieless analytics',
		docsSlug: 'fathom-analytics',
		packageSubpath: 'fathom-analytics',
		integrationCategory: 'analytics',
		consentCategory: 'measurement',
	},
	{
		key: 'posthog',
		vendor: 'posthog',
		label: 'PostHog',
		hint: 'Product analytics',
		docsSlug: 'posthog',
		packageSubpath: 'posthog',
		integrationCategory: 'analytics',
		consentCategory: 'measurement',
	},
	{
		key: 'metaPixel',
		vendor: 'meta-pixel',
		label: 'Meta Pixel',
		hint: 'Facebook/Instagram tracking',
		docsSlug: 'meta-pixel',
		packageSubpath: 'meta-pixel',
		integrationCategory: 'ads-and-pixels',
		consentCategory: 'marketing',
	},
	{
		key: 'tiktokPixel',
		vendor: 'tiktok-pixel',
		label: 'TikTok Pixel',
		hint: 'TikTok ads tracking',
		docsSlug: 'tiktok-pixel',
		packageSubpath: 'tiktok-pixel',
		integrationCategory: 'ads-and-pixels',
		consentCategory: 'marketing',
	},
	{
		key: 'linkedinInsights',
		vendor: 'linkedin-insights',
		label: 'LinkedIn Insight Tag',
		hint: 'LinkedIn conversion tracking',
		docsSlug: 'linkedin-insights',
		packageSubpath: 'linkedin-insights',
		integrationCategory: 'ads-and-pixels',
		consentCategory: 'marketing',
	},
	{
		key: 'microsoftUet',
		vendor: 'microsoft-uet',
		label: 'Microsoft UET',
		hint: 'Bing Ads tracking',
		docsSlug: 'microsoft-uet',
		packageSubpath: 'microsoft-uet',
		integrationCategory: 'ads-and-pixels',
		consentCategory: 'marketing',
	},
	{
		key: 'xPixel',
		vendor: 'x-pixel',
		label: 'X (Twitter) Pixel',
		hint: 'X/Twitter conversion tracking',
		docsSlug: 'x-pixel',
		packageSubpath: 'x-pixel',
		integrationCategory: 'ads-and-pixels',
		consentCategory: 'marketing',
	},
] as const satisfies readonly IntegrationRegistryEntry[];

/**
 * Concrete registry entry type inferred from `builtInScriptIntegrations`.
 */
export type BuiltInScriptIntegration =
	(typeof builtInScriptIntegrations)[number];

/**
 * Union of stable camelCase keys for built-in integrations.
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
 * @param key - Stable camelCase integration key.
 * @returns The matching built-in integration entry.
 * @throws `Error("Unknown built-in script integration: <key>")` when the key is
 * not present. Catch this when accepting untrusted or user-provided keys.
 *
 * @example
 * ```ts
 * const integration = getBuiltInScriptIntegration('metaPixel');
 * console.log(integration.packageSubpath); // "meta-pixel"
 * ```
 */
export function getBuiltInScriptIntegration(
	key: BuiltInScriptIntegrationKey
): BuiltInScriptIntegration {
	const integration = builtInScriptIntegrations.find(
		(item) => item.key === key
	);

	if (integration) {
		return integration;
	}

	throw new Error(`Unknown built-in script integration: ${key}`);
}

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
export function getBuiltInScriptIntegrationBySubpath(
	subpath: string
): BuiltInScriptIntegration | undefined {
	return builtInScriptIntegrations.find(
		(integration) => integration.packageSubpath === subpath
	);
}

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
export function getBuiltInScriptIntegrationByVendor(
	vendor: string
): BuiltInScriptIntegration | undefined {
	return builtInScriptIntegrations.find(
		(integration) => integration.vendor === vendor
	);
}
