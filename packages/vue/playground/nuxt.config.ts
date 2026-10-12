export default defineNuxtConfig({
	c15t: {
		backendURL: 'https://nuxt-consent-io.inth.app',
		consentCategories: ['necessary', 'measurement', 'marketing'],
	},
	devtools: { enabled: true },
	modules: ['../src/module'],
});
