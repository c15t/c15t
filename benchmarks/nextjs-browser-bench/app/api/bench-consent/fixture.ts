import { setTimeout as sleep } from 'node:timers/promises';

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
	id: 'nextjs-browser-bench',
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

export const benchConsentInitResponse = {
	branding: 'c15t',
	jurisdiction: 'NONE',
	location: {
		countryCode: null,
		regionCode: null,
	},
	translations: {
		language: 'en',
		translations: benchConsentTranslations,
	},
	policy: resolvedPolicy,
	policyDecision: {
		policyId: policy.id,
		fingerprint: 'fingerprint_nextjs_browser_bench',
		matchedBy: 'default',
		country: null,
		region: null,
		jurisdiction: 'NONE',
	},
};

export const benchConsentManifestResponse = {
	schemaVersion: 1,
	revision: 'nextjs-browser-bench-manifest',
	branding: 'c15t',
	policyPacks: [
		{
			policy: {
				...policy,
				match: { isDefault: true },
			},
			resolvedPolicy,
			fingerprint: 'fingerprint_nextjs_browser_bench',
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
					},
				},
			},
		},
	},
};

export async function applyBenchConsentLatency() {
	const latencyMs = Number(process.env.C15T_BENCH_INIT_LATENCY_MS ?? '0');
	if (Number.isFinite(latencyMs) && latencyMs > 0) {
		await sleep(latencyMs);
	}
}
