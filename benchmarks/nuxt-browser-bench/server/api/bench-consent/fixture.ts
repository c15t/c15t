import { setTimeout as sleep } from 'node:timers/promises';

export type BenchConsentFixtureEndpoint = 'init' | 'manifest' | 'subjects';

export type BenchConsentFixtureCounts = Record<
	BenchConsentFixtureEndpoint,
	number
>;

const globalWithBenchCounts = globalThis as typeof globalThis & {
	__c15tNuxtBenchFixtureCounts?: BenchConsentFixtureCounts;
};

const getMutableBenchConsentFixtureCounts =
	function getMutableBenchConsentFixtureCounts(): BenchConsentFixtureCounts {
		globalWithBenchCounts.__c15tNuxtBenchFixtureCounts ??= {
			init: 0,
			manifest: 0,
			subjects: 0,
		};
		return globalWithBenchCounts.__c15tNuxtBenchFixtureCounts;
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

export type BenchConsentFixtureVersionHeaders = Record<
	BenchConsentFixtureEndpoint,
	string | null
>;

const globalWithVersionHeaders = globalThis as typeof globalThis & {
	__c15tNuxtBenchFixtureVersionHeaders?: BenchConsentFixtureVersionHeaders;
};

const getMutableBenchConsentFixtureVersionHeaders =
	function getMutableBenchConsentFixtureVersionHeaders(): BenchConsentFixtureVersionHeaders {
		globalWithVersionHeaders.__c15tNuxtBenchFixtureVersionHeaders ??= {
			init: null,
			manifest: null,
			subjects: null,
		};
		return globalWithVersionHeaders.__c15tNuxtBenchFixtureVersionHeaders;
	};

/**
 * Records the `x-c15t-version` request header the fixture endpoint
 * received. The @c15t/vue Nitro manifest proxy (and the core transports)
 * send it on every c15t-bound request — the e2e suite asserts the value
 * observed upstream matches the built c15t version.
 */
export const recordBenchConsentVersionHeader =
	function recordBenchConsentVersionHeader(
		endpoint: BenchConsentFixtureEndpoint,
		value: string | null | undefined
	): void {
		const versions = getMutableBenchConsentFixtureVersionHeaders();
		versions[endpoint] = value ?? null;
	};

export const getBenchConsentFixtureVersionHeaders =
	function getBenchConsentFixtureVersionHeaders(): BenchConsentFixtureVersionHeaders {
		return { ...getMutableBenchConsentFixtureVersionHeaders() };
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
	id: 'nuxt-browser-bench',
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
		fingerprint: 'fingerprint_nuxt_browser_bench',
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
			fingerprint: 'fingerprint_nuxt_browser_bench',
			policy: {
				...policy,
				match: { isDefault: true },
			},
			resolvedPolicy,
		},
	],
	revision: 'nuxt-browser-bench-manifest',
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
