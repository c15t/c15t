import { manifest } from 'c15t/vue';
import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
	c15t: {
		backendURL: 'https://your-project.inth.app',
		// The acceptance suite tests runtime fetching here: a backend outage
		// and a backend URL set at start. `examples/nuxt` covers the bundled
		// default.
		mode: manifest({ source: 'runtime' }),
	},
	modules: ['c15t/vue'],
});
