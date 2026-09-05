import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
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
	budgets: MetricBudget[],
	commitSha = `sha-${scenario}`
): BenchmarkResult {
	return {
		budgetDefinitions: budgets,
		budgets: [],
		commitSha,
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
	/** `null` when the run aborted before writing a summary. */
	summary: BenchmarkComparisonSummary | null;
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
				BENCHMARK_ARM_BASE_DIRS: '',
				BENCHMARK_COMPARE_DIR: compareDir,
				BENCHMARK_ENFORCE: 'true',
				BENCHMARK_EXPECTED_SUITES: 'core-runtime',
				...env,
			},
			stdio: ['ignore', 'pipe', 'pipe'],
		});
	} catch (error) {
		const failure = error as { status?: number; stdout?: string };
		code = failure.status ?? 1;
		stdout = failure.stdout ?? '';
	}
	const summaryPath = join(compareDir, 'summary.json');
	return {
		code,
		stdout,
		summary: existsSync(summaryPath)
			? readJson<BenchmarkComparisonSummary>(summaryPath)
			: null,
	};
};

const summaryOf = function summaryOf(
	run: CompareRun
): BenchmarkComparisonSummary {
	if (!run.summary) {
		throw new Error('expected the comparison to write a summary');
	}
	return run.summary;
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
const expectedCore = expectedBenchmarkResults.filter(
	(entry) => entry.suite === 'core-runtime'
);
const coreScenarios = expectedCore.map(
	(entry) => entry.key.split(':')[1] ?? 'tiny'
);
const fullCore = (medians = coreMedians, budgets = coreBudgets) =>
	coreScenarios.map((scenario) => makeResult(scenario, medians, budgets));
/** v2-era artifacts use the v2 runner's metric names. */
const v2Arm = () =>
	coreScenarios.map((scenario) =>
		makeResult(
			scenario,
			{
				createConsentManagerStore: 40,
				initConsentManager: 170,
				repeatVisitorInit: 1500,
			},
			[],
			'v2-sha'
		)
	);
const v3ArmBudgetCount = coreRuntimeV3Budgets.length * coreScenarios.length;

describe('run-compare gate', () => {
	it('fails under enforcement when expected head results are missing', () => {
		const run = runCompare({
			BENCHMARK_ARM_MAP: emptyArmMap(),
			BENCHMARK_BASE_DIR: writeResults([]),
			BENCHMARK_HEAD_DIR: writeResults([]),
		});
		expect(run.code).not.toBe(0);
		expect(summaryOf(run).ok).toBe(false);
		expect(summaryOf(run).results.missingHead.length).toBe(
			coreScenarios.length
		);
		expect(summaryOf(run).budgets.evaluated).toBe(0);
	});

	it('fails when a head result exists but the base result is missing', () => {
		const run = runCompare({
			BENCHMARK_ARM_MAP: emptyArmMap(),
			BENCHMARK_BASE_DIR: writeResults([]),
			BENCHMARK_HEAD_DIR: writeResults([
				makeResult('tiny', coreMedians, coreBudgets),
			]),
		});
		expect(run.code).not.toBe(0);
		expect(summaryOf(run).results.missingBase).toContain(
			'@c15t/core-benchmarks:tiny:core-runtime'
		);
		expect(summaryOf(run).budgets.missingBaseMetric).toBe(
			coreRuntimeBudgets.length + coreRuntimeCoverageBudgets.length
		);
	});

	it('fails when a relative budget has no base metric to compare against', () => {
		const run = runCompare({
			BENCHMARK_ARM_MAP: emptyArmMap(),
			BENCHMARK_BASE_DIR: writeResults([
				makeResult('tiny', { createConsentKernel: 1 }, coreBudgets),
			]),
			BENCHMARK_HEAD_DIR: writeResults([
				makeResult('tiny', coreMedians, coreBudgets),
			]),
		});
		expect(run.code).not.toBe(0);
		expect(summaryOf(run).budgets.missingBaseMetric).toBe(5);
		expect(
			summaryOf(run).failures.some((failure) =>
				failure.includes('missing base metric')
			)
		).toBe(true);
	});

	it('fails when the head result dropped an expected budget definition', () => {
		const run = runCompare({
			BENCHMARK_ARM_BASE_DIRS: `v2=${writeResults(v2Arm())}`,
			BENCHMARK_ARM_MAP: emptyArmMap(),
			BENCHMARK_BASE_DIR: writeResults(fullCore()),
			BENCHMARK_HEAD_DIR: writeResults(fullCore(coreMedians, [])),
		});
		expect(run.code).not.toBe(0);
		expect(summaryOf(run).budgets.missingDefinitions.length).toBe(
			coreBudgets.length * coreScenarios.length
		);
	});

	it('fails when a required budget is replaced by a weaker budget with the same count', () => {
		const weakened = coreBudgets.map((budget) =>
			budget.metric === 'initConsentManager' && !budget.baseArm
				? { ...budget, threshold: 50 }
				: budget
		);
		const run = runCompare({
			BENCHMARK_ARM_BASE_DIRS: `v2=${writeResults(v2Arm())}`,
			BENCHMARK_ARM_MAP: emptyArmMap(),
			BENCHMARK_BASE_DIR: writeResults(fullCore()),
			BENCHMARK_HEAD_DIR: writeResults(fullCore(coreMedians, weakened)),
		});
		expect(run.code).not.toBe(0);
		expect(summaryOf(run).budgets.missingDefinitions).toEqual([]);
		expect(summaryOf(run).budgets.definitionMismatches.length).toBe(
			coreScenarios.length
		);
		expect(summaryOf(run).budgets.definitionMismatches[0]).toContain(
			'threshold expected 15 but saw 50'
		);
	});

	it('fails when a required budget swaps its comparator for a looser one', () => {
		const loosened = coreBudgets.map((budget) =>
			budget.metric === 'getSnapshot'
				? {
						...budget,
						comparator: 'absolute-lte' as const,
						threshold: 1000,
					}
				: budget
		);
		const run = runCompare({
			BENCHMARK_ARM_BASE_DIRS: `v2=${writeResults(v2Arm())}`,
			BENCHMARK_ARM_MAP: emptyArmMap(),
			BENCHMARK_BASE_DIR: writeResults(fullCore()),
			BENCHMARK_HEAD_DIR: writeResults(fullCore(coreMedians, loosened)),
		});
		expect(run.code).not.toBe(0);
		expect(summaryOf(run).budgets.definitionMismatches[0]).toContain(
			'comparator expected percent-lte but saw absolute-lte'
		);
	});

	it('fails when a v2-arm budget drops its arm and compares against the v3 base', () => {
		const rebased = coreBudgets.map((budget) =>
			budget.baseArm
				? { ...budget, baseArm: undefined, baseArmMetric: undefined }
				: budget
		);
		const run = runCompare({
			BENCHMARK_ARM_BASE_DIRS: `v2=${writeResults(v2Arm())}`,
			BENCHMARK_ARM_MAP: emptyArmMap(),
			BENCHMARK_BASE_DIR: writeResults(fullCore()),
			BENCHMARK_HEAD_DIR: writeResults(fullCore(coreMedians, rebased)),
		});
		expect(run.code).not.toBe(0);
		expect(summaryOf(run).budgets.missingDefinitions.length).toBe(
			v3ArmBudgetCount
		);
	});

	it('fails under enforcement when v2-arm budgets have no arm artifacts, with no waiver', () => {
		const results = fullCore();
		const run = runCompare({
			BENCHMARK_ARM_MAP: emptyArmMap(),
			BENCHMARK_BASE_DIR: writeResults(results),
			BENCHMARK_HEAD_DIR: writeResults(results),
		});
		expect(run.code).not.toBe(0);
		expect(summaryOf(run).budgets.unevaluatedArm).toBe(v3ArmBudgetCount);
		expect(summaryOf(run).budgets.failed).toBe(0);
		expect(
			summaryOf(run).failures.filter((failure) =>
				failure.startsWith('unevaluated v2 budget')
			).length
		).toBe(v3ArmBudgetCount);

		const attemptedWaiver = runCompare({
			BENCHMARK_ALLOW_UNEVALUATED_ARMS: 'v2',
			BENCHMARK_ARM_MAP: emptyArmMap(),
			BENCHMARK_BASE_DIR: writeResults(results),
			BENCHMARK_HEAD_DIR: writeResults(results),
		});
		expect(attemptedWaiver.code).not.toBe(0);
		expect(summaryOf(attemptedWaiver).budgets.unevaluatedArm).toBe(
			v3ArmBudgetCount
		);
		expect(summaryOf(attemptedWaiver).ok).toBe(false);
	});

	it('rejects an arm directory that holds no artifacts', () => {
		const results = fullCore();
		const run = runCompare({
			BENCHMARK_ARM_BASE_DIRS: `v2=${writeResults([])}`,
			BENCHMARK_ARM_MAP: emptyArmMap(),
			BENCHMARK_BASE_DIR: writeResults(results),
			BENCHMARK_HEAD_DIR: writeResults(results),
		});
		expect(run.code).not.toBe(0);
		expect(run.summary).toBeNull();
	});

	it('evaluates v2-arm budgets against supplied arm artifacts using the arm metric names', () => {
		const head = fullCore();
		const run = runCompare({
			BENCHMARK_ARM_BASE_DIRS: `v2=${writeResults(v2Arm())}`,
			BENCHMARK_ARM_MAP: emptyArmMap(),
			BENCHMARK_BASE_DIR: writeResults(head),
			BENCHMARK_HEAD_DIR: writeResults(head),
		});
		expect(summaryOf(run).budgets.unevaluatedArm).toBe(0);
		expect(summaryOf(run).budgets.missingBaseMetric).toBe(0);
		expect(summaryOf(run).budgets.failed).toBe(0);
		expect(summaryOf(run).budgets.passed).toBe(
			coreBudgets.length * coreScenarios.length
		);
		expect(summaryOf(run).baseArms.v2).toEqual({
			commitShas: ['v2-sha'],
			results: coreScenarios.length,
		});
		expect(run.code).toBe(0);
	});

	it('fails a v2-arm improvement budget the head does not meet', () => {
		const head = fullCore({ ...coreMedians, initConsentManager: 120 });
		const run = runCompare({
			BENCHMARK_ARM_BASE_DIRS: `v2=${writeResults(v2Arm())}`,
			BENCHMARK_ARM_MAP: emptyArmMap(),
			BENCHMARK_BASE_DIR: writeResults(head),
			BENCHMARK_HEAD_DIR: writeResults(head),
		});
		expect(run.code).not.toBe(0);
		expect(
			summaryOf(run).failures.filter((failure) =>
				failure.includes('initConsentManager@v2')
			).length
		).toBe(coreScenarios.length);
	});

	it('fails an evaluated regression under enforcement', () => {
		const base = fullCore();
		const head = fullCore({ ...coreMedians, getSnapshot: 2 });
		const run = runCompare({
			BENCHMARK_ARM_BASE_DIRS: `v2=${writeResults(v2Arm())}`,
			BENCHMARK_ARM_MAP: emptyArmMap(),
			BENCHMARK_BASE_DIR: writeResults(base),
			BENCHMARK_HEAD_DIR: writeResults(head),
		});
		expect(run.code).not.toBe(0);
		expect(summaryOf(run).budgets.failed).toBe(coreScenarios.length);
	});
});
