import { setTimeout as sleep } from 'node:timers/promises';

import { resolvePolicyRules, writePolicyResolutionWire } from '@c15t/core';

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

const resolution = resolvePolicyRules({
	countryCode: null,
	regionCode: null,
	rules: [
		{
			id: 'tanstack-start-browser-bench',
			match: { fallback: true },
			model: 'opt-in',
			prompt: 'choice',
		},
	],
});
if (resolution.status !== 'matched') {
	throw new Error('Expected fixture policy');
}
const rule = resolution.policy;
const { fingerprints } = resolution;
const policyResolution = writePolicyResolutionWire(resolution);

export const benchConsentInitResponse = {
	branding: 'c15t',
	jurisdiction: 'NONE',
	location: {
		countryCode: null,
		regionCode: null,
	},
	policyResolution,
	translations: {
		language: 'en',
		translations: benchConsentTranslations,
	},
};

export const benchConsentManifestResponse = {
	branding: 'c15t',
	policyPacks: [{ fingerprints, match: { fallback: true }, rule }],
	revision: 'nextjs-browser-bench-manifest',
	schemaVersion: 2,
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
