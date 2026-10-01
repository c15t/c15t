// #region docs:static-config title="astro.config.mjs"
import { fileURLToPath } from 'node:url';

import svelte from '@astrojs/svelte';
import { defineConfig } from 'astro/config';
import c15t, { hosted } from 'c15t/astro';

// #hide docs
import { testBackend } from './test-backend.mjs';
// #endhide docs
export default defineConfig({
	integrations: [
		svelte(),
		c15t({
			clientEntrypoint: fileURLToPath(
				new URL('./src/consent-client.ts', import.meta.url)
			),
			mode: hosted({
				url: 'https://your-project.inth.app',
				// #hide docs
				...testBackend('url'),
				// #endhide docs
			}),
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
