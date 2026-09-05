/**
 * Registry of the benchmark results the comparison gate expects.
 *
 * `run-compare.ts` reads this list to fail a run that measured less than
 * it should have: a missing head artifact, a missing base artifact, or a
 * head artifact whose budget definitions dropped a metric all count as
 * gate failures. The budget metric lists are derived from the same budget
 * helpers the runners attach, so the two cannot drift apart silently.
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
	/** Budget metric names the head artifact must define. */
	budgets: string[];
}

const metricNames = function metricNames(budgets: MetricBudget[]): string[] {
	return budgets.map((budget) => budget.metric);
};

const expect = function expect(
	pkg: string,
	scenario: string,
	suite: BenchmarkSuite,
	budgets: MetricBudget[]
): ExpectedBenchmarkResult {
	return {
		budgets: metricNames(budgets),
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
