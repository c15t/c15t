/**
 * Which suites and scenarios one benchmark run measures.
 *
 * CI splits a slow package across runners, and each runner measures base and
 * head for its share only. Runners read the share from {@link BENCH_ONLY_ENV}
 * and {@link BENCH_SKIP_ENV}; the comparison gate reads the same variables, so
 * it expects exactly the results the runner was asked to measure.
 *
 * Both variables hold comma lists of `suite` or `suite:scenario` items.
 */

/** Measure only matching items. Unset or empty measures everything. */
export const BENCH_ONLY_ENV = 'C15T_BENCH_ONLY';

/** Never measure matching items, even when {@link BENCH_ONLY_ENV} names them. */
export const BENCH_SKIP_ENV = 'C15T_BENCH_SKIP';

export interface BenchSelection {
	only: string[];
	skip: string[];
}

const parseList = function parseList(value: string | undefined): string[] {
	return (value ?? '')
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
};

/**
 * Read the selection a benchmark runner was started with.
 *
 * @param env - Process environment.
 * @returns Items from {@link BENCH_ONLY_ENV} and {@link BENCH_SKIP_ENV}.
 */
export const benchSelectionFromEnv = function benchSelectionFromEnv(
	env: Readonly<Record<string, string | undefined>>
): BenchSelection {
	return {
		only: parseList(env[BENCH_ONLY_ENV]),
		skip: parseList(env[BENCH_SKIP_ENV]),
	};
};

/**
 * Whether a selection includes one scenario of a suite.
 *
 * @param selection - Items to measure and to skip.
 * @param suite - Suite the scenario belongs to.
 * @param scenario - Scenario name as written in result keys.
 * @returns `true` when the run should measure, and the gate should expect,
 * this scenario.
 * @example
 * ```ts
 * const selection = { only: ['policy-runtime'], skip: ['policy-runtime:optin-choice-eu'] };
 * isBenchSelected(selection, 'policy-runtime', 'optout-california'); // true
 * isBenchSelected(selection, 'policy-runtime', 'optin-choice-eu'); // false
 * isBenchSelected(selection, 'core-runtime', 'tiny'); // false
 * ```
 */
export const isBenchSelected = function isBenchSelected(
	selection: BenchSelection,
	suite: string,
	scenario: string
): boolean {
	const matches = (item: string) =>
		item === suite || item === `${suite}:${scenario}`;
	if (selection.skip.some(matches)) {
		return false;
	}
	return selection.only.length === 0 || selection.only.some(matches);
};
