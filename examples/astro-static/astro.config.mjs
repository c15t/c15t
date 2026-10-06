// #region docs:static-config title="astro.config.mjs"
import { fileURLToPath } from 'node:url';

import svelte from '@astrojs/svelte';
import { defineConfig } from 'astro/config';
import c15t, { hosted } from 'c15t/astro';

export default defineConfig({
	integrations: [
		svelte(),
		c15t({
			clientEntrypoint: fileURLToPath(
				new URL('./src/consent-client.ts', import.meta.url)
			),
			mode: hosted({ url: 'https://your-project.inth.app' }),
			ui: 'svelte',
		}),
	],
	output: 'static',
});
// #endregion docs:static-config
