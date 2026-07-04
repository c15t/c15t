export default defineNuxtConfig({
	modules: ['../src/module'],
	c15t: {
		backendURL: 'https://nuxt-consent-io.inth.app',
		manifest: true,
		consentCategories: ['necessary', 'measurement', 'marketing'],
	},
	devtools: { enabled: true },
});
