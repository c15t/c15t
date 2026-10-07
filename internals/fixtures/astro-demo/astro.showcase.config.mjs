import { fileURLToPath } from 'node:url';

import node from '@astrojs/node';
import react from '@astrojs/react';
import svelte from '@astrojs/svelte';
import vue from '@astrojs/vue';
import { defineConfig } from 'astro/config';
import c15t, { hosted, offline } from 'c15t/astro';

import { demoGvl, demoIabPolicy } from './demo-gvl.mjs';
import { testBackend } from './test-backend.mjs';

// The showcase build: offline policies, the IAB TCF surfaces and the
// dialog-framework comparison. `astro.config.mjs` selects it when no
// backend URL is set, or when `C15T_IAB` or `C15T_UI` is set. The server
// and static setups are `astro.server.config.mjs` and
// `astro.static.config.mjs`.

// Which framework renders the on-demand dialog islands. Real sites hardcode
// one; the demo takes it from the environment so the three builds can be
// compared side by side:
//
//   C15T_UI=react bun run --cwd internals/fixtures/astro-demo build
const ui = process.env.C15T_UI ?? 'svelte';

// Banner-shape experiment. The banner is server-rendered, so
// `@c15t/astro` has no built-in assignment and the arm is resolved per
// request: `src/experiment-middleware.ts` replaces the integration's
// middleware and reads `?experiment=1&arm=wall`, the way a flag provider
// would. `src/experiment-client.ts` pushes each impression and choice to
// `window.dataLayer`.
//
//   C15T_EXPERIMENT=1 bun run --cwd internals/fixtures/astro-demo dev
//
// Then open /consent-example?experiment=1&arm=wall.
const experiment = process.env.C15T_EXPERIMENT === '1';

// IAB TCF mode. The policy decides which surfaces a page gets, and one
// request resolves one policy, so the whole demo switches together:
//
//   C15T_IAB=1 bun run --cwd internals/fixtures/astro-demo dev
//
// Then open /iab. A real site has one mode; the flag is here so the TCF
// surfaces can be exercised without a second demo app.
const iab = process.env.C15T_IAB === '1';

// The acceptance suite's mock backend, when it sets one. Without it the
// showcase runs offline.
const { url: backendURL } = testBackend('url');

// Built up rather than spread conditionally: the IAB options and the mode
// travel together — a TCF policy pack with no vendor list resolves a
// banner the server cannot render.
const iabOptions = iab
	? {
			iab: { cmpId: 160, gvl: demoGvl },
			mode: offline({ policyRules: [demoIabPolicy] }),
		}
	: {
			mode: offline({
				policyRules: [
					{
						id: 'default',
						match: { fallback: true, isDefault: true },
						model: 'opt-in',
						prompt: 'choice',
					},
				],
			}),
		};

// Only the selected framework's Astro integration is listed. Loading all
// three would let a stray chunk from the others reach the page and make the
// bundle comparison meaningless.
const uiIntegrations = {
	react: react(),
	svelte: svelte(),
	vue: vue(),
};

// Static output, for the prerendered-site journey: every page is built
// once with no adapter, and the browser applies each visitor's policy and
// stored choice. Real static sites look like this; the example suite runs
// the same journeys against both builds.
//
//   C15T_ASTRO_OUTPUT=static bun run --cwd internals/fixtures/astro-demo build
const isStatic = process.env.C15T_ASTRO_OUTPUT === 'static';

// Server output otherwise, so the middleware sees a real request per
// visitor: geo headers, the GPC signal and the consent cookie all have to
// be read per request for the banner decision to be correct.
export default defineConfig({
	adapter: isStatic ? undefined : node({ mode: 'standalone' }),
	integrations: [
		uiIntegrations[ui],
		c15t({
			clientEntrypoint: fileURLToPath(
				new URL(
					experiment ? './src/experiment-client.ts' : './src/consent-client.ts',
					import.meta.url
				)
			),
			consentCategories: [
				'necessary',
				'functionality',
				'measurement',
				'marketing',
			],
			legalLinks: {
				cookiePolicy: { href: '/cookies', label: 'Cookie Policy' },
				privacyPolicy: { href: '/privacy', label: 'Privacy Policy' },
			},
			// `offline()` resolves policies locally, so the demo runs with no
			// backend. Swap in `hosted({ url })` or `manifest({ backendURL })`
			// to talk to a real one. With `C15T_IAB=1` it also carries the
			// vendor list the server needs to render the IAB banner at all;
			// hosted and manifest mode get theirs from `/init`.
			...iabOptions,
			mode: backendURL && !iab ? hosted({ url: backendURL }) : iabOptions.mode,
			scripts: [
				{
					category: 'measurement',
					id: 'demo-analytics',
					textContent:
						"window.__demoAnalyticsLoaded = true; document.querySelector('[data-testid=\"script-status\"]')?.setAttribute('data-loaded', 'true');",
				},
			],
			ui,
			// The video component reads client.isVendorAllowed('youtube'),
			// which is false for a vendor nothing declares.
			vendors: [
				{
					category: 'measurement',
					description: 'Embedded videos.',
					id: 'youtube',
					name: 'YouTube',
					privacyPolicyUrl: 'https://policies.google.com/privacy',
				},
			],
			...(experiment && {
				experiment: {
					arms: { wall: { prompt: { variant: 'wall' } } },
					id: 'banner-shape',
				},
				middleware: false,
			}),
		}),
		...(experiment
			? [
					{
						hooks: {
							'astro:config:setup': ({ addMiddleware }) => {
								addMiddleware({
									entrypoint: new URL(
										'./src/experiment-middleware.ts',
										import.meta.url
									),
									order: 'pre',
								});
							},
						},
						name: 'astro-demo:experiment-middleware',
					},
				]
			: []),
	],
	output: isStatic ? 'static' : 'server',
	// The bundle comparison reads this to walk the dialog chunk graph.
	vite: { build: { manifest: true } },
});
