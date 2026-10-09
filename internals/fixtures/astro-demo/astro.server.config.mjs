import node from '@astrojs/node';
import svelte from '@astrojs/svelte';
import { defineConfig } from 'astro/config';
import c15t, { manifest } from 'c15t/astro';

import { testBackend } from './test-backend.mjs';

export default defineConfig({
	adapter: node({ mode: 'standalone' }),
	integrations: [
		svelte(),
		c15t({
			backendURL: 'https://your-project.inth.app',
			...testBackend('backendURL'),
			clientEntrypoint: './src/consent-client.ts',
			// The acceptance suite tests a backend outage during server
			// rendering, so the server fetches the policy at runtime.
			// `examples/astro` covers the bundled default.
			mode: manifest({ source: 'runtime' }),
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
	output: 'server',
});
