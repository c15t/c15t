export default defineNuxtConfig({
	modules: ['@c15t/vue'],
	c15t: {
		backendURL: 'https://nuxt-consent-io.inth.app',
		consentCategories: ['necessary', 'measurement', 'marketing'],
	},
	devtools: { enabled: true },
});
