import type { MetricBudget } from './schema';

/**
 * v3 budget constants — apply to `c15t/v3`, `@c15t/react/v3`, `@c15t/nextjs/v3`.
 *
 * These use `percent-lte` with NEGATIVE thresholds, meaning the v3 measurement
 * must IMPROVE by at least |threshold|% against the base branch. The base
 * branch is expected to carry the v2-era benchmark numbers documented in
 * `benchmarks/BASELINE.md`, so the net effect is "v3 must be at least N%
 * faster/smaller than the v2 baseline."
 *
 * These are attached to v3 benchmark output via the v3 runners' `budgetDefinitions`
 * field (see `benchmarks/core-benchmarks/src/run.ts` for the v2 equivalent).
 * Until the v3 runners exist (Track 2), these constants are exported but unused.
 *
 * Per `.context/plans/system-instruction-you-are-working-cryptic-pelican.md`:
 *   Bundle: −30% or better
 *   First-render / repeatVisitorInit: −50% or better
 *   Retained heap: −50% or better
 *   Zero unrelated React re-renders (enforced via separate profiler harness)
 */
export const coreRuntimeV3Budgets: MetricBudget[] = [
	{
		metric: 'createConsentKernel',
		comparator: 'percent-lte',
		threshold: 0,
		description:
			'v3 kernel construction must not regress vs v2 baseline (target: sub-µs, pure).',
	},
	{
		metric: 'initConsentManager',
		comparator: 'percent-lte',
		threshold: -50,
		description: 'v3 full init must be at least 50% faster than v2 baseline.',
	},
	{
		metric: 'repeatVisitorInit',
		comparator: 'percent-lte',
		threshold: -50,
		description:
			'v3 repeat-visitor init must be at least 50% faster than v2 baseline.',
	},
];

export const bundleV3Budgets: MetricBudget[] = [
	{
		metric: 'core-only',
		comparator: 'percent-lte',
		threshold: -30,
		description:
			'v3 /core-only route addition must be at least 30% smaller than v2 baseline.',
	},
	{
		metric: 'react-headless',
		comparator: 'percent-lte',
		threshold: -30,
		description:
			'v3 /react-headless route addition must be at least 30% smaller than v2 baseline.',
	},
	{
		metric: 'react-banner-only',
		comparator: 'percent-lte',
		threshold: -30,
		description:
			'v3 /react-banner-only route addition must be at least 30% smaller than v2 baseline.',
	},
	{
		metric: 'react-full',
		comparator: 'percent-lte',
		threshold: -30,
		description:
			'v3 /react-full route addition must be at least 30% smaller than v2 baseline.',
	},
	{
		metric: 'nextjs-basic',
		comparator: 'percent-lte',
		threshold: -30,
		description:
			'v3 /nextjs-basic route addition must be at least 30% smaller than v2 baseline.',
	},
];

export const artifactV3Budgets: MetricBudget[] = [
	{
		metric: 'c15t',
		comparator: 'percent-lte',
		threshold: -30,
		description:
			'v3 c15t package tarball must be at least 30% smaller than v2.',
	},
	{
		metric: '@c15t/react',
		comparator: 'percent-lte',
		threshold: -30,
		description:
			'v3 @c15t/react package tarball must be at least 30% smaller than v2.',
	},
	{
		metric: '@c15t/nextjs',
		comparator: 'percent-lte',
		threshold: -30,
		description:
			'v3 @c15t/nextjs package tarball must be at least 30% smaller than v2.',
	},
];

export const coreRuntimeBudgets: MetricBudget[] = [
	{
		metric: 'configureConsentManager',
		comparator: 'percent-lte',
		threshold: 30,
		description:
			'Tiny runtime operations may regress slightly, but should stay within 30%.',
	},
	{
		metric: 'createConsentManagerStore',
		comparator: 'percent-lte',
		threshold: 20,
		description: 'Store creation should remain within 20% of the baseline.',
	},
	{
		metric: 'initConsentManager',
		comparator: 'percent-lte',
		threshold: 15,
		description: 'Full init cost should remain within 15% of the baseline.',
	},
];

