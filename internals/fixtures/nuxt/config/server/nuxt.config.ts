import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
	c15t: {
		backendURL: 'https://your-project.inth.app',
		// The acceptance suite tests runtime fetching here: a backend outage
		// and a backend URL set at start. `examples/nuxt` covers the bundled
		// default.
		buildManifest: false,
		manifest: 'server',
	},
	modules: ['c15t/vue'],
});
