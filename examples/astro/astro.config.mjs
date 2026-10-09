// #region docs:server-config title="astro.config.mjs"
import { fileURLToPath } from 'node:url';

import node from '@astrojs/node';
import svelte from '@astrojs/svelte';
import { defineConfig } from 'astro/config';
import c15t, { manifest } from 'c15t/astro';

export default defineConfig({
	adapter: node({ mode: 'standalone' }),
	integrations: [
		svelte(),
		c15t({
			clientEntrypoint: fileURLToPath(
				new URL('./src/consent-client.ts', import.meta.url)
			),
			mode: manifest({
				backendURL:
					process.env.PUBLIC_C15T_BACKEND_URL ??
					'https://benchmarks-inth.inth.app',
			}),
			ui: 'svelte',
		}),
	],
	output: 'server',
});
// #endregion docs:server-config
