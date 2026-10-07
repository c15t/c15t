import { metaPixel } from '@c15t/integrations/meta-pixel';
import { posthog } from '@c15t/integrations/posthog';
import type { Script, Vendor } from 'c15t';
import type { ConsentProviderOptions } from 'c15t/next';

// Replace the placeholder IDs with your own. Each helper waits for its
// category: PostHog for measurement, Meta Pixel for marketing.
export const scripts: Script[] = [
	posthog({
		id: 'phc_your_project_key',
		initOptions: { cookieless_mode: 'never' },
		loadMode: 'after-consent',
	}),
	metaPixel({ pixelId: 'YOUR_PIXEL_ID' }),
];

// The privacy page lists these under their category. Each `id` matches the
// `vendor` slug the helper above puts on its script.
export const vendors: Vendor[] = [
	{
		category: 'measurement',
		description: 'Page views, searches and where checkout gets stuck.',
		id: 'posthog',
		name: 'PostHog',
		privacyPolicyUrl: 'https://posthog.com/privacy',
	},
	{
		category: 'marketing',
		description:
			'Counts visits from our Instagram and Facebook ads, and builds the audiences those ads go to.',
		id: 'meta-pixel',
		name: 'Meta Pixel',
		privacyPolicyUrl: 'https://www.facebook.com/privacy/policy/',
	},
];

// Category names and descriptions in Northwind's words. The banner, the
// dialog and the privacy page all read them from the same translations.
export const i18n = {
	messages: {
		en: {
			consentTypes: {
				marketing: {
					description:
						'Measures our ads on Instagram and Facebook and shows you Northwind ads there. Turning it off means fewer tailored ads, not fewer ads.',
					title: 'Marketing',
				},
				measurement: {
					description:
						'Shows us which pages and coffees people look at, so we can fix what is slow and roast more of what sells.',
					title: 'Analytics',
				},
				necessary: {
					description:
						'Keeps your basket, sign-in and checkout working. The shop cannot run without these, so they are always on.',
					title: 'Strictly necessary',
				},
			},
		},
	},
} satisfies ConsentProviderOptions['i18n'];
