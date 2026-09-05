import {
	buildBrowserBenchManifest,
	loadBrowserBenchInit,
} from '@c15t/benchmarking/policy-fixtures';
/**
 * Consent backend fixture for the SvelteKit browser bench.
 *
 * Mirrors benchmarks/nuxt-browser-bench's bench-consent fixture: one
 * default-match opt-in policy pack served from a static manifest. The
 * `/api/c15t/init` route resolves init responses from this manifest with
 * `resolveInitFromManifest` — the same resolution the @c15t/vue Nitro
 * init handler performs — so the SvelteKit app exercises manifest-based
 * SSR like the Next/Nuxt benches.
 */

export const benchConsentTranslations = {
	common: {
		acceptAll: 'Accept All',
		customize: 'Customize',
		rejectAll: 'Reject All',
		save: 'Save',
	},
	consentManagerDialog: {
		description: 'Benchmark preferences description.',
		title: 'Benchmark Preferences',
	},
	consentTypes: {
		experience: {
			description: 'Experience cookies.',
			title: 'Experience',
		},
		functionality: {
			description: 'Feature cookies.',
			title: 'Functionality',
		},
		marketing: {
			description: 'Advertising cookies.',
			title: 'Marketing',
		},
		measurement: {
			description: 'Analytics cookies.',
			title: 'Measurement',
		},
		necessary: {
			description: 'Required cookies.',
			title: 'Necessary',
		},
	},
	cookieBanner: {
		description: 'Benchmark fixture description.',
		title: 'Benchmark Consent Banner',
	},
};

export const benchConsentManifestResponse = buildBrowserBenchManifest();
export const benchConsentInitResponse = loadBrowserBenchInit(
	benchConsentManifestResponse
);
