#!/usr/bin/env node
/**
 * Consent kernel benchmark runner.
 *
 * Outputs one result per fixture. Imports stay on the narrow
 * `@c15t/benchmarking/*` subpaths: the package barrel pulls in the CSS
 * layer runtime, whose stylesheet imports cannot load under Node.
 *
 * Two budget families are attached to every result:
 * - `coreRuntimeBudgets` plus `coreRuntimeCoverageBudgets`: regression
 *   ceilings against the same-key base artifact.
 * - `coreRuntimeV3Budgets`: v3-over-v2 improvement thresholds. These
 *   target the `v2` base arm and are only evaluated when v2 artifacts are
 *   supplied to the comparison runner; they are never compared against a
 *   v3 base as if it were v2.
 */
import { join } from 'node:path';

import {
	coreRuntimeBudgets,
	coreRuntimeCoverageBudgets,
	coreRuntimeV3Budgets,
} from '@c15t/benchmarking/budgets';
import { coreFixtures } from '@c15t/benchmarking/fixtures';
import { BENCHMARK_SCHEMA_VERSION } from '@c15t/benchmarking/schema';
import type { BenchmarkResult } from '@c15t/benchmarking/schema';
import {
	getEnvironment,
	measureAsyncLoop,
	measureLoop,
	safeBaseSha,
	safeCommitSha,
	safeGitDirty,
	summarizeMetric,
	writeJson,
} from '@c15t/benchmarking/utils';
import { createConsentKernel } from '@c15t/core';

const ITERATIONS = Number(process.env.BENCH_ITERATIONS ?? '25');
const WARMUP = Number(process.env.BENCH_WARMUP_ITERATIONS ?? '10');
const outputDir = process.env.BENCH_OUTPUT_DIR ?? '.benchmarks/core-v3-runtime';

const measureSync = function measureSync(fn: () => void): number[] {
	measureLoop(WARMUP, fn);
	return measureLoop(ITERATIONS, fn);
};

const measureAsync = async function measureAsync(
	fn: () => Promise<void>
): Promise<number[]> {
	await measureAsyncLoop(WARMUP, fn);
	return await measureAsyncLoop(ITERATIONS, fn);
};

await Array.from(Object.values(coreFixtures)).reduce(
	async (previousIteration, fixture) => {
		await previousIteration;
		// Kernel construction — must be pure, allocation only.
		const createKernelSamples = measureSync(() => {
			createConsentKernel({
				initialOverrides: { country: 'US', language: 'en' },
			});
		});

		// Snapshot read — reference return, cheap.
		const getSnapshotSamples = measureSync(() => {
			const kernel = createConsentKernel();
			kernel.getSnapshot();
		});

		// Subscribe + unsubscribe — listener bookkeeping cost.
		const subscribeSamples = measureSync(() => {
			const kernel = createConsentKernel();
			const unsubscribe = kernel.subscribe(() => {
				/* empty */
			});
			unsubscribe();
		});

		// Sync mutation — produce new frozen snapshot + notify.
		const setConsentSamples = measureSync(() => {
			const kernel = createConsentKernel();
			kernel.set.consent({ marketing: true });
		});

		// Save all — full commit + listener notify + event emit.
		const saveAllSamples = await measureAsync(async () => {
			const kernel = createConsentKernel();
			await kernel.commands.save('all');
		});

		// Repeat visitor equivalent — save then init.
		const repeatVisitorSamples = await measureAsync(async () => {
			const kernel = createConsentKernel();
			await kernel.commands.save('all');
			await kernel.commands.init();
		});

		// Init command — currently returns immediately with ok; baseline for
		// when boot modules wire in SSR hydration and banner fetch.
		const initSamples = await measureAsync(async () => {
			const kernel = createConsentKernel();
			await kernel.commands.init();
		});

		// Identify — user mutation path.
		const identifySamples = await measureAsync(async () => {
			const kernel = createConsentKernel();
			await kernel.commands.identify({ externalId: 'bench-user' });
		});

		const result: BenchmarkResult = {
			baseSha: safeBaseSha(),
			budgetDefinitions: [
				...coreRuntimeBudgets,
				...coreRuntimeCoverageBudgets,
				...coreRuntimeV3Budgets,
			],
			budgets: [],
			commitSha: safeCommitSha(),
			environment: getEnvironment(),
			fixture,
			framework: 'core',
			metadata: {
				gitDirty: safeGitDirty(),
				iterations: ITERATIONS,
				warmupIterations: WARMUP,
			},
			metrics: [
				summarizeMetric('createConsentKernel', 'us', createKernelSamples),
				summarizeMetric('getSnapshot', 'us', getSnapshotSamples),
				summarizeMetric('subscribe', 'us', subscribeSamples),
				summarizeMetric('setConsent', 'us', setConsentSamples),
				summarizeMetric('saveAll', 'us', saveAllSamples),
				summarizeMetric('repeatVisitorInit', 'us', repeatVisitorSamples),
				summarizeMetric('initConsentManager', 'us', initSamples),
				summarizeMetric('identify', 'us', identifySamples),
			],
			notes: [
				'Kernel construction is pure and has no side effects.',
				'Boot modules are not measured here because adapters run them after mount.',
				'v3-over-v2 improvement budgets target the v2 base arm and stay unevaluated without v2 artifacts.',
			],
			package: '@c15t/core-benchmarks',
			runtime: process.versions.bun ? 'bun' : 'node',
			scenario: fixture.name,
			schemaVersion: BENCHMARK_SCHEMA_VERSION,
			suite: 'core-runtime',
			timestamp: new Date().toISOString(),
		};

		writeJson(join(outputDir, `${fixture.name}.json`), result);
	},
	Promise.resolve()
);
