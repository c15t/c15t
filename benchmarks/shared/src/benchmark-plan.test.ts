import { describe, expect, it } from 'vitest';

import {
	createBenchmarkPlan,
	createBenchmarkShards,
} from '../../../scripts/benchmark-plan';
import { expectedBenchmarkResults } from './expected-results';
import { isBenchSelected } from './selection';

describe('benchmark matrix coverage', () => {
	it.each(['bundle', 'quick', 'full'])(
		'measures every expected result in the %s profile on exactly one runner',
		(mode) => {
			const plan = createBenchmarkPlan(mode);
			const expected = expectedBenchmarkResults.filter((entry) =>
				plan.suites.includes(entry.suite)
			);
			expect(new Set(plan.expectedPackages)).toEqual(
				new Set(expected.map((entry) => entry.key.split(':')[0]))
			);
			const runners = createBenchmarkShards(plan.packages).map((shard) =>
				createBenchmarkPlan(mode, shard.id)
			);
			const measures = (
				runner: (typeof runners)[number],
				entry: (typeof expected)[number]
			) =>
				runner.expectedPackages.some((name) =>
					entry.key.startsWith(`${name}:`)
				) && isBenchSelected(runner, entry.suite, entry.scenario);
			for (const entry of expected) {
				expect(
					runners.filter((runner) => measures(runner, entry)),
					entry.key
				).toHaveLength(1);
			}
			for (const runner of runners) {
				expect(runner.packages).toHaveLength(1);
				expect(runner.suites).toEqual(plan.suites);
				expect(expected.some((entry) => measures(runner, entry))).toBe(true);
			}
		}
	);
});
