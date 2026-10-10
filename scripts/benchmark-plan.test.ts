import { execFileSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

import { createBenchmarkPlan } from './benchmark-plan';

describe('benchmark package selection', () => {
	it('builds the Nuxt benchmark and checks the Vue results it produces', () => {
		expect(
			createBenchmarkPlan('full', '@c15t/nuxt-browser-bench')
		).toMatchObject({
			expectedPackages: ['@c15t/vue'],
			packages: ['@c15t/nuxt-browser-bench'],
		});
	});
	it.each(['', 'unknown', 'toString'])(
		'rejects invalid mode %j before starting measurements',
		(mode) => {
			expect(() => createBenchmarkPlan(mode)).toThrow('Unknown benchmark mode');
		}
	);

	it.each(['', '@c15t/unknown', '@c15t/react-browser-bench'])(
		'rejects package %j outside the quick profile',
		(name) => {
			expect(() => createBenchmarkPlan('quick', name)).toThrow(
				'Unknown benchmark package'
			);
		}
	);

	it('selects one core-benchmarks shard by its matrix id', () => {
		expect(createBenchmarkPlan('quick', 'core-benchmarks-california')).toEqual({
			expectedPackages: ['@c15t/core-benchmarks'],
			only: ['policy-runtime:optout-california'],
			packages: ['@c15t/core-benchmarks'],
			skip: [],
			suites: ['core-runtime', 'policy-runtime', 'script-lifecycle'],
		});
	});

	it.each([
		['quick', 4],
		['full', 10],
	])('emits %s matrix jobs with unique artifact names', (mode, count) => {
		const output = execFileSync(
			'bun',
			[new URL('./benchmark-plan.ts', import.meta.url).pathname, String(mode)],
			{ encoding: 'utf8' }
		);
		const { include } = JSON.parse(output) as {
			include: { id: string; package: string }[];
		};
		expect(include).toHaveLength(count);
		expect(new Set(include.map((entry) => entry.id)).size).toBe(count);
		for (const entry of include) {
			expect(createBenchmarkPlan(String(mode), entry.id).packages).toEqual([
				entry.package,
			]);
		}
	});
});
