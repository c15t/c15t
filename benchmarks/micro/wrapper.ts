import { join } from 'node:path';

import { BENCHMARK_SCHEMA_VERSION } from '@c15t/benchmarking/schema';
import type { BenchmarkResult } from '@c15t/benchmarking/schema';
import {
	getEnvironment,
	safeBaseSha,
	safeCommitSha,
	summarizeMetric,
	writeJson,
} from '@c15t/benchmarking/utils';
import { bench, run } from 'mitata';

export { bench };

export async function runMicroBenchmarkSuite(scenario: string): Promise<void> {
	const mitataResult = await run();
	const metrics = mitataResult.benchmarks.flatMap((trial) =>
		trial.runs
			.filter((trialRun) => trialRun.stats)
			.map((trialRun) =>
				summarizeMetric(
					trialRun.name,
					'ns',
					trialRun.stats?.samples.length
						? trialRun.stats.samples
						: [trialRun.stats?.avg ?? 0]
				)
			)
	);

	const result: BenchmarkResult = {
		schemaVersion: BENCHMARK_SCHEMA_VERSION,
		suite: 'core-runtime',
		package: '@c15t/benchmarks',
		framework: 'core',
		runtime: 'bun/mitata',
		scenario: `micro-${scenario}`,
		commitSha: safeCommitSha(),
		baseSha: safeBaseSha(),
		timestamp: new Date().toISOString(),
		environment: getEnvironment(),
		fixture: {
			name: `micro-${scenario}`,
			consentCount: 5,
			scriptCount: scenario === 'script-loader' ? 15 : 0,
			localeCount: scenario === 'translations' ? 4 : 1,
			themeComplexity: 'minimal',
		},
		metadata: {
			source: `benchmarks/micro/${scenario}.bench.ts`,
		},
		metrics,
		budgets: [],
		notes: ['Micro benchmarks use mitata and emit nanosecond samples.'],
	};

	const outputDir =
		process.env.BENCH_OUTPUT_DIR ?? '../.benchmarks/current/micro';
	writeJson(join(outputDir, `${scenario}.json`), result);
}
