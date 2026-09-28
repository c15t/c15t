// The smallest site that shows which stylesheets a dialog island's page
// ends up with. `src/__tests__/astro-build.test.ts` builds it once per `ui`.
import react from '@astrojs/react';
import svelte from '@astrojs/svelte';
import c15t, { offline } from '@c15t/astro';
import { defineConfig } from 'astro/config';

const ui = process.env.C15T_UI ?? 'svelte';

export default defineConfig({
	integrations: [
		ui === 'react' ? react() : svelte(),
		c15t({
			endpoints: false,
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
			ui,
		}),
	],
	vite: {
		cacheDir: process.env.C15T_VITE_CACHE_DIR,
	},
});
