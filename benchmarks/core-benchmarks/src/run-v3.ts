#!/usr/bin/env bun
/**
 * v3 kernel benchmark runner.
 *
 * Mirrors the structure of run.ts (the v2 runner) so apples-to-apples
 * comparisons are possible via benchmarks/shared/run-compare.ts.
 *
 * Outputs to .benchmarks/current/core-v3-runtime/<fixture>.json.
 * Attaches coreRuntimeV3Budgets + kernel-specific invariants.
 */
import { join } from 'node:path';
import {
	BENCHMARK_SCHEMA_VERSION,
	type BenchmarkResult,
	coreFixtures,
	coreRuntimeV3Budgets,
	getEnvironment,
	safeBaseSha,
	safeCommitSha,
	summarizeMetric,
	writeJson,
} from '@c15t/benchmarking';
import { createConsentKernel } from 'c15t/v3';

function measureSync(iterations: number, fn: () => void): number[] {
	const samples: number[] = [];
	for (let index = 0; index < iterations; index += 1) {
		const start = performance.now();
		fn();
		samples.push((performance.now() - start) * 1000);
	}
	return samples;
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

const ITERATIONS = Number(process.env.BENCH_ITERATIONS ?? '25');
const outputDir = process.env.BENCH_OUTPUT_DIR ?? '.benchmarks/core-v3-runtime';

for (const fixture of Object.values(coreFixtures)) {
	// Kernel construction — must be pure, allocation only.
	const createKernelSamples = measureSync(ITERATIONS, () => {
		createConsentKernel({
			initialOverrides: { country: 'US', language: 'en' },
		});
	});

	// Snapshot read — reference return, cheap.
	const getSnapshotSamples = measureSync(ITERATIONS, () => {
		const kernel = createConsentKernel();
		kernel.getSnapshot();
	});

	// Subscribe + unsubscribe — listener bookkeeping cost.
	const subscribeSamples = measureSync(ITERATIONS, () => {
		const kernel = createConsentKernel();
		const unsubscribe = kernel.subscribe(() => {});
		unsubscribe();
	});

	// Sync mutation — produce new frozen snapshot + notify.
	const setConsentSamples = measureSync(ITERATIONS, () => {
		const kernel = createConsentKernel();
		kernel.set.consent({ marketing: true });
	});

	// Save all — full commit + listener notify + event emit.
	const saveAllSamples = await measureAsync(ITERATIONS, async () => {
		const kernel = createConsentKernel();
		await kernel.commands.save('all');
	});

	// Repeat visitor equivalent — save then init.
	const repeatVisitorSamples = await measureAsync(ITERATIONS, async () => {
		const kernel = createConsentKernel();
		await kernel.commands.save('all');
		await kernel.commands.init();
	});

	// Init command — currently returns immediately with ok; baseline for
	// when boot modules wire in SSR hydration and banner fetch.
	const initSamples = await measureAsync(ITERATIONS, async () => {
		const kernel = createConsentKernel();
		await kernel.commands.init();
	});

	// Identify — user mutation path.
	const identifySamples = await measureAsync(ITERATIONS, async () => {
		const kernel = createConsentKernel();
		await kernel.commands.identify({ externalId: 'bench-user' });
	});

	const result: BenchmarkResult = {
		schemaVersion: BENCHMARK_SCHEMA_VERSION,
		suite: 'core-runtime',
		package: '@c15t/core-benchmarks',
		framework: 'core-v3',
		runtime: 'bun',
		scenario: fixture.name,
		commitSha: safeCommitSha(),
		baseSha: safeBaseSha(),
		timestamp: new Date().toISOString(),
		environment: getEnvironment(),
		fixture,
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
		budgetDefinitions: coreRuntimeV3Budgets,
		budgets: [],
		notes: [
			'v3 kernel benchmarks. Pure construction, no side effects.',
			'Boot modules (persistence, blockers, banner fetch) are not measured here — they run post-mount in the adapter.',
			'Delta thresholds in coreRuntimeV3Budgets target −50% on init/repeatVisitor vs v2.',
		],
	};

	writeJson(join(outputDir, `${fixture.name}.json`), result);
}
