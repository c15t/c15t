import { gtag } from '@c15t/integrations/google-tag';
import { googleTagManager } from '@c15t/integrations/google-tag-manager';
import { metaPixel } from '@c15t/integrations/meta-pixel';
import { posthog } from '@c15t/integrations/posthog';
import type { Script, Vendor } from 'c15t';

// Every ID below is a placeholder. Put your own in its place; the helpers
// throw on an empty ID, so leave a vendor out until you have one.
export const scripts: Script[] = [
	// Loads on every page with all Google consent types denied, then sends a
	// Consent Mode v2 `update` each time the visitor changes a choice. Tags in
	// the container that don't read Consent Mode need their own consent
	// settings in GTM. Your container ID is in the GTM workspace header.
	googleTagManager({ id: 'GTM-XXXXXXX' }),

	// GA4 through gtag.js. Like GTM it loads before a choice and waits for
	// `analytics_storage` to be granted before it stores or sends anything.
	// Your measurement ID is under Admin > Data streams in GA4.
	gtag({ category: 'measurement', id: 'G-XXXXXXXXXX' }),

	// Nothing from PostHog loads until the visitor allows measurement. With
	// cookieless mode off, a refusal means no capture at all.
	// Your project token is under Project settings in PostHog.
	posthog({
		id: 'phc_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
		initOptions: { cookieless_mode: 'never' },
		loadMode: 'after-consent',
	}),

	// Marketing only. c15t defines no `fbq` and loads nothing from Meta until
	// marketing is allowed. Your pixel ID is in Meta Events Manager.
	metaPixel({ pixelId: '000000000000000' }),
];

// Names and privacy links for the preference dialog, matched to each helper's
// `vendor` slug. Visitors can switch off one vendor inside an allowed
// category, and the dialog lists what each category turns on.
export const vendors: Vendor[] = [
	{
		category: 'necessary',
		// GTM only loads the container; Consent Mode decides what its tags do.
		disabled: true,
		id: 'google-tag-manager',
		name: 'Google Tag Manager',
		privacyPolicyUrl: 'https://policies.google.com/privacy',
	},
	{
		category: 'measurement',
		id: 'gtag',
		name: 'Google Analytics',
		privacyPolicyUrl: 'https://policies.google.com/privacy',
	},
	{
		category: 'measurement',
		id: 'posthog',
		name: 'PostHog',
		privacyPolicyUrl: 'https://posthog.com/privacy',
	},
	{
		category: 'marketing',
		id: 'meta-pixel',
		name: 'Meta Pixel',
		privacyPolicyUrl: 'https://www.facebook.com/privacy/policy/',
	},
];
