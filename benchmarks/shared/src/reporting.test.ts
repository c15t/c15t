import { describe, expect, it } from 'vitest';

import {
	nuxtBrowserBudgetsForScenario,
	reactBrowserBudgetsForScenario,
} from './budgets';
import { evaluateBudget, hasFailingBudgets } from './reporting';
import type { BenchmarkComparisonResult, MetricSampleSet } from './schema';
import { summarizeMetric } from './utils';

const metric = (name: string, median: number): MetricSampleSet =>
	summarizeMetric(name, 'us', [median]);

describe('evaluateBudget', () => {
	it.each([
		'baseline-client',
		'baseline-client-cold',
		'baseline-client-steady',
	])('enforces zero consent requests for %s', (scenario) => {
		const budget = nuxtBrowserBudgetsForScenario(scenario).find(
			(candidate) => candidate.metric === 'initRequestsAfterLoad'
		);
		if (!budget) {
			throw new Error('Missing baseline request budget');
		}
		expect(
			evaluateBudget(budget, metric('initRequestsAfterLoad', 0)).pass
		).toBe(true);
		expect(
			evaluateBudget(budget, metric('initRequestsAfterLoad', 1)).pass
		).toBe(false);
	});

	it('rejects a third notice render under the measured two-commit budget', () => {
		const budget = reactBrowserBudgetsForScenario('policy-notice').find(
			(candidate) => candidate.metric === 'renderCount'
		);
		if (!budget) {
			throw new Error('Missing notice render budget');
		}
		expect(evaluateBudget(budget, metric('renderCount', 2)).pass).toBe(true);
		expect(evaluateBudget(budget, metric('renderCount', 3)).pass).toBe(false);
	});

	it('fails a relative budget when the base metric is missing', () => {
		const result = evaluateBudget(
			{
				comparator: 'percent-lte',
				description: 'no regression',
				metric: 'initConsentManager',
				threshold: 0,
			},
			metric('initConsentManager', 1),
			undefined
		);
		expect(result.pass).toBe(false);
		expect(result.status).toBe('missing-base-metric');
	});

	it('fails a relative budget when the head metric is missing', () => {
		const result = evaluateBudget(
			{
				comparator: 'delta-bytes-lte',
				description: 'bytes',
				metric: 'initJsonBytes',
				threshold: 100,
			},
			undefined,
			metric('initJsonBytes', 1)
		);
		expect(result.pass).toBe(false);
		expect(result.status).toBe('missing-head-metric');
	});

	it('does not treat a zero base median as a 0% change', () => {
		const result = evaluateBudget(
			{
				comparator: 'percent-lte',
				description: 'long tasks',
				metric: 'longTaskTotalMs',
				threshold: 25,
			},
			metric('longTaskTotalMs', 12),
			metric('longTaskTotalMs', 0)
		);
		expect(result.pass).toBe(false);
		expect(result.actual).toBeNull();
	});

	it('passes a zero-to-zero percent comparison', () => {
		const result = evaluateBudget(
			{
				comparator: 'percent-lte',
				description: 'long tasks',
				metric: 'longTaskTotalMs',
				threshold: 25,
			},
			metric('longTaskTotalMs', 0),
			metric('longTaskTotalMs', 0)
		);
		expect(result.pass).toBe(true);
		expect(result.actual).toBe(0);
	});

	it('evaluates absolute-lte against the head median only', () => {
		const budget = {
			comparator: 'absolute-lte' as const,
			description: 'cookie',
			metric: 'choiceCookieBytes',
			threshold: 320,
		};
		expect(evaluateBudget(budget, metric('choiceCookieBytes', 186)).pass).toBe(
			true
		);
		expect(evaluateBudget(budget, metric('choiceCookieBytes', 321)).pass).toBe(
			false
		);
	});

	it('applies both the absolute and percent limits', () => {
		const budget = {
			comparator: 'absolute-and-percent-lte' as const,
			description: 'banner',
			metric: 'bannerReadyMs',
			secondaryThreshold: 15,
			threshold: 25,
		};
		expect(
			evaluateBudget(
				budget,
				metric('bannerReadyMs', 60),
				metric('bannerReadyMs', 40)
			).pass
		).toBe(false);
		expect(
			evaluateBudget(
				budget,
				metric('bannerReadyMs', 44),
				metric('bannerReadyMs', 40)
			).pass
		).toBe(true);
	});

	it('treats a base of zero as a regression for absolute-and-percent when head grows', () => {
		const budget = {
			comparator: 'absolute-and-percent-lte' as const,
			description: 'growth',
			metric: 'hydrateUs',
			secondaryThreshold: 50,
			threshold: 150,
		};
		expect(
			evaluateBudget(budget, metric('hydrateUs', 10), metric('hydrateUs', 0))
				.pass
		).toBe(false);
	});
});

describe('hasFailingBudgets', () => {
	const comparison = (
		budgets: BenchmarkComparisonResult['results'][number]['budgets']
	): BenchmarkComparisonResult => ({
		generatedAt: 'now',
		results: [
			{
				budgets,
				framework: 'core',
				key: 'k',
				metrics: [],
				notes: [],
				package: 'p',
				scenario: 's',
				suite: 'core-runtime',
			},
		],
		schemaVersion: 1,
	});

	it('only counts evaluated failures', () => {
		expect(
			hasFailingBudgets(
				comparison([
					{
						actual: null,
						comparator: 'percent-lte',
						message: 'unevaluated',
						metric: 'm',
						pass: false,
						status: 'unevaluated-arm',
						threshold: 0,
					},
				])
			)
		).toBe(false);
		expect(
			hasFailingBudgets(
				comparison([
					{
						actual: 5,
						comparator: 'percent-lte',
						message: 'regressed',
						metric: 'm',
						pass: false,
						status: 'evaluated',
						threshold: 0,
					},
				])
			)
		).toBe(true);
	});
});
