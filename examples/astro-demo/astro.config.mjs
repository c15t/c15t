import node from '@astrojs/node';
import react from '@astrojs/react';
import svelte from '@astrojs/svelte';
import vue from '@astrojs/vue';
import c15t, { offline } from '@c15t/astro';
import { defineConfig } from 'astro/config';

import { demoGvl, demoIabPolicy } from './demo-gvl.mjs';

// Which framework renders the on-demand dialog islands. Real sites hardcode
// one; the demo takes it from the environment so the three builds can be
// compared side by side:
//
//   C15T_UI=react bun run --cwd examples/astro-demo build
const ui = process.env.C15T_UI ?? 'svelte';

// IAB TCF mode. The policy decides which surfaces a page gets, and one
// request resolves one policy, so the whole demo switches together:
//
//   C15T_IAB=1 bun run --cwd examples/astro-demo dev
//
// Then open /iab. A real site has one mode; the flag is here so the TCF
// surfaces can be exercised without a second demo app.
const iab = process.env.C15T_IAB === '1';

// Built up rather than spread conditionally: the IAB options and the mode
// travel together — a TCF policy pack with no vendor list resolves a
// banner the server cannot render.
const iabOptions = iab
	? {
			iab: { cmpId: 160, gvl: demoGvl },
			mode: offline({ policyPacks: [demoIabPolicy] }),
		}
	: { mode: offline() };

// Only the selected framework's Astro integration is listed. Loading all
// three would let a stray chunk from the others reach the page and make the
// bundle comparison meaningless.
const uiIntegrations = {
	react: react(),
	svelte: svelte(),
	vue: vue(),
};

// Server output so the middleware sees a real request per visitor: geo
// headers, the GPC signal and the consent cookie all have to be read
// per request for the banner decision to be correct.
export default defineConfig({
	adapter: node({ mode: 'standalone' }),
	integrations: [
		uiIntegrations[ui],
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
			// to talk to a real one. With `C15T_IAB=1` it also carries the
			// vendor list the server needs to render the IAB banner at all;
			// hosted and manifest mode get theirs from `/init`.
			...iabOptions,
			scripts: [
				{
					category: 'measurement',
					id: 'demo-analytics',
					textContent:
						"window.__demoAnalyticsLoaded = true; document.querySelector('[data-testid=\"script-status\"]')?.setAttribute('data-loaded', 'true');",
				},
			],
			ui,
		}),
	],
	output: 'server',
	// The bundle comparison reads this to walk the dialog chunk graph.
	vite: { build: { manifest: true } },
});
