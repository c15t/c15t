export type IntegrationCategory = 'analytics' | 'ads-and-pixels' | 'tag-manager';
export type IntegrationConsentCategory =
	| 'necessary'
	| 'functionality'
	| 'experience'
	| 'measurement'
	| 'marketing';

export interface IntegrationRegistryEntry {
	key: string;
	vendor: string;
	label: string;
	docsSlug: string;
	category: IntegrationCategory;
	consentCategory: IntegrationConsentCategory;
}

export const builtInScriptIntegrations = [
	{
		key: 'googleTagManager',
		vendor: 'google-tag-manager',
		label: 'Google Tag Manager',
		docsSlug: 'google-tag-manager',
		category: 'tag-manager',
		consentCategory: 'necessary',
	},
	{
		key: 'gtag',
		vendor: 'gtag',
		label: 'GA4 + Google Ads (gtag.js)',
		docsSlug: 'google-tag',
		category: 'analytics',
		consentCategory: 'measurement',
	},
	{
		key: 'databuddy',
		vendor: 'databuddy',
		label: 'Databuddy',
		docsSlug: 'databuddy',
		category: 'analytics',
		consentCategory: 'measurement',
	},
	{
		key: 'posthog',
		vendor: 'posthog',
		label: 'PostHog',
		docsSlug: 'posthog',
		category: 'analytics',
		consentCategory: 'measurement',
	},
	{
		key: 'metaPixel',
		vendor: 'meta-pixel',
		label: 'Meta Pixel',
		docsSlug: 'meta-pixel',
		category: 'ads-and-pixels',
		consentCategory: 'marketing',
	},
	{
		key: 'tiktokPixel',
		vendor: 'tiktok-pixel',
		label: 'TikTok Pixel',
		docsSlug: 'tiktok-pixel',
		category: 'ads-and-pixels',
		consentCategory: 'marketing',
	},
	{
		key: 'linkedinInsights',
		vendor: 'linkedin-insights',
		label: 'LinkedIn Insights',
		docsSlug: 'linkedin-insights',
		category: 'ads-and-pixels',
		consentCategory: 'marketing',
	},
	{
		key: 'microsoftUet',
		vendor: 'microsoft-uet',
		label: 'Microsoft UET',
		docsSlug: 'microsoft-uet',
		category: 'ads-and-pixels',
		consentCategory: 'marketing',
	},
	{
		key: 'xPixel',
		vendor: 'x-pixel',
		label: 'X Pixel',
		docsSlug: 'x-pixel',
		category: 'ads-and-pixels',
		consentCategory: 'marketing',
	},
] as const satisfies readonly IntegrationRegistryEntry[];

export type BuiltInScriptIntegration =
	(typeof builtInScriptIntegrations)[number];

export type BuiltInScriptIntegrationKey = BuiltInScriptIntegration['key'];
