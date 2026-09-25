import { expect, it } from 'vitest';

import {
	astroBrowserBudgetsForScenario,
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

it('requires zero init traffic on the consent-free TanStack baseline', () => {
	expect(tanstackBrowserBudgetsForScenario('baseline')).toContainEqual({
		comparator: 'count-eq',
		description: 'The zero-consent baseline must not call init.',
		metric: 'initRequestsAfterLoad',
		threshold: 0,
	});
});

it.each(['ssr', 'manifest-ssr', 'manifest-ssr-proxy'])(
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
	['tanstack', tanstackBrowserBudgetsForScenario('saved-consent-accept')],
])(
	'gates %s saved-consent visits on a hidden banner and a restored choice',
	(_framework, budgets) => {
		const metrics = metricsOf(budgets);
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
