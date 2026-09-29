import { defineNuxtConfig } from 'nuxt/config';

// #region docs:nuxt-config title="nuxt.config.ts"
export default defineNuxtConfig({
	c15t: {
		backendURL: process.env.NUXT_PUBLIC_C15T_BACKEND_URL,
		manifest: 'server',
	},
	modules: ['c15t/vue'],
});
// #endregion docs:nuxt-config
