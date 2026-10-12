#!/usr/bin/env node
/**
 * Manifest-cache benchmark runner. Drives every scenario in `./scenarios`
 * against the simulated Vercel CDN in `./vercel-cdn`, prints a markdown
 * summary table, and writes one `BenchmarkResult`-shaped JSON file per
 * scenario to `BENCH_OUTPUT_DIR`.
 *
 * `--quick` skips `edge-unreachable-warm`, which spends ~50s of real
 * wall-clock time against the cache's internal 10s fetch timeout.
 * `edge-unreachable-cold` (~30s) still runs.
 */
import { join } from 'node:path';

import { BENCHMARK_SCHEMA_VERSION } from '@c15t/benchmarking/schema';
import type { BenchmarkResult } from '@c15t/benchmarking/schema';
import {
	getEnvironment,
	percentile,
	safeBaseSha,
	safeCommitSha,
	safeGitDirty,
	summarizeMetric,
	writeJson,
} from '@c15t/benchmarking/utils';

import { scenarioDefinitions, STALL_THRESHOLD_MS } from './scenarios';
import type { RequestSample, ScenarioResult } from './scenarios';

const quick = process.argv.includes('--quick');
const outputDir =
	process.env.BENCH_OUTPUT_DIR ?? '../../.benchmarks/current/manifest-cache';

interface LatencyStats {
	min: number;
	p50: number;
	p95: number;
	max: number;
}

const summarizeLatency = function summarizeLatency(
	samples: RequestSample[]
): LatencyStats {
	const latencies = samples.map((sample) => sample.latencyMs);
	if (latencies.length === 0) {
		return { max: 0, min: 0, p50: 0, p95: 0 };
	}
	return {
		max: Number(Math.max(...latencies).toFixed(2)),
		min: Number(Math.min(...latencies).toFixed(2)),
		p50: Number(percentile(latencies, 50).toFixed(2)),
		p95: Number(percentile(latencies, 95).toFixed(2)),
	};
};

const countStalls = function countStalls(
	samples: RequestSample[],
	thresholdMs = STALL_THRESHOLD_MS
): number {
	return samples.filter((sample) => sample.latencyMs > thresholdMs).length;
};

const formatMs = function formatMs(value: number): string {
	return `${value.toFixed(2)}`;
};

const buildMarkdownTable = function buildMarkdownTable(
	rows: {
		result: ScenarioResult;
		stats: LatencyStats;
		resolved: number;
		rejected: number;
		stalls: number;
		manifestOk: boolean;
	}[]
): string {
	const header = `| Scenario | Requests | Resolved | Rejected | Min (ms) | p50 (ms) | p95 (ms) | Max (ms) | Stalls >${STALL_THRESHOLD_MS}ms | App→CDN calls | CDN→origin | CDN fresh hits | CDN 304s | CDN stale serves | Manifest OK | Duration (ms) |`;
	const divider =
		'| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |';
	const body = rows.map(
		({ result, stats, resolved, rejected, stalls, manifestOk }) =>
			[
				result.name,
				result.samples.length,
				resolved,
				rejected,
				formatMs(stats.min),
				formatMs(stats.p50),
				formatMs(stats.p95),
				formatMs(stats.max),
				stalls,
				result.edgeCalls,
				result.counters.originHits,
				result.counters.edgeHits,
				result.counters.notModified,
				result.counters.staleServes,
				manifestOk ? 'yes' : 'no',
				formatMs(result.durationMs),
			]
				.map(String)
				.join(' | ')
	);
	return [header, divider, ...body.map((line) => `| ${line} |`)].join('\n');
};

const runAll = async function runAll(): Promise<void> {
	const rows: {
		result: ScenarioResult;
		stats: LatencyStats;
		resolved: number;
		rejected: number;
		stalls: number;
		manifestOk: boolean;
	}[] = [];

	for (const scenario of scenarioDefinitions) {
		if (quick && scenario.quickSkip) {
			console.log(`Skipping ${scenario.name} (--quick).`);
			continue;
		}
		console.log(`Running ${scenario.name}...`);
		// oxlint-disable-next-line no-await-in-loop -- Scenarios share process-wide timers and must run one at a time.
		const result = await scenario.run();
		const stats = summarizeLatency(result.samples);
		const resolved = result.samples.filter(
			(sample) => sample.outcome === 'resolved'
		).length;
		const rejected = result.samples.length - resolved;
		const stalls = countStalls(result.samples);
		const manifestOk = result.samples.some(
			(sample) =>
				sample.outcome === 'resolved' && Boolean(sample.manifestRevision)
		);
		rows.push({ manifestOk, rejected, resolved, result, stalls, stats });

		const benchmarkResult: BenchmarkResult = {
			baseSha: safeBaseSha(),
			budgets: [],
			commitSha: safeCommitSha(),
			environment: getEnvironment(),
			fixture: {
				consentCount: 0,
				localeCount: 0,
				name: 'manifest-cache-bench',
				scriptCount: 0,
				themeComplexity: 'minimal',
			},
			framework: 'core',
			metadata: {
				description: result.description,
				edgeCalls: result.edgeCalls,
				edgeHits: result.counters.edgeHits,
				gitDirty: safeGitDirty(),
				notModified: result.counters.notModified,
				notes: result.notes,
				originHits: result.counters.originHits,
				rejected,
				requestCount: result.samples.length,
				resolved,
				staleServes: result.counters.staleServes,
				stalledRequests: stalls,
			},
			metrics: [
				summarizeMetric(
					'latency',
					'ms',
					result.samples.map((s) => s.latencyMs)
				),
			],
			notes: [
				'benchmarks/manifest-cache-bench measures fetchCachedManifest against an in-process simulated Vercel CDN — see benchmarks/manifest-cache-bench/README.md.',
				...result.notes,
			],
			package: '@c15t/manifest-cache-bench',
			runtime: process.versions.bun ? 'bun' : 'node',
			scenario: result.name,
			schemaVersion: BENCHMARK_SCHEMA_VERSION,
			suite: 'core-runtime',
			timestamp: new Date().toISOString(),
		};
		writeJson(join(outputDir, `${result.name}.json`), benchmarkResult);
	}

	console.log('');
	console.log(buildMarkdownTable(rows));
};

await runAll();
