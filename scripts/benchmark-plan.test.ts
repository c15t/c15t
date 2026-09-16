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

	it.each([
		['quick', 2],
		['full', 8],
	])('emits %s matrix jobs with unique artifact names', (mode, count) => {
		const output = execFileSync(
			'bun',
			[new URL('./benchmark-plan.ts', import.meta.url).pathname, String(mode)],
			{ encoding: 'utf8' }
		);
		const expected = createBenchmarkPlan(String(mode)).packages.map((name) => ({
			id: name.replace('@c15t/', ''),
			package: name,
		}));
		expect(JSON.parse(output)).toEqual({ include: expected });
		expect(new Set(expected.map((entry) => entry.id)).size).toBe(count);
	});
});
