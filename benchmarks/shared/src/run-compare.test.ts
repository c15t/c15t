import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
	coreRuntimeBudgets,
	coreRuntimeCoverageBudgets,
	coreRuntimeV3Budgets,
} from './budgets';
import { expectedBenchmarkResults } from './expected-results';
import type {
	BenchmarkComparisonSummary,
	BenchmarkResult,
	MetricBudget,
} from './schema';
import { readJson, summarizeMetric, writeJson } from './utils';

const runCompareScript = fileURLToPath(
	new URL('../run-compare.ts', import.meta.url)
);

const makeResult = function makeResult(
	scenario: string,
	medians: Record<string, number>,
	budgets: MetricBudget[]
): BenchmarkResult {
	return {
		budgetDefinitions: budgets,
		budgets: [],
		commitSha: `sha-${scenario}`,
		environment: { arch: 'x', ci: false, os: 'test' },
		fixture: {
			consentCount: 3,
			localeCount: 1,
			name: scenario,
			scriptCount: 0,
			themeComplexity: 'minimal',
		},
		framework: 'core',
		metrics: Object.entries(medians).map(([name, median]) =>
			summarizeMetric(name, 'us', [median])
		),
		notes: [],
		package: '@c15t/core-benchmarks',
		runtime: 'test',
		scenario,
		schemaVersion: 1,
		suite: 'core-runtime',
		timestamp: 'now',
	};
};

interface CompareRun {
	code: number;
	summary: BenchmarkComparisonSummary;
	stdout: string;
}

const runCompare = function runCompare(
	env: Record<string, string>
): CompareRun {
	const root = mkdtempSync(join(tmpdir(), 'c15t-compare-'));
	const compareDir = join(root, 'compare');
	let stdout = '';
	let code = 0;
	try {
		stdout = execFileSync('bunx', ['tsx', runCompareScript], {
			encoding: 'utf8',
			env: {
				...process.env,
				BENCHMARK_COMPARE_DIR: compareDir,
				...env,
			},
			stdio: ['ignore', 'pipe', 'pipe'],
		});
	} catch (error) {
		const failure = error as { status?: number; stdout?: string };
		code = failure.status ?? 1;
		stdout = failure.stdout ?? '';
	}
	return {
		code,
		stdout,
		summary: readJson<BenchmarkComparisonSummary>(
			join(compareDir, 'summary.json')
		),
	};
};

const writeResults = function writeResults(results: BenchmarkResult[]): string {
	const dir = mkdtempSync(join(tmpdir(), 'c15t-results-'));
	for (const result of results) {
		writeJson(join(dir, `${result.scenario}.json`), result);
	}
	return dir;
};

const emptyArmMap = function emptyArmMap(): string {
	const dir = mkdtempSync(join(tmpdir(), 'c15t-arm-map-'));
	const path = join(dir, 'arm-map.json');
	writeFileSync(path, '{"mappings":{}}\n');
	return path;
};

const coreBudgets = [
	...coreRuntimeBudgets,
	...coreRuntimeCoverageBudgets,
	...coreRuntimeV3Budgets,
];
const coreMedians = {
	createConsentKernel: 1,
	getSnapshot: 1,
	initConsentManager: 1,
	repeatVisitorInit: 1,
	saveAll: 1,
	setConsent: 1,
};

