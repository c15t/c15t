// #region docs:server-config title="astro.config.mjs"
import node from '@astrojs/node';
import svelte from '@astrojs/svelte';
import { defineConfig } from 'astro/config';
import c15t from 'c15t/astro';

export default defineConfig({
	adapter: node({ mode: 'standalone' }),
	integrations: [svelte(), c15t()],
	output: 'server',
});
// #endregion docs:server-config
