export default defineNuxtConfig({
	compatibilityDate: '2026-07-04',
	modules: ['@c15t/vue', './modules/c15t-vue-dist-alias'],
	c15t: {
		backendURL: '/api/bench-consent',
		consentCategories: [
			'necessary',
			'functionality',
			'experience',
			'measurement',
			'marketing',
		],
		disableAnimation: true,
		trapFocus: false,
	},
	routeRules: {
		'/client': { ssr: false },
	},
	typescript: {
		strict: true,
	},
});
