function getBenchManifestURL() {
	const token = process.env.C15T_BENCH_COLD_MANIFEST_TOKEN;
	const base =
		process.env.C15T_BENCH_MANIFEST_URL ??
		'http://127.0.0.1:4313/api/bench-consent/manifest';
	return token
		? `${base}${base.includes('?') ? '&' : '?'}cold=${encodeURIComponent(token)}`
		: base;
}

export default defineNuxtConfig({
	compatibilityDate: '2026-07-04',
	modules: ['@c15t/vue', './modules/c15t-vue-dist-alias'],
	c15t: {
		backendURL: '/api/bench-consent',
		manifest: true,
		manifestURL: getBenchManifestURL(),
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
	runtimeConfig: {
		public: {
			c15t: {
				manifest: false,
			},
		},
	},
	routeRules: {
		'/client': { ssr: false },
		'/client-manifest': { ssr: false },
	},
	typescript: {
		strict: true,
	},
});
