import { expect, it } from 'vitest';

import {
	artifactBudgets,
	astroBrowserBudgetsForScenario,
	bundleEntryBudgets,
	nextjsBrowserBudgetsForScenario,
	nuxtBrowserBudgetsForScenario,
	reactBrowserBudgetsForScenario,
	sveltekitBrowserBudgetsForScenario,
	tanstackBrowserBudgetsForScenario,
} from './budgets';
import {
	nextjsBrowserScenarios,
	reactBrowserScenarios,
} from './expected-results';
import { evaluateBudget } from './reporting';
import { summarizeMetric } from './utils';

it.each([
	{ limit: 5632, metric: 'initialGzip', scenario: 'provider' },
	{ limit: 27_136, metric: 'lazyGzip', scenario: 'provider' },
	{ limit: 17_920, metric: 'gzipSize', scenario: 'provider' },
	{ limit: 14_848, metric: 'initialGzip', scenario: 'ordinary-react' },
	{ limit: 17_920, metric: 'lazyGzip', scenario: 'ordinary-react' },
	{ limit: 17_920, metric: 'gzipSize', scenario: 'ordinary-react' },
	{ limit: 14_848, metric: 'initialGzip', scenario: 'iab-lazy' },
	{ limit: 25_088, metric: 'lazyGzip', scenario: 'iab-lazy' },
	{ limit: 25_088, metric: 'gzipSize', scenario: 'iab-lazy' },
	{ limit: 5632, metric: 'initialGzip', scenario: 'kernel-hosted' },
	{ limit: 12_288, metric: 'lazyGzip', scenario: 'kernel-hosted' },
	{ limit: 3072, metric: 'gzipSize', scenario: 'kernel-hosted' },
	{ limit: 5632, metric: 'initialGzip', scenario: 'browser-full' },
	{ limit: 99_328, metric: 'lazyGzip', scenario: 'browser-full' },
	{ limit: 3072, metric: 'gzipSize', scenario: 'browser-full' },
	{ limit: 99_328, metric: 'lazyGzip', scenario: 'browser-headless' },
	{ limit: 3072, metric: 'gzipSize', scenario: 'browser-headless' },
])(
	'caps $scenario $metric growth at $limit bytes',
	({ scenario, metric, limit }) => {
		const budget = bundleEntryBudgets(scenario).find(
			(entry) => entry.metric === metric
		);
		expect.assert(budget);
		const base = summarizeMetric(metric, 'bytes', [100_000]);
		expect(
			evaluateBudget(
				budget,
				summarizeMetric(metric, 'bytes', [100_000 + limit]),
				base
			).pass
		).toBe(true);
		expect(
			evaluateBudget(
				budget,
				summarizeMetric(metric, 'bytes', [100_001 + limit]),
				base
			).pass
		).toBe(false);
	}
);

it('caps @c15t/core tarball growth at 79,872 bytes over the v3 tarball', () => {
	const budget = artifactBudgets.find((entry) => entry.metric === '@c15t/core');
	expect.assert(budget);
	const base = summarizeMetric(budget.metric, 'bytes', [323_549]);
	const grownBy = (bytes: number) =>
		evaluateBudget(
			budget,
			summarizeMetric(budget.metric, 'bytes', [323_549 + bytes]),
			base
		).pass;
	expect(grownBy(79_872)).toBe(true);
	expect(grownBy(79_873)).toBe(false);
});

it('requires zero init traffic on the consent-free TanStack baseline', () => {
	expect(tanstackBrowserBudgetsForScenario('baseline')).toContainEqual({
		comparator: 'count-eq',
		description: 'The zero-consent baseline must not call init.',
		metric: 'initRequestsAfterLoad',
		threshold: 0,
	});
});

it.each(['ssr', 'ssr-stream', 'manifest-ssr', 'manifest-ssr-proxy'])(
	'rejects redundant browser init after %s prefetch',
	(scenario) => {
		const budget = tanstackBrowserBudgetsForScenario(scenario).find(
			(entry) => entry.metric === 'initRequestsAfterLoad'
		);
		expect.assert(budget);
		expect(
			evaluateBudget(budget, summarizeMetric(budget.metric, 'count', [0])).pass
		).toBe(true);
		expect(
			evaluateBudget(budget, summarizeMetric(budget.metric, 'count', [1])).pass
		).toBe(false);
	}
);

const metricsOf = (budgets: { metric: string }[]) =>
	budgets.map((budget) => budget.metric);

it.each([
	['react', reactBrowserBudgetsForScenario('saved-consent-accept')],
	['nextjs', nextjsBrowserBudgetsForScenario('saved-consent-reject')],
	['nextjs SSR repeat', nextjsBrowserBudgetsForScenario('ssr-repeat')],
	[
		'nextjs typical-install returning',
		nextjsBrowserBudgetsForScenario('typical-install-returning'),
	],
	['tanstack', tanstackBrowserBudgetsForScenario('saved-consent-accept')],
])(
	'gates %s saved-consent visits on a hidden banner and a restored choice',
	(_framework, budgets) => {
		const metrics = metricsOf(budgets);
		expect(new Set(metrics).size).toBe(metrics.length);
		expect(metrics).not.toContain('bannerReadyMs');
		expect(metrics).toEqual(
			expect.arrayContaining(['promptShownCount', 'hydratedChoicePresent'])
		);
		const shown = budgets.find(
			(budget) => budget.metric === 'promptShownCount'
		);
		expect.assert(shown);
		expect(
			evaluateBudget(shown, summarizeMetric(shown.metric, 'count', [1])).pass
		).toBe(false);
	}
);

it.each([
	'typical-install',
	'typical-install-repeat',
	'typical-install-returning',
])('rejects browser init on the Next.js %s visit', (scenario) => {
	const budget = nextjsBrowserBudgetsForScenario(scenario).find(
		(entry) => entry.metric === 'initRequestsAfterLoad'
	);
	expect.assert(budget);
	expect(
		evaluateBudget(budget, summarizeMetric(budget.metric, 'count', [1])).pass
	).toBe(false);
});

it('requires server HTML without a banner for SSR saved-consent visits', () => {
	expect(
		metricsOf(nextjsBrowserBudgetsForScenario('saved-consent-accept'))
	).toContain('bannerInServerHtml');
	expect(
		metricsOf(reactBrowserBudgetsForScenario('saved-consent-accept'))
	).not.toContain('bannerInServerHtml');
});

it.each([
	astroBrowserBudgetsForScenario,
	sveltekitBrowserBudgetsForScenario,
	nuxtBrowserBudgetsForScenario,
])('drops banner readiness only for the stored-consent arm', (budgetsFor) => {
	expect(metricsOf(budgetsFor('repeat-visitor'))).not.toContain(
		'bannerReadyMs'
	);
	expect(metricsOf(budgetsFor('ssr-manifest'))).toContain('bannerReadyMs');
});

it('lists the saved-consent visits instead of the fresh-context repeat arm', () => {
	for (const scenarios of [reactBrowserScenarios, nextjsBrowserScenarios]) {
		expect(scenarios).toEqual(
			expect.arrayContaining(['saved-consent-accept', 'saved-consent-reject'])
		);
		expect(scenarios).not.toContain('repeat-visitor');
	}
});
