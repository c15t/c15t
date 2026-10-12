import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
	artifactBudgets,
	coreRuntimeBudgets,
	coreRuntimeCoverageBudgets,
	coreRuntimeV3Budgets,
} from './budgets';
import { expectedBenchmarkResults } from './expected-results';
import type {
	BenchmarkComparisonResult,
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
	comparison: BenchmarkComparisonResult | null;
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
	const comparisonPath = join(compareDir, 'comparison.json');
	return {
		code,
		comparison: existsSync(comparisonPath)
			? readJson<BenchmarkComparisonResult>(comparisonPath)
			: null,
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

const tarballResult = (
	nextjsBytes: number,
	includesDialogRules?: boolean | null,
	reactBytes = 10_000
): BenchmarkResult => ({
	...makeResult('tarballs', {}, artifactBudgets),
	metadata: { nextjsIncludesDialogRules: includesDialogRules },
	metrics: Object.entries({
		'@c15t/core': 10_000,
		'@c15t/nextjs': nextjsBytes,
		'@c15t/react': reactBytes,
	}).map(([name, value]) => summarizeMetric(name, 'bytes', [value])),
	package: '@c15t/next-bundle-bench',
	suite: 'artifact',
});

describe('dialog CSS tarball allowance', () => {
	const compareTarballs = (base: BenchmarkResult, head: BenchmarkResult) =>
		runCompare({
			BENCHMARK_BASE_DIR: writeResults([base]),
			BENCHMARK_EXPECTED_SUITES: 'artifact',
			BENCHMARK_HEAD_DIR: writeResults([head]),
			BENCHMARK_PROFILE: 'regression',
		});

	it('accepts the measured CSS restoration when the base lacks dialog rules', () => {
		const run = compareTarballs(
			tarballResult(37_164, false),
			tarballResult(41_651, true)
		);
		expect(run.code).toBe(0);
		expect(summaryOf(run).budgets.passed).toBe(3);
		expect(run.comparison?.results[0]?.metrics).toContainEqual({
			baseMedian: 37_164,
			delta: 4487,
			deltaPercent: 12.074,
			headMedian: 41_651,
			name: '@c15t/nextjs',
			unit: 'bytes',
		});
		expect(
			run.comparison?.results[0]?.budgets.find(
				(budget) => budget.metric === '@c15t/nextjs'
			)?.message
		).toContain('4487-byte dialog CSS allowance');
	});

	it.each([true, undefined, null])(
		'keeps the 10%% limit when the base dialog state is %s',
		(includesDialogRules) => {
			const run = compareTarballs(
				tarballResult(37_164, includesDialogRules),
				tarballResult(41_651, true)
			);
			expect(run.code).toBe(1);
			expect(summaryOf(run).budgets.failed).toBe(1);
		}
	);

	it.each([false, undefined, null])(
		'requires the head to include the restored rules, received %s',
		(includesDialogRules) => {
			const run = compareTarballs(
				tarballResult(37_164, false),
				tarballResult(41_651, includesDialogRules)
			);
			expect(run.code).toBe(1);
		}
	);

	it('does not waive a zero-byte baseline', () => {
		const run = compareTarballs(
			tarballResult(0, false),
			tarballResult(4487, true)
		);
		expect(run.code).toBe(1);
	});

	it('caps growth at 10% of the original base plus 4,487 bytes', () => {
		expect(
			compareTarballs(tarballResult(37_164, false), tarballResult(45_367, true))
				.code
		).toBe(0);
		expect(
			compareTarballs(tarballResult(37_164, false), tarballResult(45_368, true))
				.code
		).toBe(1);
	});

	it('preserves the 15 KiB absolute limit', () => {
		const run = compareTarballs(
			tarballResult(200_000, false),
			tarballResult(220_000, true)
		);
		expect(run.code).toBe(1);
	});

	it('does not give other packages the Next.js allowance', () => {
		const run = compareTarballs(
			tarballResult(37_164, false),
			tarballResult(41_651, true, 12_000)
		);
		expect(run.code).toBe(1);
		expect(summaryOf(run).budgets.failed).toBe(1);
	});
});
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
			'threshold expected 2 but saw 50'
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
			'comparator expected absolute-or-percent-lte but saw absolute-lte'
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

	it('compares v3 regressions without claiming to evaluate historical v2 targets', () => {
		const results = fullCore();
		const run = runCompare({
			BENCHMARK_ARM_MAP: emptyArmMap(),
			BENCHMARK_BASE_DIR: writeResults(results),
			BENCHMARK_HEAD_DIR: writeResults(results),
			BENCHMARK_PROFILE: 'regression',
		});
		expect(run.code).toBe(0);
		expect(summaryOf(run).budgets.unevaluatedArm).toBe(0);
		expect(summaryOf(run).budgets.expected).toBe(
			coreScenarios.length * (coreBudgets.length - coreRuntimeV3Budgets.length)
		);
	});

	it('requires exactly the scenarios a CI shard measured', () => {
		const tiny = [makeResult('tiny', coreMedians, coreBudgets)];
		const shard = runCompare({
			BENCHMARK_ARM_MAP: emptyArmMap(),
			BENCHMARK_BASE_DIR: writeResults(tiny),
			BENCHMARK_HEAD_DIR: writeResults(tiny),
			BENCHMARK_PROFILE: 'regression',
			C15T_BENCH_ONLY: 'core-runtime:tiny',
		});
		expect(shard.code).toBe(0);
		expect(summaryOf(shard).results.expected).toBe(1);

		const missing = runCompare({
			BENCHMARK_ARM_MAP: emptyArmMap(),
			BENCHMARK_BASE_DIR: writeResults(tiny),
			BENCHMARK_HEAD_DIR: writeResults(tiny),
			BENCHMARK_PROFILE: 'regression',
			C15T_BENCH_ONLY: 'core-runtime',
			C15T_BENCH_SKIP: 'core-runtime:large',
		});
		expect(missing.code).not.toBe(0);
		expect(summaryOf(missing).results.missingHead).toContain(
			'@c15t/core-benchmarks:small:core-runtime'
		);
		expect(summaryOf(missing).results.missingHead).not.toContain(
			'@c15t/core-benchmarks:large:core-runtime'
		);
	});

	it('rejects an empty suite selection instead of passing without results', () => {
		const run = runCompare({ BENCHMARK_EXPECTED_SUITES: 'misspelled-suite' });
		expect(run.code).not.toBe(0);
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
		const head = fullCore({ ...coreMedians, getSnapshot: 3 });
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

it('reports unselected packages as unexpected without evaluating their failures', () => {
	const unselected = {
		...makeResult('unselected', { time: 100 }, [
			{
				comparator: 'absolute-lte',
				description: 'fixture',
				metric: 'time',
				threshold: 0,
			},
		]),
		package: '@fixture/unselected',
	};
	const run = runCompare({
		BENCHMARK_ARM_MAP: emptyArmMap(),
		BENCHMARK_BASE_DIR: writeResults(fullCore()),
		BENCHMARK_EXPECTED_PACKAGES: '@c15t/core-benchmarks',
		BENCHMARK_HEAD_DIR: writeResults([...fullCore(), unselected]),
		BENCHMARK_PROFILE: 'regression',
	});
	expect(run.code).toBe(0);
	expect(summaryOf(run).results.unexpected).toContain(
		'@fixture/unselected:unselected:core-runtime'
	);
	expect(summaryOf(run).results.compared).toBe(coreScenarios.length);
});
