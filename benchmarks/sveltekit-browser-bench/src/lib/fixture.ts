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
import type { ConsentManifest } from '@c15t/schema/types';

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

const policy = {
	consent: {
		categories: [
			'necessary',
			'functionality',
			'experience',
			'measurement',
			'marketing',
		],
		model: 'opt-in',
		scopeMode: 'strict',
	},
	id: 'sveltekit-browser-bench',
	model: 'opt-in',
	ui: {
		banner: {
			allowedActions: ['reject', 'accept', 'customize'],
			primaryActions: ['accept'],
			scrollLock: false,
		},
		dialog: {
			allowedActions: ['reject', 'accept', 'customize'],
			primaryActions: ['accept'],
			scrollLock: false,
		},
		mode: 'banner',
	},
};

const resolvedPolicy = {
	consent: policy.consent,
	id: policy.id,
	model: policy.model,
	proof: {},
	ui: policy.ui,
};

export const benchConsentManifestResponse = {
	branding: 'c15t',
	policyPacks: [
		{
			fingerprint: 'fingerprint_sveltekit_browser_bench',
			policy: {
				...policy,
				match: { isDefault: true },
			},
			resolvedPolicy,
		},
	],
	revision: 'sveltekit-browser-bench-manifest',
	schemaVersion: 1,
	translations: {
		i18n: {
			defaultProfile: 'default',
			messages: {
				default: {
					fallbackLanguage: 'en',
					translations: {
						de: benchConsentTranslations,
						en: benchConsentTranslations,
					},
				},
			},
		},
	},
} as unknown as ConsentManifest;
