import { posthog } from '@c15t/integrations/posthog';
import type { Script, Vendor } from 'c15t';

export const scripts: Script[] = [
	// PostHog sits in the `measurement` category. With `after-consent`, its
	// script is not requested until the visitor allows Analytics.
	posthog({
		id: process.env.NEXT_PUBLIC_POSTHOG_KEY ?? 'phc_your_project_key',
		initOptions: { cookieless_mode: 'never' },
		loadMode: 'after-consent',
	}),
];

// Named vendors show up in the consent dialog under their category.
export const vendors: Vendor[] = [
	{
		category: 'measurement',
		id: 'posthog',
		name: 'PostHog',
		privacyPolicyUrl: 'https://posthog.com/privacy',
	},
];
