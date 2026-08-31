#!/usr/bin/env bun
import { join } from 'node:path';

import { coreRuntimeBudgets } from '@c15t/benchmarking/budgets';
import { coreFixtures } from '@c15t/benchmarking/fixtures';
import { BENCHMARK_SCHEMA_VERSION } from '@c15t/benchmarking/schema';
import type { BenchmarkResult } from '@c15t/benchmarking/schema';
import {
	getEnvironment,
	safeBaseSha,
	safeCommitSha,
	summarizeMetric,
	writeJson,
} from '@c15t/benchmarking/utils';
import {
	configureConsentManager,
	createConsentManagerStore,
	deleteConsentFromStorage,
	getConsentFromStorage,
	saveConsentToStorage,
} from '@c15t/core';
import type { ConsentState } from '@c15t/core';

import { ensureBenchmarkDom } from './runtime-setup';

ensureBenchmarkDom();

const createStateFromCategories = function createStateFromCategories(
	categories: string[]
): ConsentState {
	const entries = categories.map((category) => [
		category,
		category === 'necessary',
	]);
	return Object.fromEntries(entries) as ConsentState;
};

const measureAsync = async function measureAsync(
	iterations: number,
	fn: () => Promise<void>
): Promise<number[]> {
	const samples: number[] = [];
	{
		let index = 0;
		const runSequentialLoop1 =
			async function runSequentialLoop1(): Promise<void> {
				if (!(index < iterations)) {
					return;
				}
				const start = performance.now();
				await fn();
				samples.push((performance.now() - start) * 1000);

				index += 1;
				await runSequentialLoop1();
			};
		await runSequentialLoop1();
	}
	return samples;
};

const measureSync = function measureSync(
	iterations: number,
	fn: () => void
): number[] {
	const samples: number[] = [];
	for (let index = 0; index < iterations; index += 1) {
		const start = performance.now();
		fn();
		samples.push((performance.now() - start) * 1000);
	}
	return samples;
};

const ITERATIONS = Number(process.env.BENCH_ITERATIONS ?? '25');
const outputDir = process.env.BENCH_OUTPUT_DIR ?? '.benchmarks/core-runtime';

await Array.from(Object.values(coreFixtures)).reduce(
	async (previousIteration, fixture) => {
		await previousIteration;
		const manager = configureConsentManager({
			mode: 'offline',
			translations: fixture.translations,
		});

		const cookiePayload = {
			consentInfo: {
				subjectId: `subject-${fixture.name}`,
				time: Date.now(),
			},
			consents: createStateFromCategories(fixture.consentCategories),
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
			baseSha: safeBaseSha(),
			budgetDefinitions: coreRuntimeBudgets,
			budgets: [],
			commitSha: safeCommitSha(),
			environment: getEnvironment(),
			fixture,
			framework: 'core',
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
			notes: [
				'Core runtime benchmarks use deterministic offline fixtures.',
				'All samples are emitted in microseconds for stable base-vs-head comparisons.',
			],
			package: '@c15t/core-benchmarks',
			runtime: 'bun',
			scenario: fixture.name,
			schemaVersion: BENCHMARK_SCHEMA_VERSION,
			suite: 'core-runtime',
			timestamp: new Date().toISOString(),
		};

		writeJson(join(outputDir, `${fixture.name}.json`), result);
	},
	Promise.resolve()
);
