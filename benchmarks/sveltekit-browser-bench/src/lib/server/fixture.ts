/**
 * Consent backend fixture for the SvelteKit browser bench (server only).
 *
 * Mirrors `benchmarks/nuxt-browser-bench`'s `bench-consent` fixture: one
 * default-match opt-in policy pack, served both as a static manifest and as
 * a pre-resolved init payload, with per-endpoint execution counters and an
 * injectable latency so the runner can model a real consent backend.
 *
 * The app's own `/api/c15t/*` routes are the *shipped* `@c15t/svelte/kit`
 * handlers pointed at this fixture; nothing here re-implements them.
 */
import { setTimeout as sleep } from 'node:timers/promises';

import type { ConsentManifest } from '@c15t/schema/types';

/** Fixture endpoints the runner counts executions for. */
export type BenchConsentFixtureEndpoint = 'init' | 'manifest' | 'subjects';

/** Execution counts, keyed by endpoint. */
export type BenchConsentFixtureCounts = Record<
	BenchConsentFixtureEndpoint,
	number
>;

const globalWithBenchCounts = globalThis as typeof globalThis & {
	__c15tSvelteKitBenchFixtureCounts?: BenchConsentFixtureCounts;
};

const getMutableCounts =
	function getMutableCounts(): BenchConsentFixtureCounts {
		globalWithBenchCounts.__c15tSvelteKitBenchFixtureCounts ??= {
			init: 0,
			manifest: 0,
			subjects: 0,
		};
		return globalWithBenchCounts.__c15tSvelteKitBenchFixtureCounts;
	};

/**
 * Record one execution of a fixture endpoint.
 *
 * @param endpoint - The endpoint that just ran.
 */
export const recordBenchConsentFixtureExecution =
	function recordBenchConsentFixtureExecution(
		endpoint: BenchConsentFixtureEndpoint
	): void {
		getMutableCounts()[endpoint] += 1;
	};

/**
 * Read the current execution counts.
 *
 * @returns A copy of the counters.
 */
export const getBenchConsentFixtureCounts =
	function getBenchConsentFixtureCounts(): BenchConsentFixtureCounts {
		return { ...getMutableCounts() };
	};

/**
 * Zero the execution counters.
 *
 * @returns The zeroed counters.
 */
export const resetBenchConsentFixtureCounts =
	function resetBenchConsentFixtureCounts(): BenchConsentFixtureCounts {
		const counts = getMutableCounts();
		counts.init = 0;
		counts.manifest = 0;
		counts.subjects = 0;
		return getBenchConsentFixtureCounts();
	};

/**
 * Sleep for `C15T_BENCH_INIT_LATENCY_MS`, modelling backend round-trip time.
 *
 * The runner sets it per condition; `0` (the default) is a no-op.
 */
export const applyBenchConsentLatency =
	async function applyBenchConsentLatency(): Promise<void> {
		const latencyMs = Number(process.env.C15T_BENCH_INIT_LATENCY_MS ?? '0');
		if (Number.isFinite(latencyMs) && latencyMs > 0) {
			await sleep(latencyMs);
		}
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

/** Pre-resolved `/init` payload, for the direct (non-manifest) arms. */
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
		fingerprint: 'fingerprint_sveltekit_browser_bench',
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

/** Static manifest, for the manifest arms. */
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
