import { defineNuxtConfig } from 'nuxt/config';

// #region docs:static-config title="nuxt.config.ts"
const backendURL = process.env.NUXT_PUBLIC_C15T_BACKEND_URL;

export default defineNuxtConfig({
	c15t: {
		backendURL,
		manifest: 'client',
		manifestURL: `${backendURL}/manifest`,
	},
	modules: ['c15t/vue'],
	ssr: false,
});
// #endregion docs:static-config
