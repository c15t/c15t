import { describe, expect, it } from 'vitest';

import { benchSelectionFromEnv, isBenchSelected } from './selection';

describe('benchmark selection', () => {
	it('selects everything when neither variable is set', () => {
		const selection = benchSelectionFromEnv({});
		expect(isBenchSelected(selection, 'core-runtime', 'tiny')).toBe(true);
	});

	it('matches whole suites and single scenarios', () => {
		const selection = benchSelectionFromEnv({
			C15T_BENCH_ONLY: 'core-runtime, policy-runtime:optin-choice-eu',
		});
		expect(isBenchSelected(selection, 'core-runtime', 'xlarge')).toBe(true);
		expect(
			isBenchSelected(selection, 'policy-runtime', 'optin-choice-eu')
		).toBe(true);
		expect(
			isBenchSelected(selection, 'policy-runtime', 'optout-california')
		).toBe(false);
	});

	it('lets a skip win over an only that names the same suite', () => {
		const selection = benchSelectionFromEnv({
			C15T_BENCH_ONLY: 'policy-runtime',
			C15T_BENCH_SKIP: 'policy-runtime:optin-choice-eu',
		});
		expect(
			isBenchSelected(selection, 'policy-runtime', 'optin-choice-eu')
		).toBe(false);
		expect(isBenchSelected(selection, 'policy-runtime', 'a-new-fixture')).toBe(
			true
		);
	});

	it('does not treat a scenario prefix as a match', () => {
		const selection = benchSelectionFromEnv({
			C15T_BENCH_ONLY: 'policy-runtime:optout',
		});
		expect(
			isBenchSelected(selection, 'policy-runtime', 'optout-california')
		).toBe(false);
	});
});
