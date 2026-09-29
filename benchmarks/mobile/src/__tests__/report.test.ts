/**
 * The gate arithmetic. These cases exist because a check script is easy to write
 * in a way that passes: a table that shrinks, a not-measured row read as a zero,
 * or an empty run that looks green.
 */

import { describe, expect, it } from 'vitest';

import { buildCheck, diffRows, formatValue, verdict } from '../report';
import { makeRow } from '../rows';
import type { Outcome, RowSpec } from '../rows';
import type { MobileBenchRow, MobileBudget } from '../types';

const budget = (
	max: number,
	unit: MobileBudget['unit'] = 'ms'
): MobileBudget => ({
	max,
	note: 'test ceiling',
	source: 'contract',
	unit,
});

const spec = (id: string, unit: MobileBudget['unit'] = 'ms'): RowSpec => ({
	budgetKey: id,
	id,
	label: id,
	surface: 'react-native-js',
	unit,
});

const row = (id: string, outcome: Outcome, max = 5): MobileBenchRow =>
	makeRow(spec(id), { [id]: budget(max) }, outcome);

describe('verdict', () => {
	it('passes a value at the ceiling, since the budget is a ceiling', () => {
		expect(verdict(row('a', { samples: 10, value: 5 }))).toBe('pass');
	});

	it('fails a value above the ceiling', () => {
		expect(verdict(row('a', { samples: 10, value: 5.001 }))).toBe('FAIL');
	});

	it('reports no-budget for a measured row the contract sets no number for', () => {
		const reportOnly = makeRow(
			{ ...spec('a'), budgetKey: null },
			{},
			{ samples: 1, value: 999 }
		);
		expect(verdict(reportOnly)).toBe('no-budget');
	});
});

describe('buildCheck', () => {
	it('fails when a measured row is over its ceiling', () => {
		const check = buildCheck([row('a', { samples: 10, value: 90 })], true);
		expect(check.ok).toBe(false);
		expect(check.failed[0]).toContain('a');
	});

	it('passes an all-green run', () => {
		expect(buildCheck([row('a', { samples: 10, value: 1 })], true).ok).toBe(
			true
		);
	});

	it('does not fail on a not-measured row, because machines lack simulators', () => {
		const check = buildCheck(
			[
				row('a', { samples: 10, value: 1 }),
				row('b', { reason: 'no simulator' }),
			],
			true
		);
		expect(check.ok).toBe(true);
		expect(check.unmeasured[0]).toContain('no simulator');
	});

	it('fails a run where nothing was measured, so an empty table is never green', () => {
		const check = buildCheck([row('b', { reason: 'no simulator' })], true);
		expect(check.ok).toBe(false);
		expect(check.failed.join(',')).toContain('nothing to certify');
	});

	it('names the over-budget rows in report mode but still exits zero', () => {
		const check = buildCheck([row('a', { samples: 10, value: 90 })], false);
		expect(check.enforced).toBe(false);
		expect(check.failed).toHaveLength(1);
		expect(check.ok).toBe(true);
	});
});

describe('diffRows', () => {
	it('flags growth past the tolerance and leaves small growth alone', () => {
		const previous = [row('a', { samples: 10, value: 10 })];
		const rows = diffRows([row('a', { samples: 10, value: 20 })], previous, 25);
		expect(rows[0]?.flagged).toBe(true);
		expect(rows[0]?.deltaPercent).toBe(100);

		const small = diffRows(
			[row('a', { samples: 10, value: 11 })],
			previous,
			25
		);
		expect(small[0]?.flagged).toBe(false);
	});

	it('skips rows with no comparable previous number instead of inventing one', () => {
		const rows = diffRows(
			[row('new', { samples: 10, value: 5 }), row('gone', { reason: 'x' })],
			[row('new', { reason: 'x' })],
			25
		);
		expect(rows).toEqual([]);
	});

	it('orders the worst growth first', () => {
		const previous = [
			row('small', { samples: 10, value: 10 }),
			row('big', { samples: 10, value: 10 }),
		];
		const rows = diffRows(
			[
				row('small', { samples: 10, value: 12 }),
				row('big', { samples: 10, value: 90 }),
			],
			previous,
			25
		);
		expect(rows[0]?.id).toBe('big');
	});
});

describe('formatValue', () => {
	it('prints a dash for a row with no number', () => {
		expect(formatValue(null, 'ms')).toBe('-');
	});

	it('groups bytes and keeps three places for durations', () => {
		expect(formatValue(55694, 'bytes')).toBe('55,694 B');
		expect(formatValue(0.161234, 'ms')).toBe('0.161 ms');
		expect(formatValue(3, 'count')).toBe('3');
	});
});
