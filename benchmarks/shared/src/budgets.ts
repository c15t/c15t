import type { MetricBudget } from './schema';

/**
 * v3 budget constants for `c15t`, `@c15t/react`, and `@c15t/nextjs`.
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
		comparator: 'percent-lte',
		description:
			'v3 kernel construction must not regress vs v2 baseline (target: sub-µs, pure).',
		metric: 'createConsentKernel',
		threshold: 0,
	},
	{
		comparator: 'percent-lte',
		description: 'v3 full init must be at least 50% faster than v2 baseline.',
		metric: 'initConsentManager',
		threshold: -50,
	},
	{
		comparator: 'percent-lte',
		description:
			'v3 repeat-visitor init must be at least 50% faster than v2 baseline.',
		metric: 'repeatVisitorInit',
		threshold: -50,
	},
];

export const bundleV3Budgets: MetricBudget[] = [
	{
		comparator: 'percent-lte',
		description:
			'v3 /core-only route addition must be at least 30% smaller than v2 baseline.',
		metric: 'core-only',
		threshold: -30,
	},
	{
		comparator: 'percent-lte',
		description:
			'v3 /react-headless route addition must be at least 30% smaller than v2 baseline.',
		metric: 'react-headless',
		threshold: -30,
	},
	{
		comparator: 'percent-lte',
		description:
			'v3 /react-banner-only route addition must be at least 30% smaller than v2 baseline.',
		metric: 'react-banner-only',
		threshold: -30,
	},
	{
		comparator: 'percent-lte',
		description:
			'v3 /react-full route addition must be at least 30% smaller than v2 baseline.',
		metric: 'react-full',
		threshold: -30,
	},
	{
		comparator: 'percent-lte',
		description:
			'v3 /nextjs-basic route addition must be at least 30% smaller than v2 baseline.',
		metric: 'nextjs-basic',
		threshold: -30,
	},
];

export const artifactV3Budgets: MetricBudget[] = [
	{
		comparator: 'percent-lte',
		description:
			'v3 c15t package tarball must be at least 30% smaller than v2.',
		metric: 'c15t',
		threshold: -30,
	},
	{
		comparator: 'percent-lte',
		description:
			'v3 @c15t/react package tarball must be at least 30% smaller than v2.',
		metric: '@c15t/react',
		threshold: -30,
	},
	{
		comparator: 'percent-lte',
		description:
			'v3 @c15t/nextjs package tarball must be at least 30% smaller than v2.',
		metric: '@c15t/nextjs',
		threshold: -30,
	},
];

export const coreRuntimeBudgets: MetricBudget[] = [
	{
		comparator: 'percent-lte',
		description:
			'Tiny runtime operations may regress slightly, but should stay within 30%.',
		metric: 'createConsentKernel',
		threshold: 30,
	},
	{
		comparator: 'percent-lte',
		description: 'Snapshot reads should remain within 20% of the baseline.',
		metric: 'getSnapshot',
		threshold: 20,
	},
	{
		comparator: 'percent-lte',
		description: 'Full init cost should remain within 15% of the baseline.',
		metric: 'initConsentManager',
		threshold: 15,
	},
];

export const bundleBudgets: MetricBudget[] = [
	{
		comparator: 'delta-bytes-lte',
		description:
			'The core-only route should not gain more than 1.5kB over the base branch.',
		metric: 'core-only',
		threshold: 1536,
	},
	{
		comparator: 'delta-bytes-lte',
		description: 'Headless React bundle delta budget.',
		metric: 'react-headless',
		threshold: 2048,
	},
	{
		comparator: 'delta-bytes-lte',
		description: 'React banner bundle delta budget.',
		metric: 'react-banner-only',
		threshold: 3072,
	},
	{
		comparator: 'delta-bytes-lte',
		description: 'React full bundle delta budget.',
		metric: 'react-full',
		threshold: 4096,
	},
	{
		comparator: 'delta-bytes-lte',
		description: 'Next.js package bundle delta budget.',
		metric: 'nextjs-basic',
		threshold: 3072,
	},
];

export const artifactBudgets: MetricBudget[] = [
	{
		comparator: 'absolute-and-percent-lte',
		description: 'Core package tarball growth must stay below 15kB and 10%.',
		metric: 'c15t',
		secondaryThreshold: 10,
		threshold: 15360,
	},
	{
		comparator: 'absolute-and-percent-lte',
		description: 'React package tarball growth must stay below 15kB and 10%.',
		metric: '@c15t/react',
		secondaryThreshold: 10,
		threshold: 15360,
	},
	{
		comparator: 'absolute-and-percent-lte',
		description: 'Next.js package tarball growth must stay below 15kB and 10%.',
		metric: '@c15t/nextjs',
		secondaryThreshold: 10,
		threshold: 15360,
	},
];

export const browserBudgets: MetricBudget[] = [
	{
		comparator: 'absolute-and-percent-lte',
		description:
			'Banner readiness should not regress by more than 25ms and 15%.',
		metric: 'bannerReadyMs',
		secondaryThreshold: 15,
		threshold: 25,
	},
	{
		comparator: 'absolute-and-percent-lte',
		description: 'Final app-script response end budget.',
		metric: 'lastAppScriptEndMs',
		secondaryThreshold: 10,
		threshold: 15,
	},
	{
		comparator: 'absolute-and-percent-lte',
		description: 'Interaction latency budget.',
		metric: 'interactionLatencyMs',
		secondaryThreshold: 20,
		threshold: 20,
	},
	{
		comparator: 'percent-lte',
		description: 'Long-task total should not grow by more than 25%.',
		metric: 'longTaskTotalMs',
		threshold: 25,
	},
	{
		comparator: 'count-eq',
		description: 'Client/prefetch initial request count invariant.',
		metric: 'initRequestsAfterLoad',
		threshold: 1,
	},
	{
		comparator: 'count-eq',
		description: 'SSR routes should not show browser-observed init requests.',
		metric: 'ssrInitRequestsAfterLoad',
		threshold: 0,
	},
];

export const scriptLifecycleBudgets: MetricBudget[] = [
	{
		comparator: 'absolute-and-percent-lte',
		description: 'Grant-standard script lifecycle budget.',
		metric: 'grantStandardLifecycleMs',
		secondaryThreshold: 20,
		threshold: 20,
	},
	{
		comparator: 'absolute-and-percent-lte',
		description: 'Revoke-standard script lifecycle budget.',
		metric: 'revokeStandardLifecycleMs',
		secondaryThreshold: 20,
		threshold: 25,
	},
	{
		comparator: 'absolute-and-percent-lte',
		description: 'Single-script reload lifecycle budget.',
		metric: 'reloadSingleScriptMs',
		secondaryThreshold: 20,
		threshold: 15,
	},
	{
		comparator: 'absolute-and-percent-lte',
		description: 'Callback-only script lifecycle budget.',
		metric: 'callbackOnlyToggleMs',
		secondaryThreshold: 20,
		threshold: 10,
	},
	{
		comparator: 'absolute-and-percent-lte',
		description: 'alwaysLoad script retention lifecycle budget.',
		metric: 'alwaysLoadRetentionMs',
		secondaryThreshold: 20,
		threshold: 20,
	},
	{
		comparator: 'absolute-and-percent-lte',
		description: 'persistAfterConsentRevoked lifecycle budget.',
		metric: 'persistAfterRevokedMs',
		secondaryThreshold: 20,
		threshold: 20,
	},
	{
		comparator: 'count-eq',
		description: 'Script lifecycle benchmark should not emit errors.',
		metric: 'errorCount',
		threshold: 0,
	},
];
