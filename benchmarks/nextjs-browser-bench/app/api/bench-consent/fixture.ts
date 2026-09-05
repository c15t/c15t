import { setTimeout as sleep } from 'node:timers/promises';

import {
	buildBrowserBenchManifest,
	loadBrowserBenchInit,
} from '@c15t/benchmarking/policy-fixtures';

export type BenchConsentFixtureEndpoint = 'init' | 'manifest' | 'subjects';

export type BenchConsentFixtureCounts = Record<
	BenchConsentFixtureEndpoint,
	number
>;

const globalWithBenchCounts = globalThis as typeof globalThis & {
	__c15tNextBenchFixtureCounts?: BenchConsentFixtureCounts;
};

const getMutableBenchConsentFixtureCounts =
	function getMutableBenchConsentFixtureCounts(): BenchConsentFixtureCounts {
		globalWithBenchCounts.__c15tNextBenchFixtureCounts ??= {
			init: 0,
			manifest: 0,
			subjects: 0,
		};
		return globalWithBenchCounts.__c15tNextBenchFixtureCounts;
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

export const benchConsentManifestResponse = buildBrowserBenchManifest();
export const benchConsentInitResponse = loadBrowserBenchInit(
	benchConsentManifestResponse
);

export const applyBenchConsentLatency =
	async function applyBenchConsentLatency() {
		const latencyMs = Number(process.env.C15T_BENCH_INIT_LATENCY_MS ?? '0');
		if (Number.isFinite(latencyMs) && latencyMs > 0) {
			await sleep(latencyMs);
		}
	};
