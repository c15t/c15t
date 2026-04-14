#!/usr/bin/env bun
import { join } from 'node:path';
import {
	BENCHMARK_SCHEMA_VERSION,
	type BenchmarkResult,
	coreFixtures,
	coreRuntimeBudgets,
	getEnvironment,
	safeBaseSha,
	safeCommitSha,
	summarizeMetric,
	writeJson,
} from '@c15t/benchmarking';
import {
	type ConsentState,
	configureConsentManager,
	createConsentManagerStore,
	deleteConsentFromStorage,
	getConsentFromStorage,
	saveConsentToStorage,
} from 'c15t';
import { ensureBenchmarkDom } from './runtime-setup';

ensureBenchmarkDom();

function createStateFromCategories(categories: string[]): ConsentState {
	const entries = categories.map((category) => [
		category,
		category === 'necessary',
	]);
	return Object.fromEntries(entries) as ConsentState;
}

async function measureAsync(
	iterations: number,
	fn: () => Promise<void>
): Promise<number[]> {
	const samples: number[] = [];
	for (let index = 0; index < iterations; index += 1) {
		const start = performance.now();
		await fn();
		samples.push((performance.now() - start) * 1000);
	}
	return samples;
}

function measureSync(iterations: number, fn: () => void): number[] {
	const samples: number[] = [];
	for (let index = 0; index < iterations; index += 1) {
		const start = performance.now();
		fn();
		samples.push((performance.now() - start) * 1000);
	}
	return samples;
}

const ITERATIONS = Number(process.env.BENCH_ITERATIONS ?? '25');
const outputDir = process.env.BENCH_OUTPUT_DIR ?? '.benchmarks/core-runtime';

for (const fixture of Object.values(coreFixtures)) {
	const manager = configureConsentManager({
		mode: 'offline',
		translations: fixture.translations,
	});

	const cookiePayload = {
		consents: createStateFromCategories(fixture.consentCategories),
		consentInfo: {
			time: Date.now(),
			subjectId: `subject-${fixture.name}`,
		},
	};

	const configureSamples = measureSync(ITERATIONS, () => {
		configureConsentManager({
			mode: 'offline',
			translations: fixture.translations,
		});
	});

	const createStoreSamples = measureSync(ITERATIONS, () => {
		createConsentManagerStore(manager, {
			initialConsentCategories: fixture.consentCategories as never,
			scripts: fixture.scripts,
		});
	});

	const getStateSamples = measureSync(ITERATIONS, () => {
		const store = createConsentManagerStore(manager, {
			initialConsentCategories: fixture.consentCategories as never,
			scripts: fixture.scripts,
		});
		store.getState().getDisplayedConsents();
	});

	const hasSamples = measureSync(ITERATIONS, () => {
		const store = createConsentManagerStore(manager, {
			initialConsentCategories: fixture.consentCategories as never,
			scripts: fixture.scripts,
		});
		for (const category of fixture.consentCategories) {
			store.getState().has(category as never);
		}
	});

	const initSamples = await measureAsync(ITERATIONS, async () => {
		const store = createConsentManagerStore(manager, {
			initialConsentCategories: fixture.consentCategories as never,
			scripts: fixture.scripts,
			translations: fixture.translations,
		});
		await store.getState().initConsentManager();
	});

	const repeatVisitorSamples = await measureAsync(ITERATIONS, async () => {
		const store = createConsentManagerStore(manager, {
			initialConsentCategories: fixture.consentCategories as never,
			scripts: fixture.scripts,
		});
		await store.getState().saveConsents('all');
		await store.getState().initConsentManager();
	});

	const cookieRoundTripSamples = measureSync(ITERATIONS, () => {
		saveConsentToStorage(cookiePayload);
		getConsentFromStorage();
		deleteConsentFromStorage();
	});

	const scriptUpdateSamples = measureSync(ITERATIONS, () => {
		const store = createConsentManagerStore(manager, {
			initialConsentCategories: fixture.consentCategories as never,
			scripts: fixture.scripts,
		});
		store.getState().updateScripts();
	});

	const result: BenchmarkResult = {
		schemaVersion: BENCHMARK_SCHEMA_VERSION,
		suite: 'core-runtime',
		package: '@c15t/core-benchmarks',
		framework: 'core',
		runtime: 'bun',
		scenario: fixture.name,
		commitSha: safeCommitSha(),
		baseSha: safeBaseSha(),
		timestamp: new Date().toISOString(),
		environment: getEnvironment(),
		fixture,
		metrics: [
			summarizeMetric('configureConsentManager', 'us', configureSamples),
			summarizeMetric('createConsentManagerStore', 'us', createStoreSamples),
			summarizeMetric('store.getDisplayedConsents', 'us', getStateSamples),
			summarizeMetric('has()', 'us', hasSamples),
			summarizeMetric('initConsentManager', 'us', initSamples),
			summarizeMetric('repeatVisitorInit', 'us', repeatVisitorSamples),
			summarizeMetric('cookieRoundTrip', 'us', cookieRoundTripSamples),
			summarizeMetric('updateScripts', 'us', scriptUpdateSamples),
		],
		budgetDefinitions: coreRuntimeBudgets,
		budgets: [],
		notes: [
			'Core runtime benchmarks use deterministic offline fixtures.',
			'All samples are emitted in microseconds for stable base-vs-head comparisons.',
		],
	};

	writeJson(join(outputDir, `${fixture.name}.json`), result);
}
