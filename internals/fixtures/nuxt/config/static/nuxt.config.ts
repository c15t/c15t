import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
	c15t: {
		backendURL: 'https://your-project.inth.app',
		manifest: 'client',
		manifestURL: 'https://your-project.inth.app/manifest',
	},
	modules: ['c15t/vue'],
	ssr: false,
});