export const bundleBudgets: MetricBudget[] = [
	{
		metric: 'core-only',
		comparator: 'delta-bytes-lte',
		threshold: 1536,
		description:
			'The core-only route should not gain more than 1.5kB over the base branch.',
	},
	{
		metric: 'react-headless',
		comparator: 'delta-bytes-lte',
		threshold: 2048,
		description: 'Headless React bundle delta budget.',
	},
	{
		metric: 'react-banner-only',
		comparator: 'delta-bytes-lte',
		threshold: 3072,
		description: 'React banner bundle delta budget.',
	},
	{
		metric: 'react-full',
		comparator: 'delta-bytes-lte',
		threshold: 4096,
		description: 'React full bundle delta budget.',
	},
	{
		metric: 'nextjs-basic',
		comparator: 'delta-bytes-lte',
		threshold: 3072,
		description: 'Next.js package bundle delta budget.',
	},
];

export const artifactBudgets: MetricBudget[] = [
	{
		metric: 'c15t',
		comparator: 'absolute-and-percent-lte',
		threshold: 15360,
		secondaryThreshold: 10,
		description: 'Core package tarball growth must stay below 15kB and 10%.',
	},
	{
		metric: '@c15t/react',
		comparator: 'absolute-and-percent-lte',
		threshold: 15360,
		secondaryThreshold: 10,
		description: 'React package tarball growth must stay below 15kB and 10%.',
	},
	{
		metric: '@c15t/nextjs',
		comparator: 'absolute-and-percent-lte',
		threshold: 15360,
		secondaryThreshold: 10,
		description: 'Next.js package tarball growth must stay below 15kB and 10%.',
	},
];

export const browserBudgets: MetricBudget[] = [
	{
		metric: 'bannerReadyMs',
		comparator: 'absolute-and-percent-lte',
		threshold: 25,
		secondaryThreshold: 15,
		description:
			'Banner readiness should not regress by more than 25ms and 15%.',
	},
	{
		metric: 'lastAppScriptEndMs',
		comparator: 'absolute-and-percent-lte',
		threshold: 15,
		secondaryThreshold: 10,
		description: 'Final app-script response end budget.',
	},
	{
		metric: 'interactionLatencyMs',
		comparator: 'absolute-and-percent-lte',
		threshold: 20,
		secondaryThreshold: 20,
		description: 'Interaction latency budget.',
	},
	{
		metric: 'longTaskTotalMs',
		comparator: 'percent-lte',
		threshold: 25,
		description: 'Long-task total should not grow by more than 25%.',
	},
	{
		metric: 'initRequestsAfterLoad',
		comparator: 'count-eq',
		threshold: 1,
		description: 'Client/prefetch initial request count invariant.',
	},
	{
		metric: 'ssrInitRequestsAfterLoad',
		comparator: 'count-eq',
		threshold: 0,
		description: 'SSR routes should not show browser-observed init requests.',
	},
];

export const scriptLifecycleBudgets: MetricBudget[] = [
	{
		metric: 'grantStandardLifecycleMs',
		comparator: 'absolute-and-percent-lte',
		threshold: 20,
		secondaryThreshold: 20,
		description: 'Grant-standard script lifecycle budget.',
	},
	{
		metric: 'revokeStandardLifecycleMs',
		comparator: 'absolute-and-percent-lte',
		threshold: 25,
		secondaryThreshold: 20,
		description: 'Revoke-standard script lifecycle budget.',
	},
	{
		metric: 'reloadSingleScriptMs',
		comparator: 'absolute-and-percent-lte',
		threshold: 15,
		secondaryThreshold: 20,
		description: 'Single-script reload lifecycle budget.',
	},
	{
		metric: 'callbackOnlyToggleMs',
		comparator: 'absolute-and-percent-lte',
		threshold: 10,
		secondaryThreshold: 20,
		description: 'Callback-only script lifecycle budget.',
	},
	{
		metric: 'alwaysLoadRetentionMs',
		comparator: 'absolute-and-percent-lte',
		threshold: 20,
		secondaryThreshold: 20,
		description: 'alwaysLoad script retention lifecycle budget.',
	},
	{
		metric: 'persistAfterRevokedMs',
		comparator: 'absolute-and-percent-lte',
		threshold: 20,
		secondaryThreshold: 20,
		description: 'persistAfterConsentRevoked lifecycle budget.',
	},
	{
		metric: 'errorCount',
		comparator: 'count-eq',
		threshold: 0,
		description: 'Script lifecycle benchmark should not emit errors.',
	},
];
