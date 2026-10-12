import { manifest } from 'c15t/vue';
import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
	c15t: {
		backendURL: 'https://your-project.inth.app',
		// No server: the browser reads the backend's manifest and resolves the
		// policy itself.
		mode: manifest({ resolve: 'browser', source: 'runtime' }),
		routePrefix: false,
	},
	modules: ['c15t/vue'],
	ssr: false,
});
