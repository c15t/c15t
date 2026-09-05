#!/usr/bin/env node
/**
 * Compare base and head benchmark artifacts and evaluate budgets.
 *
 * The gate is only as honest as its coverage accounting, so the run
 * fails (under `BENCHMARK_ENFORCE=true`) when:
 *
 * - an expected result key (see `src/expected-results.ts`) has no head
 *   artifact or no base artifact;
 * - a head result carries fewer budget definitions than expected;
 * - a relative budget has no base metric to compare against;
 * - a budget that targets a named base arm (for example the v2 arm for
 *   the v3 improvement budgets) has no arm artifacts and the arm was not
 *   explicitly allowed through `BENCHMARK_ALLOW_UNEVALUATED_ARMS`;
 * - any evaluated budget fails.
 *
 * Environment:
 * - `BENCHMARK_BASE_DIR` / `BENCHMARK_HEAD_DIR` / `BENCHMARK_COMPARE_DIR`
 * - `BENCHMARK_ARM_MAP` — alternate key mapping file (default `arm-map.json`)
 * - `BENCHMARK_ARM_BASE_DIRS` — `arm=dir[,arm=dir]` artifact directories
 *   for named base arms
 * - `BENCHMARK_ALLOW_UNEVALUATED_ARMS` — comma list of arms whose budgets may
 *   stay unevaluated; recorded in the summary so the waiver is visible
 * - `BENCHMARK_EXPECTED_SUITES` — comma list restricting which expected
 *   suites are required (partial local runs); every suite by default
 * - `BENCHMARK_ENFORCE=true` — exit non-zero on any failure above
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expectedBenchmarkResults } from './src/expected-results';
import type { ExpectedBenchmarkResult } from './src/expected-results';
import {
	evaluateBudget,
	hasFailingBudgets,
	indexMetrics,
	toMarkdownComparison,
} from './src/reporting';
import { BENCHMARK_SCHEMA_VERSION } from './src/schema';
import type {
	BenchmarkBaseArm,
	BenchmarkComparisonEntry,
	BenchmarkComparisonResult,
	BenchmarkComparisonSummary,
	BenchmarkResult,
	BenchmarkSuite,
	MetricBudgetResult,
	MetricSampleSet,
} from './src/schema';
import { listJsonFiles, readJson, writeJson } from './src/utils';

const baseDir = process.env.BENCHMARK_BASE_DIR ?? '.benchmarks/base';
const headDir = process.env.BENCHMARK_HEAD_DIR ?? '.benchmarks/head';
const outputDir = process.env.BENCHMARK_COMPARE_DIR ?? '.benchmarks/compare';
const defaultArmMapPath = join(
	dirname(fileURLToPath(import.meta.url)),
	'arm-map.json'
);
const armMapPath = process.env.BENCHMARK_ARM_MAP ?? defaultArmMapPath;
const enforce = process.env.BENCHMARK_ENFORCE === 'true';

interface ArmMapFile {
	_comment?: string;
	mappings?: Record<string, string | string[]>;
}

const parseList = function parseList(value: string | undefined): string[] {
	return (value ?? '')
		.split(',')
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);
};

const loadArmMap = function loadArmMap(): Map<string, string[]> {
	try {
		const parsed = readJson<ArmMapFile | Record<string, string | string[]>>(
			armMapPath
		);
		const mappings = 'mappings' in parsed ? parsed.mappings : parsed;
		return new Map(
			Object.entries(mappings ?? {})
				.filter(([key]) => key !== '_comment')
				.map(([key, value]) => [key, Array.isArray(value) ? value : [value]])
		);
	} catch {
		return new Map();
	}
};

const resultKey = function resultKey(result: BenchmarkResult): string {
	return `${result.package}:${result.scenario}:${result.suite}`;
};

const loadResults = function loadResults(
	dir: string
): Map<string, BenchmarkResult> {
	const results = new Map<string, BenchmarkResult>();
	for (const file of listJsonFiles(dir)) {
		const result = readJson<BenchmarkResult>(file);
		if (!result || typeof result !== 'object' || !('suite' in result)) {
			continue;
		}
		results.set(resultKey(result), result);
	}
	return results;
};

const loadArmBaseDirs = function loadArmBaseDirs(): Map<
	BenchmarkBaseArm,
	Map<string, BenchmarkResult>
> {
	const arms = new Map<BenchmarkBaseArm, Map<string, BenchmarkResult>>();
	for (const entry of parseList(process.env.BENCHMARK_ARM_BASE_DIRS)) {
		const separator = entry.indexOf('=');
		if (separator <= 0) {
			throw new Error(
				`BENCHMARK_ARM_BASE_DIRS entries must look like arm=dir, received "${entry}"`
			);
		}
		const arm = entry.slice(0, separator) as BenchmarkBaseArm;
		arms.set(arm, loadResults(entry.slice(separator + 1)));
	}
	return arms;
};

const comparisonMetrics = function comparisonMetrics(
	headResult: BenchmarkResult,
	indexedBaseMetrics: Map<string, MetricSampleSet>
): BenchmarkComparisonEntry['metrics'] {
	return headResult.metrics.map((metric) => {
		const baseMetric = indexedBaseMetrics.get(metric.name);
		const hasNumbers =
			typeof baseMetric?.median === 'number' &&
			typeof metric.median === 'number';
		const delta = hasNumbers
			? Number((metric.median - baseMetric.median).toFixed(3))
			: null;
		const deltaPercent =
			hasNumbers && baseMetric.median > 0
				? Number(
						(
							((metric.median - baseMetric.median) / baseMetric.median) *
							100
						).toFixed(3)
					)
				: null;
		return {
			baseMedian: baseMetric?.median ?? null,
			delta,
			deltaPercent,
			headMedian: metric.median,
			name: metric.name,
			unit: metric.unit,
		};
	});
};

const evaluateBudgets = function evaluateBudgets(
	headResult: BenchmarkResult,
	baseResult: BenchmarkResult | undefined,
	armResults: Map<BenchmarkBaseArm, Map<string, BenchmarkResult>>,
	baseKey: string
): MetricBudgetResult[] {
	const indexedHeadMetrics = indexMetrics(headResult);
	const indexedBaseMetrics = baseResult
		? indexMetrics(baseResult)
		: new Map<string, MetricSampleSet>();

	return (headResult.budgetDefinitions ?? []).map((budget) => {
		if (budget.baseArm) {
			const armResult = armResults.get(budget.baseArm)?.get(baseKey);
			if (!armResult) {
				return {
					actual: null,
					baseArm: budget.baseArm,
					comparator: budget.comparator,
					message: `No ${budget.baseArm} arm artifact for ${baseKey}; budget not evaluated`,
					metric: budget.metric,
					pass: false,
					secondaryThreshold: budget.secondaryThreshold,
					status: 'unevaluated-arm',
					threshold: budget.threshold,
				};
			}
			return evaluateBudget(
				budget,
				indexedHeadMetrics.get(budget.metric),
				indexMetrics(armResult).get(budget.metric)
			);
		}
		return evaluateBudget(
			budget,
			indexedHeadMetrics.get(budget.metric),
			indexedBaseMetrics.get(budget.metric)
		);
	});
};

const selectExpected = function selectExpected(): ExpectedBenchmarkResult[] {
	const suites = parseList(process.env.BENCHMARK_EXPECTED_SUITES);
	if (suites.length === 0) {
		return expectedBenchmarkResults;
	}
	const wanted = new Set(suites as BenchmarkSuite[]);
	return expectedBenchmarkResults.filter((entry) => wanted.has(entry.suite));
};

const buildSummary = function buildSummary(
	comparison: BenchmarkComparisonResult,
	headResults: Map<string, BenchmarkResult>,
	baseResults: Map<string, BenchmarkResult>,
	armMap: Map<string, string[]>,
	expected: ExpectedBenchmarkResult[]
): BenchmarkComparisonSummary {
	const allowedUnevaluatedArms = parseList(
		process.env.BENCHMARK_ALLOW_UNEVALUATED_ARMS
	) as BenchmarkBaseArm[];
	const failures: string[] = [];
	const missingHead: string[] = [];
	const missingBase: string[] = [];
	const missingDefinitions: string[] = [];
	let expectedBudgets = 0;

	for (const entry of expected) {
		const headResult = headResults.get(entry.key);
		if (!headResult) {
			missingHead.push(entry.key);
			failures.push(`missing head result ${entry.key}`);
			continue;
		}
		const baseKeys = armMap.get(entry.key) ?? [entry.key];
		for (const baseKey of baseKeys) {
			if (!baseResults.has(baseKey)) {
				missingBase.push(baseKey);
				failures.push(`missing base result ${baseKey} for ${entry.key}`);
			}
		}
		expectedBudgets += entry.budgets.length * baseKeys.length;
		const defined = new Set(
			(headResult.budgetDefinitions ?? []).map((budget) => budget.metric)
		);
		for (const metric of entry.budgets) {
			if (!defined.has(metric)) {
				const label = `${entry.key}#${metric}`;
				missingDefinitions.push(label);
				failures.push(`head result ${entry.key} has no budget for ${metric}`);
			}
		}
	}

	const expectedKeys = new Set(expected.map((entry) => entry.key));
	const unexpected = [...headResults.keys()].filter(
		(key) => !expectedKeys.has(key)
	);

	let evaluated = 0;
	let passed = 0;
	let failed = 0;
	let missingHeadMetric = 0;
	let missingBaseMetric = 0;
	let unevaluatedArm = 0;
	for (const result of comparison.results) {
		for (const budget of result.budgets) {
			const status = budget.status ?? 'evaluated';
			const label = `${result.key}#${budget.metric}`;
			if (status === 'evaluated') {
				evaluated += 1;
				if (budget.pass) {
					passed += 1;
				} else {
					failed += 1;
					failures.push(`budget failed ${label}: ${budget.message}`);
				}
				continue;
			}
			if (status === 'missing-head-metric') {
				missingHeadMetric += 1;
				failures.push(`missing head metric ${label}`);
				continue;
			}
			if (status === 'missing-base-metric') {
				missingBaseMetric += 1;
				failures.push(`missing base metric ${label}`);
				continue;
			}
			unevaluatedArm += 1;
			if (budget.baseArm && allowedUnevaluatedArms.includes(budget.baseArm)) {
				continue;
			}
			failures.push(`unevaluated ${budget.baseArm ?? 'arm'} budget ${label}`);
		}
	}

	return {
		allowedUnevaluatedArms,
		budgets: {
			evaluated,
			expected: expectedBudgets,
			failed,
			missingBaseMetric,
			missingDefinitions,
			missingHeadMetric,
			passed,
			unevaluatedArm,
		},
		enforce,
		failures,
		ok: failures.length === 0,
		results: {
			compared: comparison.results.filter(
				(result) => (result.status ?? 'compared') === 'compared'
			).length,
			expected: expected.length,
			missingBase,
			missingHead,
			unexpected,
		},
	};
};

const main = async function main() {
	const baseResults = loadResults(baseDir);
	const headResults = loadResults(headDir);
	const armResults = loadArmBaseDirs();
	const armMap = loadArmMap();
	const expected = selectExpected();

	const comparison: BenchmarkComparisonResult = {
		baseSha: undefined,
		generatedAt: new Date().toISOString(),
		headSha: undefined,
		results: [],
		schemaVersion: BENCHMARK_SCHEMA_VERSION,
	};

	for (const [key, headResult] of headResults) {
		const comparisonBaseKeys = armMap.get(key) ?? [key];

		for (const baseKey of comparisonBaseKeys) {
			const baseResult = baseResults.get(baseKey);
			comparison.baseSha ??= baseResult?.commitSha ?? headResult.baseSha;
			comparison.headSha ??= headResult.commitSha;

			comparison.results.push({
				baseCommitSha: baseResult?.commitSha,
				baseKey: baseKey === key ? undefined : baseKey,
				budgets: evaluateBudgets(headResult, baseResult, armResults, baseKey),
				framework: headResult.framework,
				headCommitSha: headResult.commitSha,
				key,
				metrics: comparisonMetrics(
					headResult,
					baseResult ? indexMetrics(baseResult) : new Map()
				),
				notes: headResult.notes,
				package: headResult.package,
				scenario: headResult.scenario,
				status: baseResult ? 'compared' : 'missing-base',
				suite: headResult.suite,
			});
		}
	}

	comparison.summary = buildSummary(
		comparison,
		headResults,
		baseResults,
		armMap,
		expected
	);

	const markdown = toMarkdownComparison(comparison);
	writeJson(join(outputDir, 'comparison.json'), comparison);
	writeJson(join(outputDir, 'comparison.md.json'), { markdown });
	writeJson(join(outputDir, 'summary.json'), comparison.summary);
	const { writeFile } = await import('node:fs/promises');
	await writeFile(join(outputDir, 'comparison.md'), markdown);

	const { summary } = comparison;
	console.log(
		[
			`Benchmark comparison: ${summary.results.compared}/${summary.results.expected} expected results compared`,
			`budgets: ${summary.budgets.passed} passed, ${summary.budgets.failed} failed, ${summary.budgets.missingHeadMetric} missing head metric, ${summary.budgets.missingBaseMetric} missing base metric, ${summary.budgets.unevaluatedArm} unevaluated arm (${summary.budgets.expected} expected)`,
			...summary.failures.map((failure) => `  - ${failure}`),
		].join('\n')
	);

	if (enforce && (!summary.ok || hasFailingBudgets(comparison))) {
		throw new Error(
			`Benchmark gate failed with ${summary.failures.length} problem(s); see ${join(outputDir, 'comparison.md')}`
		);
	}
};

try {
	await main();
} catch (error) {
	console.error(error);
	process.exit(1);
}
