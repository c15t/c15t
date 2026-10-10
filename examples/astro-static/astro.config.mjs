// #region docs:static-config title="astro.config.mjs"
import svelte from '@astrojs/svelte';
import { defineConfig } from 'astro/config';
import c15t, { hosted } from 'c15t/astro';

export default defineConfig({
	integrations: [svelte(), c15t({ mode: hosted() })],
});
// #endregion docs:static-config
