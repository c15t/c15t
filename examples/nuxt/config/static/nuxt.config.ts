import { defineNuxtConfig } from 'nuxt/config';

// #region docs:static-config title="nuxt.config.ts"
export default defineNuxtConfig({
	c15t: {
		backendURL: 'https://your-project.inth.app',
		manifest: 'client',
		manifestURL: 'https://your-project.inth.app/manifest',
	},
	modules: ['c15t/vue'],
	ssr: false,
});
// #endregion docs:static-config
