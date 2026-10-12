import { describe, expect, it } from 'vitest';

import {
	EXAMPLES_PAYLOAD_PACKAGE,
	examplesPayloadBudgetsFor,
	examplesPayloadExamples,
} from './examples-payload';
import { expectedBenchmarkResults } from './expected-results';
import { evaluateBudget } from './reporting';
import type { MetricSampleSet } from './schema';

const metric = function metric(name: string, value: number): MetricSampleSet {
	return {
		avg: value,
		median: value,
		name,
		p95: value,
		samples: [value],
		unit: 'bytes',
	};
};

const evaluate = function evaluate(
	kind: 'server' | 'spa',
	name: string,
	head: number,
	base?: number
) {
	const budget = examplesPayloadBudgetsFor(kind).find(
		(entry) => entry.metric === name
	);
	if (!budget) {
		return null;
	}
	return evaluateBudget(
		budget,
		metric(name, head),
		base === undefined ? undefined : metric(name, base)
	).pass;
};

describe('examples payload gate rules', () => {
	it('allows no first-load JS growth, not even one byte', () => {
		expect(evaluate('spa', 'initialJsGzip', 1000, 1000)).toBe(true);
		expect(evaluate('spa', 'initialJsGzip', 999, 1000)).toBe(true);
		expect(evaluate('spa', 'initialJsGzip', 1001, 1000)).toBe(false);
		expect(evaluate('server', 'initialJsBrotli', 1001, 1000)).toBe(false);
	});

	it('fails a first-load comparison without a base result', () => {
		expect(evaluate('server', 'initialJsGzip', 1000)).toBe(false);
	});

	it('allows no new cross-origin requests on a first visit', () => {
		expect(evaluate('spa', 'crossOriginRequests', 2, 2)).toBe(true);
		expect(evaluate('spa', 'crossOriginRequests', 3, 2)).toBe(false);
	});

	it('keeps the snapshot, resolver and manifest fetch out of server-framework first loads', () => {
		for (const name of ['snapshotBytes', 'resolverBytes', 'manifestRequests']) {
			expect(evaluate('server', name, 0)).toBe(true);
			expect(evaluate('server', name, 1)).toBe(false);
		}
	});

	it('lets single-page apps carry the resolver and snapshot', () => {
		expect(evaluate('spa', 'snapshotBytes', 5000)).toBeNull();
		expect(evaluate('spa', 'resolverBytes', 5000)).toBeNull();
		expect(evaluate('spa', 'manifestRequests', 1)).toBeNull();
	});

	it('keeps offline policy data and other languages out of every first load', () => {
		for (const kind of ['server', 'spa'] as const) {
			for (const name of ['offlinePolicyBytes', 'nonEnLocaleBytes']) {
				expect(evaluate(kind, name, 0)).toBe(true);
				expect(evaluate(kind, name, 1)).toBe(false);
			}
		}
	});

	it('expects one result per example with its kind budgets', () => {
		const expected = expectedBenchmarkResults.filter(
			(entry) => entry.suite === 'examples-payload'
		);
		expect(expected.map((entry) => entry.key)).toEqual(
			examplesPayloadExamples.map(
				(example) =>
					`${EXAMPLES_PAYLOAD_PACKAGE}:${example.name}:examples-payload`
			)
		);
		expect(expected).toHaveLength(13);
	});
});
