import { setTimeout as sleep } from 'node:timers/promises';

export type BenchConsentFixtureEndpoint = 'init' | 'manifest' | 'subjects';

export type BenchConsentFixtureCounts = Record<
	BenchConsentFixtureEndpoint,
	number
>;

const globalWithBenchCounts = globalThis as typeof globalThis & {
	__c15tTanstackBenchFixtureCounts?: BenchConsentFixtureCounts;
};

const getMutableBenchConsentFixtureCounts =
	function getMutableBenchConsentFixtureCounts(): BenchConsentFixtureCounts {
		globalWithBenchCounts.__c15tTanstackBenchFixtureCounts ??= {
			init: 0,
			manifest: 0,
			subjects: 0,
		};
		return globalWithBenchCounts.__c15tTanstackBenchFixtureCounts;
	};

export const recordBenchConsentFixtureExecution =
	function recordBenchConsentFixtureExecution(
		endpoint: BenchConsentFixtureEndpoint
	): void {
		const counts = getMutableBenchConsentFixtureCounts();
		counts[endpoint] += 1;
		console.log(`[c15t-bench-fixture] ${endpoint} count=${counts[endpoint]}`);
	};

export const getBenchConsentFixtureCounts =
	function getBenchConsentFixtureCounts(): BenchConsentFixtureCounts {
		return { ...getMutableBenchConsentFixtureCounts() };
	};

export const resetBenchConsentFixtureCounts =
	function resetBenchConsentFixtureCounts(): BenchConsentFixtureCounts {
		const counts = getMutableBenchConsentFixtureCounts();
		counts.init = 0;
		counts.manifest = 0;
		counts.subjects = 0;
		return getBenchConsentFixtureCounts();
	};

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
	id: 'nextjs-browser-bench',
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

export const benchConsentInitResponse = {
	branding: 'c15t',
	jurisdiction: 'NONE',
	location: {
		countryCode: null,
		regionCode: null,
	},
	policy: resolvedPolicy,
	policyDecision: {
		country: null,
		fingerprint: 'fingerprint_nextjs_browser_bench',
		jurisdiction: 'NONE',
		matchedBy: 'default',
		policyId: policy.id,
		region: null,
	},
	translations: {
		language: 'en',
		translations: benchConsentTranslations,
	},
};

export const benchConsentManifestResponse = {
	branding: 'c15t',
	policyPacks: [
		{
			fingerprint: 'fingerprint_nextjs_browser_bench',

			policy: {
				...policy,
				match: { isDefault: true },
			},
			resolvedPolicy,
		},
	],
	revision: 'nextjs-browser-bench-manifest',
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
};

export const applyBenchConsentLatency =
	async function applyBenchConsentLatency() {
		const latencyMs = Number(process.env.C15T_BENCH_INIT_LATENCY_MS ?? '0');
		if (Number.isFinite(latencyMs) && latencyMs > 0) {
			await sleep(latencyMs);
		}
	};
