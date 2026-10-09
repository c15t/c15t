// #region docs:server-config title="astro.config.mjs"
import { fileURLToPath } from 'node:url';

import node from '@astrojs/node';
import svelte from '@astrojs/svelte';
import { defineConfig } from 'astro/config';
import c15t, { manifest } from 'c15t/astro';

// #hide docs
// The demo project, so the example runs without setting the variable.
process.env.PUBLIC_C15T_BACKEND_URL ??= 'https://benchmarks-inth.inth.app';
// #endhide docs

export default defineConfig({
	adapter: node({ mode: 'standalone' }),
	integrations: [
		svelte(),
		c15t({
			clientEntrypoint: fileURLToPath(
				new URL('./src/consent-client.ts', import.meta.url)
			),
			// Reads PUBLIC_C15T_BACKEND_URL.
			mode: manifest(),
			ui: 'svelte',
		}),
	],
	output: 'server',
});
// #endregion docs:server-config
