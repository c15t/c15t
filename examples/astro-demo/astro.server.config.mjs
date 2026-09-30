// #region docs:server-config title="astro.config.mjs"
import { fileURLToPath } from 'node:url';

import node from '@astrojs/node';
import svelte from '@astrojs/svelte';
import { defineConfig } from 'astro/config';
import c15t, { manifest } from 'c15t/astro';

// #hide docs
import { testBackend } from './test-backend.mjs';
// #endhide docs
export default defineConfig({
	adapter: node({ mode: 'standalone' }),
	integrations: [
		svelte(),
		c15t({
			clientEntrypoint: fileURLToPath(
				new URL('./src/consent-client.ts', import.meta.url)
			),
			mode: manifest({
				backendURL: 'https://your-project.inth.app',
				// #hide docs
				...testBackend('backendURL'),
				// #endhide docs
			}),
			ui: 'svelte',
			// #hide docs
			// Demo-only: the example suite's vendor scenario.
			// #region docs:vendors-option title="astro.config.mjs (partial)"
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
			// #endregion docs:vendors-option
			// #endhide docs
		}),
	],
	output: 'server',
});
// #endregion docs:server-config
