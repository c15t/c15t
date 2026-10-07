import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
	c15t: {
		backendURL: 'https://your-project.inth.app',
		manifest: 'server',
	},
	modules: ['c15t/vue'],
});
