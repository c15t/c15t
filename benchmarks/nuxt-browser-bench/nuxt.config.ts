function getBenchManifestURL() {
	const token = process.env.C15T_BENCH_COLD_MANIFEST_TOKEN;
	const base =
		process.env.C15T_BENCH_MANIFEST_URL ??
		'http://127.0.0.1:4313/api/bench-consent/manifest';
	return token
		? `${base}${base.includes('?') ? '&' : '?'}cold=${encodeURIComponent(token)}`
		: base;
}

/**
 * Zero-consent baseline build: C15T_BENCH_BASELINE=1 omits the @c15t/vue
 * module (and its config) entirely so the /baseline scenario measures the
 * page's own floor. Two-build pattern, same as the CSS experiment.
 */
const baselineBuild = process.env.C15T_BENCH_BASELINE === '1';

export default defineNuxtConfig({
	compatibilityDate: '2026-07-04',
	modules: baselineBuild ? [] : ['@c15t/vue'],
	...(baselineBuild
		? {}
		: {
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
			}),
	runtimeConfig: {
		public: {
			c15t: {
				manifest: false,
			},
			benchBaseline: baselineBuild,
		},
	},
	...(baselineBuild
		? {
				ignore: [
					'app/pages/ssr.vue',
					'app/pages/ssr-manifest.vue',
					'app/pages/client.vue',
					'app/pages/client-manifest.vue',
					'app/pages/repeat-visitor.vue',
					'app/components/**',
					'app/plugins/**',
				],
			}
		: {}),
	routeRules: {
		'/client': { ssr: false },
		'/client-manifest': { ssr: false },
		'/baseline-client': { ssr: false },
	},
	typescript: {
		strict: true,
	},
});
