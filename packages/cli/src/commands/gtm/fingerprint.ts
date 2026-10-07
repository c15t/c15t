import type { GtmOption, GtmScriptCall } from './types';

interface Fingerprint {
	label: string;
	importName: string;
	packageSubpath: string;
	match: (text: string) => GtmOption[] | undefined;
}

const call = function call(
	fingerprint: Fingerprint,
	options: readonly GtmOption[]
): GtmScriptCall {
	return {
		firesOn: [],
		importName: fingerprint.importName,
		label: fingerprint.label,
		options,
		packageSubpath: fingerprint.packageSubpath,
	};
};

const first = function first(
	text: string,
	pattern: RegExp
): string | undefined {
	return pattern.exec(text)?.groups?.id;
};

const option = function option(
	name: string,
	value: string | number | boolean
): GtmOption {
	return { name, value };
};

export const gtagCategory = function gtagCategory(
	id: string,
	consent: readonly string[]
): 'measurement' | 'marketing' {
	if (/^(?:AW|DC)-/iu.test(id)) {
		return 'marketing';
	}
	if (/^(?:G|GT)-/iu.test(id)) {
		return 'measurement';
	}
	const ads = consent.some((type) => type.startsWith('ad_'));
	const analytics = consent.includes('analytics_storage');
	return ads && !analytics ? 'marketing' : 'measurement';
};

export const numericId = function numericId(value: string): string | number {
	return /^[1-9]\d{0,15}$/u.test(value) ? Number(value) : value;
};

/**
 * Vendors people paste into Custom HTML. Each pattern needs an id the
 * matching c15t helper can take without a guessed host or region.
 */
