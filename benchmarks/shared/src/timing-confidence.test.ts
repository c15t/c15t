import { describe, expect, it } from 'vitest';

import { browserBudgets } from './budgets';
import { evaluateBudget } from './reporting';
import { evaluateBrowserTimingBudget } from './timing-confidence';
import { summarizeMetric } from './utils';

const interactionBudget = browserBudgets.find(
	(entry) => entry.metric === 'interactionLatencyMs'
);
if (!interactionBudget) {
	throw new Error('Missing interaction latency budget');
}
const budget = interactionBudget;
const metric = (samples: number[]) =>
	summarizeMetric(budget.metric, 'ms', samples);

describe('browser timing confidence', () => {
	it('does not gate the unchanged Nuxt baseline from run 38438348883 attempt 2', () => {
		const base = metric([
			40.651, 27.509, 13.424, 15.962, 23.846, 13.166, 32.594, 9.183, 15.1,
			12.229, 16.582, 23.929, 18.017, 14.387, 15.214, 15.764, 32.971, 23.462,
			19.933, 13.503, 15.378, 10.471, 18.876, 15.18, 16.072, 17.562, 15.648,
			19.479, 19.608, 22.059,
		]);
		const head = metric([
			30.557, 28.262, 20.398, 16.46, 15.788, 24.744, 12.218, 12.881, 11.862,
			24.533, 17.224, 15.148, 15.786, 27.603, 12.607, 27.73, 16.811, 29.292,
			13.204, 13.92, 21.789, 21.388, 22.12, 21.308, 18.182, 21.127, 19.985,
			19.997, 20.843, 22.061,
		]);
		expect(evaluateBudget(budget, head, base).pass).toBe(false);
		const result = evaluateBrowserTimingBudget(budget, head, base);
		expect(result.pass).toBe(true);
		expect(result.actual).toBe(evaluateBudget(budget, head, base).actual);
		expect(result.message).toContain('not a confirmed budget breach');
	});

	it.each([8, 30, 5000])(
		'still rejects a consistent regression with %i samples',
		(count) => {
			const result = evaluateBrowserTimingBudget(
				budget,
				metric(Array<number>(count).fill(30)),
				metric(Array<number>(count).fill(20))
			);
			expect(result.pass).toBe(false);
			expect(result.message).toContain('confirmed budget breach');
		}
	);

	it('preserves the percentage limit even below the absolute allowance', () => {
		expect(
			evaluateBrowserTimingBudget(
				budget,
				metric(Array<number>(30).fill(25)),
				metric(Array<number>(30).fill(20))
			).pass
		).toBe(false);
	});

	it('preserves the absolute limit even below the percentage allowance', () => {
		expect(
			evaluateBrowserTimingBudget(
				budget,
				metric(Array<number>(30).fill(525)),
				metric(Array<number>(30).fill(500))
			).pass
		).toBe(false);
	});

	it('does not excuse missing or insufficient evidence', () => {
		const head = metric(Array<number>(30).fill(30));
		expect(evaluateBrowserTimingBudget(budget, head, undefined).pass).toBe(
			false
		);
		expect(evaluateBrowserTimingBudget(budget, undefined, head).pass).toBe(
			false
		);
		for (const samples of [
			[],
			[20],
			Array<number>(7).fill(20),
			[Number.NaN, ...Array<number>(29).fill(20)],
		]) {
			const base = { ...metric(Array<number>(30).fill(20)), samples };
			expect(evaluateBrowserTimingBudget(budget, head, base).pass).toBe(false);
		}
	});

	it.each([
		'percent-lte',
		'absolute-and-percent-lte',
		'absolute-or-percent-lte',
	] as const)(
		'preserves an unbounded %s regression from a zero baseline',
		(comparator) => {
			const limit = {
				...budget,
				comparator,
				metric: 'longTaskTotalMs',
				threshold: 25,
			};
			const head = summarizeMetric(limit.metric, 'ms', [
				...Array<number>(8).fill(0),
				...Array<number>(22).fill(50),
			]);
			const base = summarizeMetric(
				limit.metric,
				'ms',
				Array<number>(30).fill(0)
			);
			const observed = evaluateBudget(limit, head, base);
			expect(observed.pass).toBe(false);
			expect(evaluateBrowserTimingBudget(limit, head, base)).toEqual(observed);
		}
	);

	it('never softens request-count or absolute behavior invariants', () => {
		for (const comparator of ['count-eq', 'absolute-lte'] as const) {
			expect(
				evaluateBrowserTimingBudget(
					{ ...budget, comparator, threshold: 0 },
					metric(Array<number>(30).fill(1)),
					metric(Array<number>(30).fill(0))
				).pass
			).toBe(false);
		}
	});
});
