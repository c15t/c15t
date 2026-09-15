import { expect, it } from 'vitest';

import { tanstackBrowserBudgetsForScenario } from './budgets';
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
