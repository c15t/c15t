/**
 * The examples payload gate: which starters it measures, how each one is
 * classified, and the budgets a head run must meet against its base.
 *
 * The runner lives in `benchmarks/examples-payload`. It builds every starter
 * in `examples/` against a fixture backend and records first-load client
 * bytes per example. This module holds the parts the comparison gate also
 * needs, so `expected-results.ts` and the runner agree on names and budgets.
 */
import type { BenchmarkFramework, MetricBudget } from './schema';

export const EXAMPLES_PAYLOAD_PACKAGE = '@c15t/examples-payload-bench';

/**
 * - `server`: a server-framework client (Next, Nuxt server output, TanStack
 *   Start, SvelteKit, Astro). Consent resolves on the server or through a
 *   hosted backend, so first-load JS must not carry the manifest resolver,
 *   the snapshot, offline policy data or other languages.
 * - `spa`: a single-page app or script tag that resolves in the browser. It
 *   may carry the resolver and snapshot, but not offline policy data or
 *   other languages.
 */
export type ExampleKind = 'server' | 'spa';

export interface ExamplesPayloadExample {
	/** Directory under `examples/`, also the result scenario. */
	name: string;
	kind: ExampleKind;
	framework: BenchmarkFramework;
}

export const examplesPayloadExamples: readonly ExamplesPayloadExample[] = [
	{ framework: 'nextjs', kind: 'server', name: 'nextjs' },
	{ framework: 'nextjs', kind: 'server', name: 'nextjs-pages-router' },
	{ framework: 'vue', kind: 'server', name: 'nuxt' },
	// `manifest: 'client'` resolves in the browser.
	{ framework: 'vue', kind: 'spa', name: 'nuxt-static' },
	{ framework: 'tanstack-start', kind: 'server', name: 'tanstack-start' },
	{ framework: 'astro', kind: 'server', name: 'astro' },
	// Static output, but the Astro boot script in hosted mode.
	{ framework: 'astro', kind: 'server', name: 'astro-static' },
	{ framework: 'react', kind: 'spa', name: 'react' },
	{ framework: 'core', kind: 'spa', name: 'javascript' },
	{ framework: 'core', kind: 'spa', name: 'html' },
	{ framework: 'vue', kind: 'spa', name: 'vue' },
	{ framework: 'svelte', kind: 'spa', name: 'svelte' },
	{ framework: 'svelte', kind: 'server', name: 'sveltekit' },
];

/**
 * Boundary metrics: gzip bytes of first-load JS assets that contain a
 * marker string for that boundary.
 */
export const EXAMPLES_PAYLOAD_BOUNDARY_METRICS = [
	'snapshotBytes',
	'resolverBytes',
	'offlinePolicyBytes',
	'nonEnLocaleBytes',
	'iabBytes',
	'devtoolsBytes',
] as const;

export type ExamplesPayloadBoundaryMetric =
	(typeof EXAMPLES_PAYLOAD_BOUNDARY_METRICS)[number];

const absent = function absent(
	metric: string,
	description: string
): MetricBudget {
	return { comparator: 'absolute-lte', description, metric, threshold: 0 };
};

/**
 * Budgets for one example. First-load JS may not grow at all (0-byte
 * tolerance), a first visit may not add cross-origin requests, and the
 * boundaries for the example's kind must stay out of first-load JS.
 *
 * @param kind - How the example resolves consent.
 * @returns The budget definitions its result must carry.
 */
export const examplesPayloadBudgetsFor = function examplesPayloadBudgetsFor(
	kind: ExampleKind
): MetricBudget[] {
	const budgets: MetricBudget[] = [
		{
			comparator: 'delta-bytes-lte',
			description: 'First-load JavaScript may not grow (gzip, 0 B tolerance).',
			metric: 'initialJsGzip',
			threshold: 0,
		},
		{
			comparator: 'delta-bytes-lte',
			description:
				'First-load JavaScript may not grow (brotli, 0 B tolerance).',
			metric: 'initialJsBrotli',
			threshold: 0,
		},
		{
			comparator: 'delta-bytes-lte',
			description: 'A first visit may not add cross-origin requests.',
			metric: 'crossOriginRequests',
			threshold: 0,
		},
		absent(
			'offlinePolicyBytes',
			'Offline fallback policy data stays out of first-load JavaScript.'
		),
		absent(
			'nonEnLocaleBytes',
			'Languages other than English stay out of first-load JavaScript.'
		),
	];
	if (kind === 'server') {
		budgets.push(
			absent(
				'snapshotBytes',
				'The server manifest snapshot stays out of first-load JavaScript.'
			),
			absent(
				'resolverBytes',
				'The browser manifest resolver stays out of first-load JavaScript.'
			),
			absent(
				'manifestRequests',
				'The browser does not fetch the manifest on a server-resolved page.'
			)
		);
	}
	return budgets;
};
