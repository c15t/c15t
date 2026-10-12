// #region docs:astro-config title="astro.config.mjs"
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import c15t, { offline } from 'c15t/astro';

export default defineConfig({
	integrations: [
		svelte(),
		c15t({
			mode: offline({
				policyRules: [
					{
						id: 'tailwind-matrix',
						match: { isDefault: true },
						model: 'opt-in',
						prompt: 'choice',
					},
				],
			}),
		}),
	],
	vite: { plugins: [tailwindcss()] },
});
// #endregion docs:astro-config
