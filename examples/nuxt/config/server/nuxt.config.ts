import { defineNuxtConfig } from 'nuxt/config';

// #region docs:nuxt-config title="nuxt.config.ts"
export default defineNuxtConfig({
	c15t: {
		backendURL: 'https://your-project.inth.app',
		manifest: 'server',
	},
	modules: ['c15t/vue'],
});
// #endregion docs:nuxt-config
