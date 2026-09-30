// #region docs:server-config title="astro.config.mjs"
import { fileURLToPath } from 'node:url';

import node from '@astrojs/node';
import svelte from '@astrojs/svelte';
import { defineConfig } from 'astro/config';
import c15t, { manifest } from 'c15t/astro';

// Astro reads this file before it loads `.env`, so set the variable in the
// shell or in your host's build settings.
const backendURL = process.env.C15T_BACKEND_URL;
if (!backendURL) {
	throw new Error(
		'Set C15T_BACKEND_URL to the backend URL of your Inth project.'
	);
}

export default defineConfig({
	adapter: node({ mode: 'standalone' }),
	integrations: [
		svelte(),
		c15t({
			clientEntrypoint: fileURLToPath(
				new URL('./src/consent-client.ts', import.meta.url)
			),
			mode: manifest({ backendURL }),
			ui: 'svelte',
			// #region docs:vendors-option
			vendors: [
				{
					id: 'posthog',
					name: 'PostHog',
					category: 'measurement',
					description: 'Product analytics and session insights.',
					privacyPolicyUrl: 'https://posthog.com/privacy',
				},
				{
					id: 'youtube',
					name: 'YouTube',
					category: 'measurement',
					description: 'Embedded videos.',
					privacyPolicyUrl: 'https://policies.google.com/privacy',
				},
				{
					id: 'x-pixel',
					name: 'X Pixel',
					category: 'marketing',
					description: 'Ad conversion tracking.',
					privacyPolicyUrl: 'https://x.com/en/privacy',
				},
			],
			// #endregion docs:vendors-option
		}),
	],
	output: 'server',
});
// #endregion docs:server-config
