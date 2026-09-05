import { fileURLToPath } from 'node:url';

const getBenchManifestURL = function getBenchManifestURL() {
	const token = process.env.C15T_BENCH_COLD_MANIFEST_TOKEN;
	const base =
		process.env.C15T_BENCH_MANIFEST_URL ??
		'http://127.0.0.1:4313/api/bench-consent/manifest';
	return token
		? `${base}${base.includes('?') ? '&' : '?'}cold=${encodeURIComponent(token)}`
		: base;
};

/**
 * Zero-consent baseline build: C15T_BENCH_BASELINE=1 omits the @c15t/vue
 * module (and its config) entirely so the /baseline scenario measures the
 * page's own floor. Two-build pattern, same as the CSS experiment.
 */
const baselineBuild = process.env.C15T_BENCH_BASELINE === '1';
const config = {
	...(baselineBuild && {
		buildDir: '.nuxt-baseline',
		nitro: { output: { dir: '.output-baseline' } },
	}),
	compatibilityDate: '2026-07-04',
	modules: baselineBuild ? [] : ['@c15t/vue'],
	routeRules: {
		'/baseline-client': { ssr: false },
		'/client': { ssr: false },
		'/client-manifest': { ssr: false },
	},
	runtimeConfig: {
		public: {
			benchBaseline: baselineBuild,
			c15t: {
				manifest: false,
			},
		},
	},
	typescript: {
		strict: true,
	},
	vite: {
		resolve: {
			alias: {
				/**
				 * Static consent mount per build (see app/consent-mount.vue).
				 * Baseline builds get an empty stub so they never reference
				 * `@c15t/vue`; full builds get a static `<ConsentRoot />` —
				 * dynamic-by-name global resolution costs +82ms banner-visible
				 * on client-manifest (mobile + 200ms).
				 */
				'#bench-consent-mount': fileURLToPath(
					new URL(
						baselineBuild
							? './app/consent-mount-baseline.vue'
							: './app/consent-mount.vue',
						import.meta.url
					)
				),
			},
		},
	},
};

if (baselineBuild) {
	Object.assign(config, {
		ignore: [
			'app/pages/ssr.vue',
			'app/pages/ssr-manifest.vue',
			'app/pages/client.vue',
			'app/pages/client-manifest.vue',
			'app/pages/repeat-visitor.vue',
			'app/components/**',
			'app/plugins/**',
		],
	});
} else {
	Object.assign(config, {
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
			manifest: true,
			manifestURL: getBenchManifestURL(),
			trapFocus: false,
		},
	});
}

export default defineNuxtConfig(config);
