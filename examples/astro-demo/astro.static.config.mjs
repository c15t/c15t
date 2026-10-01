// #region docs:static-config title="astro.config.mjs"
import { fileURLToPath } from 'node:url';

import svelte from '@astrojs/svelte';
import { defineConfig } from 'astro/config';
import c15t, { hosted } from 'c15t/astro';

// Astro reads this file before it loads `.env`, so set the variable in the
// shell or in your host's build settings.
const backendURL = process.env.C15T_BACKEND_URL;
if (!backendURL) {
	throw new Error(
		'Set C15T_BACKEND_URL to the backend URL of your Inth project.'
	);
}

export default defineConfig({
	integrations: [
		svelte(),
		c15t({
			clientEntrypoint: fileURLToPath(
				new URL('./src/consent-client.ts', import.meta.url)
			),
			mode: hosted({ url: backendURL }),
			ui: 'svelte',
			// #hide docs
			// Demo-only: the example suite's vendor scenario.
			vendors: [
				{
					category: 'measurement',
					description: 'Product analytics and session insights.',
					id: 'posthog',
					name: 'PostHog',
					privacyPolicyUrl: 'https://posthog.com/privacy',
				},
				{
					category: 'measurement',
					description: 'Embedded videos.',
					id: 'youtube',
					name: 'YouTube',
					privacyPolicyUrl: 'https://policies.google.com/privacy',
				},
				{
					category: 'marketing',
					description: 'Ad conversion tracking.',
					id: 'x-pixel',
					name: 'X Pixel',
					privacyPolicyUrl: 'https://x.com/en/privacy',
				},
			],
			// #endhide docs
		}),
	],
	output: 'static',
});
// #endregion docs:static-config
