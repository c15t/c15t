/**
 * Registry of the benchmark results the comparison gate expects.
 *
 * `run-compare.ts` reads this list to fail a run that measured less than
 * it should have: a missing head artifact, a missing base artifact, or a
 * head artifact whose budget definitions dropped a metric all count as
 * gate failures. The budget definitions are the same objects the runners
 * attach, and the comparison runner checks each head definition against
 * them canonically (metric, comparator, thresholds, arm mapping), so a
 * runner that drops or weakens a budget cannot pass the gate.
 */
import {
	artifactBudgets,
	bundleBudgets,
	coreRuntimeBudgets,
	coreRuntimeCoverageBudgets,
	coreRuntimeV3Budgets,
	importBoundaryBudgets,
	nextjsBrowserBudgetsForScenario,
	nuxtBrowserBudgetsForScenario,
	policyRuntimeBudgetsForFixture,
	reactBrowserBudgetsForScenario,
	scriptLifecycleBudgetsForMetric,
} from './budgets';
import { coreFixtures } from './fixtures';
import { policyBenchFixtures } from './policy-fixtures';
import type { BenchmarkSuite, MetricBudget } from './schema';

export interface ExpectedBenchmarkResult {
	/** `${package}:${scenario}:${suite}` */
	key: string;
	suite: BenchmarkSuite;
	/** Canonical budget definitions the head artifact must carry. */
	budgets: MetricBudget[];
}

/** Identity of a budget within one result: metric plus base arm. */
export const budgetIdentity = function budgetIdentity(
	budget: Pick<MetricBudget, 'metric' | 'baseArm'>
): string {
	return budget.baseArm ? `${budget.metric}@${budget.baseArm}` : budget.metric;
};

/**
 * Canonical comparison of two budget definitions. Descriptions are prose
 * and ignored; everything that changes what the budget enforces must match.
 */
export const describeBudgetDifference = function describeBudgetDifference(
	expected: MetricBudget,
	actual: MetricBudget
): string | null {
	const fields: (keyof MetricBudget)[] = [
		'comparator',
		'threshold',
		'secondaryThreshold',
		'baseArm',
		'baseArmMetric',
	];
	const differences = fields
		.filter((field) => expected[field] !== actual[field])
		.map(
			(field) =>
				`${field} expected ${String(expected[field])} but saw ${String(actual[field])}`
		);
	return differences.length > 0 ? differences.join('; ') : null;
};

const expect = function expect(
	pkg: string,
	scenario: string,
	suite: BenchmarkSuite,
	budgets: MetricBudget[]
): ExpectedBenchmarkResult {
	return {
		budgets,
		key: `${pkg}:${scenario}:${suite}`,
		suite,
	};
};

export const reactBrowserScenarios = [
	'banner-css',
	'baseline',
	'css-banner-modules',
	'full-ui',
	'headless',
	'repeat-visitor',
	'policy-fresh',
	'policy-reject',
	'policy-notice',
	'policy-none',
	'policy-repeat',
] as const;

export const nextjsBrowserScenarios = [
	'baseline',
	'client',
	'manifest-client',
	'ssr',
	'manifest-ssr',
	'rsc-ssr',
	'repeat-visitor',
	'ssr-repeat',
] as const;

export const nuxtBrowserScenarios = [
	'baseline',
	'baseline-client',
	'ssr',
	'ssr-manifest',
	'client',
	'client-manifest',
	'repeat-visitor',
] as const;

export const scriptLifecycleScenarios = [
	['grant-standard', 'grantStandardLifecycleMs'],
	['revoke-standard', 'revokeStandardLifecycleMs'],
	['reload-single', 'reloadSingleScriptMs'],
	['callback-only-toggle', 'callbackOnlyToggleMs'],
	['always-load-retain', 'alwaysLoadRetentionMs'],
	['persist-after-revoked', 'persistAfterRevokedMs'],
] as const;

export const bundleRouteScenarios = [
	'baseline',
	'core-only',
	'css-banner-modules',
	'css-iab-lazy',
	'css-iab-modules',
	'nextjs-basic',
	'nextjs-ssr',
	'react-banner-only',
	'react-full',
	'react-full-split',
	'react-harness',
	'react-headless',
	'react-manifest-client',
	'react-standard-script-loader',
] as const;

export const bundleEntryScenarios = [
	'kernel-hosted',
	'kernel-hosted-offline',
	'manifest-transport',
	'provider',
	'ordinary-react',
] as const;

const bundleRouteBudget = function bundleRouteBudget(
	scenario: string
): MetricBudget[] {
	return bundleBudgets.filter((budget) => budget.metric === scenario);
};

export const expectedBenchmarkResults: ExpectedBenchmarkResult[] = [
	...Object.keys(coreFixtures).map((fixture) =>
		expect('@c15t/core-benchmarks', fixture, 'core-runtime', [
			...coreRuntimeBudgets,
			...coreRuntimeCoverageBudgets,
			...coreRuntimeV3Budgets,
		])
	),
	...Object.values(policyBenchFixtures).map((fixture) =>
		expect(
			'@c15t/core-benchmarks',
			fixture.name,
			'policy-runtime',
			policyRuntimeBudgetsForFixture(fixture)
		)
	),
	...reactBrowserScenarios.map((scenario) =>
		expect(
			'@c15t/react-browser-bench',
			scenario,
			'browser-runtime',
			reactBrowserBudgetsForScenario(scenario)
		)
	),
	...nextjsBrowserScenarios.map((scenario) =>
		expect(
			'@c15t/nextjs-browser-bench',
			scenario,
			'browser-runtime',
			nextjsBrowserBudgetsForScenario(scenario)
		)
	),
	...nuxtBrowserScenarios.map((scenario) =>
		expect(
			'@c15t/vue',
			scenario,
			'browser-runtime',
			nuxtBrowserBudgetsForScenario(scenario)
		)
	),
	...scriptLifecycleScenarios.map(([scenario, metric]) =>
		expect(
			'@c15t/script-lifecycle-bench',
			scenario,
			'script-lifecycle',
			scriptLifecycleBudgetsForMetric(metric)
		)
	),
	...bundleRouteScenarios.map((scenario) =>
		expect(
			'@c15t/next-bundle-bench',
			scenario,
			'bundle',
			bundleRouteBudget(scenario)
		)
	),
	expect('@c15t/next-bundle-bench', 'tarballs', 'artifact', artifactBudgets),
	...bundleEntryScenarios.map((scenario) =>
		expect(
			'@c15t/next-bundle-bench',
			scenario,
			'bundle',
			scenario === 'ordinary-react' ? importBoundaryBudgets : []
		)
	),
];
