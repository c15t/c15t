/**
 * The Kotlin cold bootstrap row is the one row on axis 1 that spent its whole life
 * reporting a reason instead of a number. These cases hold both halves of that: the
 * number when the bench prints one, and a reason rather than a zero when it does not.
 */

import { describe, expect, it } from 'vitest';

import { loadBudgets } from '../budgets';
import { parseKotlinBench } from '../measure/native';
import type { NativeBenchResult } from '../measure/native';
import { nativeRows } from '../measure/native-rows';
import { ROWS } from '../rows';
import type { MobileBenchRow } from '../types';

const { budgets } = loadBudgets();

/** Swift output is irrelevant here; the rows are read one key at a time. */
const NO_SWIFT = {
	metrics: {},
	notes: [],
	platform: 'swift-core' as const,
	stdout: '',
	unavailable: 'no Swift toolchain in this test',
};

/** The same composition the runner does: the bench's stdout through the parser. */
const kotlinRun = function kotlinRun(
	stdout: string,
	unavailable?: string
): NativeBenchResult {
	const result: NativeBenchResult = {
		metrics: parseKotlinBench(stdout),
		notes: [],
		platform: 'kotlin-core',
		stdout,
	};

	if (unavailable !== undefined) {
		result.unavailable = unavailable;
	}

	return result;
};

const COLD_OUTPUT = `c15t-core benchmarks
  warmup=500 measured=3000  medians in microseconds

  bootstrap() to first snapshot(), cold
    n=15  median=4964.17 us  p95=5698.75 us  min=4787.04 us  (median of 15 fresh JVMs, one bootstrap each; envelope is 9053 bytes; contract budget is 15 ms)
    ok
`;

const WITHOUT_COLD = `c15t-core benchmarks
  warmup=500 measured=3000  medians in microseconds

  bootstrap() to first snapshot(), cold (not measured)
    none of the 15 forked JVMs produced a cold sample
`;

const rowFor = function rowFor(
	stdout: string,
	unavailable?: string
): MobileBenchRow {
	const rows = nativeRows(NO_SWIFT, kotlinRun(stdout, unavailable), budgets);
	const row = rows.find((entry) => entry.id === ROWS.kotlinBootstrapCold.id);

	if (!row) {
		throw new Error('the Kotlin cold bootstrap row is missing from the report');
	}

	return row;
};

describe('the Kotlin cold bootstrap row', () => {
	it('reports the measured span in milliseconds against the contract ceiling', () => {
		const row = rowFor(COLD_OUTPUT);

		expect(row.status).toBe('measured');
		// The bench's microseconds, converted and rounded the way every ms row rounds.
		expect(row.value).toBe(4.964);
		expect(row.unit).toBe('ms');
		expect(row.budget).toBe(15);
		expect(row.budgetSource).toBe('contract');
		expect(row.samples).toBe(15);
		expect(row.detail).toContain('9053');
	});

	it('stays not-measured when the bench ran but printed no cold sample', () => {
		const row = rowFor(WITHOUT_COLD);

		expect(row.status).toBe('not-measured');
		expect(row.value).toBeNull();
		expect(row.reason).toContain('native_bootstrap_cold_us');
	});

	it('carries the platform reason when the bench could not run at all', () => {
		const row = rowFor('', ':c15t-core:bench exited non-zero');

		expect(row.status).toBe('not-measured');
		expect(row.value).toBeNull();
		expect(row.reason).toBe(':c15t-core:bench exited non-zero');
	});
});
