// The smallest site that shows which stylesheets a dialog island's page
// ends up with. `src/__tests__/astro-build.test.ts` builds it once per `ui`.
import react from '@astrojs/react';
import svelte from '@astrojs/svelte';
import c15t, { offline } from '@c15t/astro';
import { MINIMAL_GVL } from '@c15t/conformance/fixtures/gvl';
import { defineConfig } from 'astro/config';

const ui = process.env.C15T_UI ?? 'svelte';
const iab = process.env.C15T_IAB === '1';
const deferred = process.env.C15T_DEFERRED === '1';

export default defineConfig({
	adapter: deferred
		? {
				hooks: {
					'astro:config:done': ({ setAdapter }) => {
						setAdapter({
							entrypointResolution: 'auto',
							name: 'c15t:test-server-island',
							serverEntrypoint: new URL('./server.mjs', import.meta.url),
							supportedAstroFeatures: {
								i18nDomains: 'stable',
								serverOutput: 'stable',
								sharpImageService: 'stable',
								staticOutput: 'stable',
							},
						});
					},
				},
				name: 'c15t:test-server-island',
			}
		: undefined,
	cacheDir: process.env.C15T_ASTRO_CACHE_DIR,
	integrations: [
		...(deferred
			? [
					{
						hooks: {
							'astro:config:setup': ({ injectRoute }) => {
								injectRoute({
									entrypoint: new URL('./deferred.astro', import.meta.url),
									pattern: '/deferred',
									prerender: false,
								});
							},
						},
						name: 'c15t:test-deferred-route',
					},
				]
			: []),
		ui === 'react' ? react() : svelte(),
		c15t({
			consentCategories: ['necessary', 'marketing'],
			endpoints: false,
			iab: iab ? { cmpId: 160, gvl: MINIMAL_GVL } : undefined,
			mode: offline({
				policyRules: [
					{
						categories: ['marketing'],
						id: 'default',
						match: { fallback: true, isDefault: true },
						model: iab ? 'iab' : 'opt-in',
						prompt: 'choice',
						scopeMode: 'permissive',
					},
				],
			}),
			ui,
		}),
	],
	vite: {
		cacheDir: process.env.C15T_VITE_CACHE_DIR,
	},
});