const fingerprints: readonly Fingerprint[] = [
	{
		importName: 'gtag',
		label: 'Google tag',
		match: (text) => {
			const id = first(
				text,
				/googletagmanager\.com\/gtag\/js\?id=(?<id>(?:G|GT|AW|DC)-[A-Za-z0-9]+)/u
			);
			const configured = first(
				text,
				/gtag\(\s*['"]config['"]\s*,\s*['"](?<id>(?:G|GT|AW|DC)-[A-Za-z0-9]+)['"]/u
			);
			const tagId = id ?? configured;
			if (!tagId) {
				return undefined;
			}
			return [option('id', tagId), option('category', gtagCategory(tagId, []))];
		},
		packageSubpath: 'google-tag',
	},
	{
		importName: 'hotjar',
		label: 'Hotjar',
		match: (text) => {
			const siteId =
				first(text, /hotjar-(?<id>\d+)\.js/u) ??
				first(text, /hjid['"]?\s*[:=]\s*['"]?(?<id>\d+)/u);
			return siteId ? [option('siteId', numericId(siteId))] : undefined;
		},
		packageSubpath: 'hotjar',
	},
	{
		importName: 'metaPixel',
		label: 'Meta Pixel',
		match: (text) => {
			const pixelId = first(
				text,
				/fbq\(\s*['"]init['"]\s*,\s*['"](?<id>\d{5,})['"]/u
			);
			return pixelId ? [option('pixelId', pixelId)] : undefined;
		},
		packageSubpath: 'meta-pixel',
	},
	{
		importName: 'tiktokPixel',
		label: 'TikTok Pixel',
		match: (text) => {
			const pixelId = first(text, /ttq\.load\(\s*['"](?<id>[A-Za-z0-9]+)['"]/u);
			return pixelId ? [option('pixelId', pixelId)] : undefined;
		},
		packageSubpath: 'tiktok-pixel',
	},
	{
		importName: 'linkedinInsights',
		label: 'LinkedIn Insight Tag',
		match: (text) => {
			const id =
				first(text, /_linkedin_partner_id\s*=\s*['"](?<id>\d+)['"]/u) ??
				first(text, /partner_ids\.push\(\s*['"](?<id>\d+)['"]/u);
			return id ? [option('id', id)] : undefined;
		},
		packageSubpath: 'linkedin-insights',
	},
	{
		importName: 'pinterestTag',
		label: 'Pinterest Tag',
		match: (text) => {
			const tagId = first(
				text,
				/pintrk\(\s*['"]load['"]\s*,\s*['"](?<id>\d+)['"]/u
			);
			return tagId ? [option('tagId', tagId)] : undefined;
		},
		packageSubpath: 'pinterest-tag',
	},
	{
		importName: 'redditPixel',
		label: 'Reddit Pixel',
		match: (text) => {
			const pixelId = first(
				text,
				/rdt\(\s*['"]init['"]\s*,\s*['"](?<id>t2_[A-Za-z0-9]+)['"]/u
			);
			return pixelId ? [option('pixelId', pixelId)] : undefined;
		},
		packageSubpath: 'reddit-pixel',
	},
	{
		importName: 'snapchatPixel',
		label: 'Snapchat Pixel',
		match: (text) => {
			const pixelId = first(
				text,
				/snaptr\(\s*['"]init['"]\s*,\s*['"](?<id>[A-Za-z0-9-]+)['"]/u
			);
			return pixelId ? [option('pixelId', pixelId)] : undefined;
		},
		packageSubpath: 'snapchat-pixel',
	},
	{
		importName: 'xPixel',
		label: 'X Pixel',
		match: (text) => {
			const pixelId = first(
				text,
				/twq\(\s*['"]config['"]\s*,\s*['"](?<id>[A-Za-z0-9]+)['"]/u
			);
			return pixelId ? [option('pixelId', pixelId)] : undefined;
		},
		packageSubpath: 'x-pixel',
	},
	{
		importName: 'microsoftUet',
		label: 'Microsoft UET',
		match: (text) => {
			if (!/bat\.bing\.com|uetq/u.test(text)) {
				return undefined;
			}
			const id = first(text, /['"]ti['"]\s*:\s*['"](?<id>\d+)['"]/u);
			return id ? [option('id', id)] : undefined;
		},
		packageSubpath: 'microsoft-uet',
	},
	{
		importName: 'clarity',
		label: 'Microsoft Clarity',
		match: (text) => {
			const id = first(text, /clarity\.ms\/tag\/(?<id>[a-z0-9]+)/iu);
			return id ? [option('id', id)] : undefined;
		},
		packageSubpath: 'microsoft-clarity',
	},
	{
		importName: 'segment',
		label: 'Segment',
		match: (text) => {
			if (!/segment\.com/u.test(text)) {
				return undefined;
			}
			const writeKey = first(
				text,
				/analytics\.load\(\s*['"](?<id>[A-Za-z0-9]+)['"]/u
			);
			return writeKey ? [option('writeKey', writeKey)] : undefined;
		},
		packageSubpath: 'segment',
	},
	{
		importName: 'posthog',
		label: 'PostHog',
		match: (text) => {
			const id = first(
				text,
				/posthog\.init\(\s*['"](?<id>phc_[A-Za-z0-9]+)['"]/u
			);
			if (!id) {
				return undefined;
			}
			if (/us\.i\.posthog\.com/u.test(text)) {
				return [option('id', id), option('region', 'us')];
			}
			return [option('id', id)];
		},
		packageSubpath: 'posthog',
	},
	{
		importName: 'mixpanelAnalytics',
		label: 'Mixpanel',
		match: (text) => {
			const token = first(
				text,
				/mixpanel\.init\(\s*['"](?<id>[a-f0-9]{32})['"]/iu
			);
			return token ? [option('token', token)] : undefined;
		},
		packageSubpath: 'mixpanel-analytics',
	},
	{
		importName: 'amplitude',
		label: 'Amplitude',
		match: (text) => {
			const apiKey = first(
				text,
				/amplitude(?:\.getInstance\(\))?\.init\(\s*['"](?<id>[^'"]+)['"]/u
			);
			if (!apiKey || apiKey.includes('{{')) {
				return undefined;
			}
			return [option('apiKey', apiKey)];
		},
		packageSubpath: 'amplitude',
	},
	{
		importName: 'intercom',
		label: 'Intercom',
		match: (text) => {
			const appId = first(
				text,
				/widget\.intercom\.io\/widget\/(?<id>[a-z0-9]+)/iu
			);
			return appId ? [option('appId', appId)] : undefined;
		},
		packageSubpath: 'intercom',
	},
	{
		importName: 'crisp',
		label: 'Crisp',
		match: (text) => {
			const websiteId = first(
				text,
				/CRISP_WEBSITE_ID\s*=\s*['"](?<id>[0-9a-f-]{8,})['"]/iu
			);
			return websiteId ? [option('websiteId', websiteId)] : undefined;
		},
		packageSubpath: 'crisp',
	},
	{
		importName: 'klaviyo',
		label: 'Klaviyo',
		match: (text) => {
			const publicApiKey = first(
				text,
				/static\.klaviyo\.com\/onsite\/js\/(?<id>[A-Za-z0-9]+)\/klaviyo\.js/u
			);
			return publicApiKey ? [option('publicApiKey', publicApiKey)] : undefined;
		},
		packageSubpath: 'klaviyo',
	},
	{
		importName: 'fathomAnalytics',
		label: 'Fathom',
		match: (text) => {
			if (!/usefathom\.com/u.test(text)) {
				return undefined;
			}
			const site = first(text, /data-site=['"](?<id>[A-Za-z0-9]+)['"]/u);
			return site ? [option('site', site)] : undefined;
		},
		packageSubpath: 'fathom-analytics',
	},
];

/** Find c15t helpers mentioned by a Custom HTML or community-template body. */
export const fingerprintText = function fingerprintText(
	text: string
): GtmScriptCall[] {
	const calls: GtmScriptCall[] = [];
	for (const fingerprint of fingerprints) {
		const options = fingerprint.match(text);
		if (options) {
			calls.push(call(fingerprint, options));
		}
	}
	return calls;
};

/** Another container referenced from Custom HTML, if the snippet loads one. */
export const nestedContainerId = function nestedContainerId(
	text: string
): string | undefined {
	return first(
		text,
		/googletagmanager\.com\/gtm\.js\?id=(?<id>GTM-[A-Z0-9]+)/u
	);
};
