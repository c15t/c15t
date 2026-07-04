export default defineNuxtConfig({
	compatibilityDate: '2026-07-04',
	modules: ['@c15t/vue', './modules/c15t-vue-dist-alias'],
	c15t: {
		backendURL: '/api/bench-consent',
		manifest: true,
		manifestURL:
			process.env.C15T_BENCH_MANIFEST_URL ??
			'http://127.0.0.1:4313/api/bench-consent/manifest',
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
