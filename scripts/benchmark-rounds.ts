import { relative, join } from 'node:path';

import type {
	BenchmarkResult,
	MetricSampleSet,
} from '../benchmarks/shared/src/schema';
import {
	listJsonFiles,
	readJson,
	summarizeMetric,
	summarizeNullableMetric,
	writeJson,
} from '../benchmarks/shared/src/utils';

/** One revision measured in a round. */
export type BenchmarkArm = 'base' | 'head';

/**
 * Which arm runs first in a round. Alternating base-head, head-base, ...
 * spreads drift in runner speed over both arms instead of loading it all on
 * whichever arm measures second.
 *
 * @param round - Zero-based round index.
 * @returns The arms in the order they run.
 */
export const roundOrder = function roundOrder(
	round: number
): readonly [BenchmarkArm, BenchmarkArm] {
	return round % 2 === 0 ? ['base', 'head'] : ['head', 'base'];
};

/**
 * Split a total iteration count over rounds, rounding up so pooled results
 * keep at least the original sample count.
 *
 * @param total - Iterations a single-pass run would take.
 * @param rounds - Number of rounds.
 * @returns Iterations per round, as an environment value.
 */
export const iterationsPerRound = function iterationsPerRound(
	total: number,
	rounds: number
): string {
	return String(Math.ceil(total / rounds));
};

const poolMetric = function poolMetric(
	metrics: MetricSampleSet[]
): MetricSampleSet {
	const [first] = metrics;
	if (!first) {
		throw new Error('Cannot pool an empty metric list.');
	}
	const samples = metrics.flatMap((metric) => metric.samples);
	if (samples.length === 0) {
		// No round recorded samples; keep the runner's own summary.
		return first;
	}
	return samples.every((sample) => typeof sample === 'number')
		? summarizeMetric(first.name, first.unit, samples)
		: summarizeNullableMetric(first.name, first.unit, samples);
};

/**
 * Pool one scenario's results from every round into a single result.
 * Samples are concatenated and avg, median and p95 recomputed. Everything
 * else, including metadata, comes from the first round.
 *
 * @param results - The same scenario's result from each round, in order.
 * @param label - Names the scenario in errors.
 * @returns The pooled result.
 * @throws {Error} When rounds disagree on the scenario or its metrics.
 */
export const poolRoundResults = function poolRoundResults(
	results: BenchmarkResult[],
	label: string
): BenchmarkResult {
	const [first] = results;
	if (!first) {
		throw new Error(`${label}: no rounds to pool.`);
	}
	const names = first.metrics.map((metric) => metric.name);
	const metricsByName = results.map((result) => {
		if (
			result.scenario !== first.scenario ||
			result.package !== first.package ||
			result.metrics.length !== names.length
		) {
			throw new Error(`${label}: rounds measured different scenarios.`);
		}
		return new Map(result.metrics.map((metric) => [metric.name, metric]));
	});
	return {
		...first,
		metadata: { ...first.metadata, rounds: results.length },
		metrics: names.map((name) =>
			poolMetric(
				metricsByName.map((metrics) => {
					const metric = metrics.get(name);
					if (!metric) {
						throw new Error(`${label}: a round is missing ${name}.`);
					}
					return metric;
				})
			)
		),
	};
};

/**
 * Pool every result file across round directories into one directory with
 * the same layout.
 *
 * @param roundDirectories - One output directory per round, in order.
 * @param output - Where the pooled results go.
 * @throws {Error} When a round is missing a result another round produced.
 */
export const poolRoundDirectories = function poolRoundDirectories(
	roundDirectories: string[],
	output: string
): void {
	const files = roundDirectories.map((directory) =>
		listJsonFiles(directory)
			.map((file) => relative(directory, file))
			.sort()
	);
	const [first = []] = files;
	for (const [round, roundFiles] of files.entries()) {
		if (roundFiles.join('\n') !== first.join('\n')) {
			throw new Error(
				`Benchmark round ${round + 1} produced different result files than round 1.`
			);
		}
	}
	for (const file of first) {
		writeJson(
			join(output, file),
			poolRoundResults(
				roundDirectories.map((directory) =>
					readJson<BenchmarkResult>(join(directory, file))
				),
				file
			)
		);
	}
};
