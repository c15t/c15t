export type IntegrationCategory =
	| 'analytics'
	| 'ads-and-pixels'
	| 'tag-manager';

export type IntegrationConsentCategory =
	| 'necessary'
	| 'functionality'
	| 'experience'
	| 'measurement'
	| 'marketing';

export interface IntegrationCategoryEntry {
	key: IntegrationCategory;
	label: string;
}

export interface IntegrationRegistryEntry {
	key: string;
	vendor: string;
	label: string;
	hint?: string;
	docsSlug: string;
	packageSubpath: string;
	integrationCategory: IntegrationCategory;
	consentCategory: IntegrationConsentCategory;
}

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

export type BuiltInScriptIntegration =
	(typeof builtInScriptIntegrations)[number];

export type BuiltInScriptIntegrationKey = BuiltInScriptIntegration['key'];

export type BuiltInScriptIntegrationSubpath =
	BuiltInScriptIntegration['packageSubpath'];

export function getBuiltInScriptIntegration(
	key: BuiltInScriptIntegrationKey
): BuiltInScriptIntegration {
	for (const integration of builtInScriptIntegrations) {
		if (integration.key === key) {
			return integration;
		}
	}

	throw new Error(`Unknown built-in script integration: ${key}`);
}

export function getBuiltInScriptIntegrationBySubpath(
	subpath: string
): BuiltInScriptIntegration | undefined {
	for (const integration of builtInScriptIntegrations) {
		if (integration.packageSubpath === subpath) {
			return integration;
		}
	}

	return undefined;
}

export function getBuiltInScriptIntegrationByVendor(
	vendor: string
): BuiltInScriptIntegration | undefined {
	for (const integration of builtInScriptIntegrations) {
		if (integration.vendor === vendor) {
			return integration;
		}
	}

	return undefined;
}
