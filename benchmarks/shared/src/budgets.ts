import type { MetricBudget } from './schema';

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
