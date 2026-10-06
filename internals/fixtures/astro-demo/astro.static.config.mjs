import { fileURLToPath } from 'node:url';

import svelte from '@astrojs/svelte';
import { defineConfig } from 'astro/config';
import c15t, { hosted } from 'c15t/astro';

import { testBackend } from './test-backend.mjs';

export default defineConfig({
	integrations: [
		svelte(),
		c15t({
			clientEntrypoint: fileURLToPath(
				new URL('./src/consent-client.ts', import.meta.url)
			),
			mode: hosted({
				url: 'https://your-project.inth.app',
				...testBackend('url'),
			}),
			ui: 'svelte',
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
		}),
	],
	output: 'static',
});