describe('run-compare gate', () => {
	it('fails under enforcement when expected head results are missing', () => {
		const run = runCompare({
			BENCHMARK_ARM_MAP: emptyArmMap(),
			BENCHMARK_BASE_DIR: writeResults([]),
			BENCHMARK_ENFORCE: 'true',
			BENCHMARK_EXPECTED_SUITES: 'core-runtime',
			BENCHMARK_HEAD_DIR: writeResults([]),
		});
		expect(run.code).not.toBe(0);
		expect(run.summary.ok).toBe(false);
		expect(run.summary.results.missingHead.length).toBeGreaterThan(0);
		expect(run.summary.budgets.evaluated).toBe(0);
	});

	it('fails when a head result exists but the base result is missing', () => {
		const run = runCompare({
			BENCHMARK_ARM_MAP: emptyArmMap(),
			BENCHMARK_BASE_DIR: writeResults([]),
			BENCHMARK_ENFORCE: 'true',
			BENCHMARK_EXPECTED_SUITES: 'core-runtime',
			BENCHMARK_HEAD_DIR: writeResults([
				makeResult('tiny', coreMedians, coreBudgets),
			]),
		});
		expect(run.code).not.toBe(0);
		expect(run.summary.results.missingBase).toContain(
			'@c15t/core-benchmarks:tiny:core-runtime'
		);
		expect(run.summary.budgets.missingBaseMetric).toBe(
			coreRuntimeBudgets.length + coreRuntimeCoverageBudgets.length
		);
	});

	it('fails when a relative budget has no base metric to compare against', () => {
		const run = runCompare({
			BENCHMARK_ARM_MAP: emptyArmMap(),
			BENCHMARK_BASE_DIR: writeResults([
				makeResult('tiny', { createConsentKernel: 1 }, coreBudgets),
			]),
			BENCHMARK_ENFORCE: 'true',
			BENCHMARK_EXPECTED_SUITES: 'core-runtime',
			BENCHMARK_HEAD_DIR: writeResults([
				makeResult('tiny', coreMedians, coreBudgets),
			]),
		});
		expect(run.code).not.toBe(0);
		expect(run.summary.budgets.missingBaseMetric).toBe(5);
		expect(
			run.summary.failures.some((failure) =>
				failure.includes('missing base metric')
			)
		).toBe(true);
	});

	it('fails when the head result dropped an expected budget definition', () => {
		const run = runCompare({
			BENCHMARK_ARM_MAP: emptyArmMap(),
			BENCHMARK_BASE_DIR: writeResults([
				makeResult('tiny', coreMedians, coreBudgets),
			]),
			BENCHMARK_ENFORCE: 'true',
			BENCHMARK_EXPECTED_SUITES: 'core-runtime',
			BENCHMARK_HEAD_DIR: writeResults([makeResult('tiny', coreMedians, [])]),
		});
		expect(run.code).not.toBe(0);
		expect(run.summary.budgets.missingDefinitions.length).toBeGreaterThan(0);
	});

	it('reports v2-arm budgets as unevaluated and fails unless explicitly allowed', () => {
		const expectedCore = expectedBenchmarkResults.filter(
			(entry) => entry.suite === 'core-runtime'
		);
		const results = expectedCore.map((entry) =>
			makeResult(entry.key.split(':')[1] ?? 'tiny', coreMedians, coreBudgets)
		);
		const strict = runCompare({
			BENCHMARK_ARM_MAP: emptyArmMap(),
			BENCHMARK_BASE_DIR: writeResults(results),
			BENCHMARK_ENFORCE: 'true',
			BENCHMARK_EXPECTED_SUITES: 'core-runtime',
			BENCHMARK_HEAD_DIR: writeResults(results),
		});
		expect(strict.code).not.toBe(0);
		expect(strict.summary.budgets.unevaluatedArm).toBe(
			coreRuntimeV3Budgets.length * expectedCore.length
		);
		expect(strict.summary.budgets.failed).toBe(0);

		const allowed = runCompare({
			BENCHMARK_ALLOW_UNEVALUATED_ARMS: 'v2',
			BENCHMARK_ARM_MAP: emptyArmMap(),
			BENCHMARK_BASE_DIR: writeResults(results),
			BENCHMARK_ENFORCE: 'true',
			BENCHMARK_EXPECTED_SUITES: 'core-runtime',
			BENCHMARK_HEAD_DIR: writeResults(results),
		});
		expect(allowed.summary.budgets.missingDefinitions).toEqual([]);
		expect(allowed.summary.allowedUnevaluatedArms).toEqual(['v2']);
		expect(allowed.code).toBe(0);
	});

	it('evaluates v2-arm budgets against supplied arm artifacts', () => {
		const expectedCore = expectedBenchmarkResults.filter(
			(entry) => entry.suite === 'core-runtime'
		);
		const scenarios = expectedCore.map(
			(entry) => entry.key.split(':')[1] ?? 'tiny'
		);
		const head = scenarios.map((scenario) =>
			makeResult(scenario, coreMedians, coreBudgets)
		);
		const v2 = scenarios.map((scenario) =>
			makeResult(
				scenario,
				{
					createConsentKernel: 1,
					getSnapshot: 1,
					initConsentManager: 10,
					repeatVisitorInit: 10,
				},
				[]
			)
		);
		const run = runCompare({
			BENCHMARK_ARM_BASE_DIRS: `v2=${writeResults(v2)}`,
			BENCHMARK_ARM_MAP: emptyArmMap(),
			BENCHMARK_BASE_DIR: writeResults(head),
			BENCHMARK_ENFORCE: 'true',
			BENCHMARK_EXPECTED_SUITES: 'core-runtime',
			BENCHMARK_HEAD_DIR: writeResults(head),
		});
		expect(run.summary.budgets.unevaluatedArm).toBe(0);
		expect(run.summary.budgets.failed).toBe(0);
		expect(run.code).toBe(0);
	});

	it('fails an evaluated regression under enforcement', () => {
		const expectedCore = expectedBenchmarkResults.filter(
			(entry) => entry.suite === 'core-runtime'
		);
		const scenarios = expectedCore.map(
			(entry) => entry.key.split(':')[1] ?? 'tiny'
		);
		const base = scenarios.map((scenario) =>
			makeResult(scenario, coreMedians, coreBudgets)
		);
		const head = scenarios.map((scenario) =>
			makeResult(scenario, { ...coreMedians, getSnapshot: 2 }, coreBudgets)
		);
		const run = runCompare({
			BENCHMARK_ALLOW_UNEVALUATED_ARMS: 'v2',
			BENCHMARK_ARM_MAP: emptyArmMap(),
			BENCHMARK_BASE_DIR: writeResults(base),
			BENCHMARK_ENFORCE: 'true',
			BENCHMARK_EXPECTED_SUITES: 'core-runtime',
			BENCHMARK_HEAD_DIR: writeResults(head),
		});
		expect(run.code).not.toBe(0);
		expect(run.summary.budgets.failed).toBe(scenarios.length);
	});
});
