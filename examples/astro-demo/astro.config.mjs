import node from '@astrojs/node';
import svelte from '@astrojs/svelte';
import c15t, { offline } from '@c15t/astro';
import { defineConfig } from 'astro/config';

// Server output so the middleware sees a real request per visitor: geo
// headers, the GPC signal and the consent cookie all have to be read
// per request for the banner decision to be correct.
export default defineConfig({
	adapter: node({ mode: 'standalone' }),
	integrations: [
		svelte(),
		c15t({
			consentCategories: [
				'necessary',
				'functionality',
				'measurement',
				'marketing',
			],
			legalLinks: {
				cookiePolicy: { label: 'Cookie Policy', url: '/cookies' },
				privacyPolicy: { label: 'Privacy Policy', url: '/privacy' },
			},
			// `offline()` resolves policies locally, so the demo runs with no
			// backend. Swap in `hosted({ url })` or `manifest({ backendURL })`
			// to talk to a real one.
			mode: offline(),
			scripts: [
				{
					category: 'measurement',
					id: 'demo-analytics',
					textContent:
						"window.__demoAnalyticsLoaded = true; document.querySelector('[data-testid=\"script-status\"]')?.setAttribute('data-loaded', 'true');",
				},
			],
		}),
	],
	output: 'server',
});
