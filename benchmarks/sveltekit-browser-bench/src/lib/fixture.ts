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
		rejectAll: 'Reject All',
		customize: 'Customize',
		save: 'Save',
	},
	cookieBanner: {
		title: 'Benchmark Consent Banner',
		description: 'Benchmark fixture description.',
	},
	consentManagerDialog: {
		title: 'Benchmark Preferences',
		description: 'Benchmark preferences description.',
	},
	consentTypes: {
		necessary: {
			title: 'Necessary',
			description: 'Required cookies.',
		},
		functionality: {
			title: 'Functionality',
			description: 'Feature cookies.',
		},
		experience: {
			title: 'Experience',
			description: 'Experience cookies.',
		},
		measurement: {
			title: 'Measurement',
			description: 'Analytics cookies.',
		},
		marketing: {
			title: 'Marketing',
			description: 'Advertising cookies.',
		},
	},
};

const policy = {
	id: 'sveltekit-browser-bench',
	model: 'opt-in',
	consent: {
		model: 'opt-in',
		categories: [
			'necessary',
			'functionality',
			'experience',
			'measurement',
			'marketing',
		],
		scopeMode: 'strict',
	},
	ui: {
		mode: 'banner',
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
	},
};

const resolvedPolicy = {
	id: policy.id,
	model: policy.model,
	consent: policy.consent,
	ui: policy.ui,
	proof: {},
};

export const benchConsentManifestResponse = {
	schemaVersion: 1,
	revision: 'sveltekit-browser-bench-manifest',
	branding: 'c15t',
	policyPacks: [
		{
			policy: {
				...policy,
				match: { isDefault: true },
			},
			resolvedPolicy,
			fingerprint: 'fingerprint_sveltekit_browser_bench',
		},
	],
	translations: {
		i18n: {
			defaultProfile: 'default',
			messages: {
				default: {
					fallbackLanguage: 'en',
					translations: {
						en: benchConsentTranslations,
						de: benchConsentTranslations,
					},
				},
			},
		},
	},
} as unknown as ConsentManifest;
