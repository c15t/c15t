import { describe, expect, it } from 'vitest';

import { createBenchmarkPlan } from '../../../scripts/benchmark-plan';
import { expectedBenchmarkResults } from './expected-results';

describe('benchmark matrix coverage', () => {
	it.each(['bundle', 'quick', 'full'])(
		'covers every expected package in the %s profile exactly once',
		(mode) => {
			const plan = createBenchmarkPlan(mode);
			const expected = expectedBenchmarkResults.filter((entry) =>
				plan.suites.includes(entry.suite)
			);
			const packages = new Set(
				expected.map((entry) => entry.key.split(':')[0])
			);
			expect(new Set(plan.expectedPackages)).toEqual(packages);
			expect(plan.packages).toHaveLength(packages.size);
			for (const name of plan.packages) {
				const shard = createBenchmarkPlan(mode, name);
				expect(shard.packages).toEqual([name]);
				expect(shard.suites).toEqual(plan.suites);
				expect(shard.expectedPackages).toHaveLength(1);
				expect(
					expected.some((entry) =>
						entry.key.startsWith(`${shard.expectedPackages[0]}:`)
					)
				).toBe(true);
			}
		}
	);
});
