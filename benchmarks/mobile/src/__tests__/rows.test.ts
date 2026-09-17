/**
 * The row builder is where a number becomes a claim, so these cases guard the
 * formatting rather than the measurement.
 */

import { describe, expect, it } from 'vitest';

import { makeRow } from '../rows';
import type { MobileBudget, MobileSurface, MobileUnit } from '../types';

const budget: MobileBudget = {
	max: 50,
	note: 'a ceiling written down for the sake of the test',
	source: 'contract',
	unit: 'ms',
};

const budgets: Record<string, MobileBudget> = { span_ms: budget };

const spec = (
	unit: MobileUnit,
	surface: MobileSurface = 'react-native-js'
) => ({
	budgetKey: 'span_ms',
	id: 'span',
	label: 'a span',
	surface,
	unit,
});

describe('makeRow', () => {
	it('carries the ceiling and its source onto the row', () => {
		const row = makeRow(spec('ms'), budgets, { samples: 3, value: 12.3456 });

		expect(row.budget).toBe(50);
		expect(row.budgetSource).toBe('contract');
		expect(row.value).toBe(12.346);
		expect(row.status).toBe('measured');
	});

	it('keeps a row that produced nothing in the table, with its reason', () => {
		const row = makeRow(spec('ms'), budgets, { reason: 'no toolchain here' });

		expect(row.value).toBeNull();
		expect(row.status).toBe('not-measured');
		expect(row.reason).toBe('no toolchain here');
	});

	it('refuses to build a row that is neither measured nor explained', () => {
		expect(() => makeRow(spec('ms'), budgets, {})).toThrow(
			/no value and no reason/u
		);
	});

	it('does not report a sub-precision span as zero', () => {
		// 0.21 us of a disk commit crosses the millisecond row's third decimal. A bare
		// `0` would read as "the write cost nothing", and the next run's diff would
		// score it as a complete win over the previous 1.445 ms.
		const row = makeRow(spec('ms'), budgets, {
			detail: 'bench envelope 1936 B',
			samples: 200,
			value: 0.00021,
		});

		expect(row.value).toBe(0.00021);
		expect(row.value).not.toBe(0);
		expect(row.detail).toContain('four significant figures');
		expect(row.detail).toContain('bench envelope 1936 B');
	});

	it('leaves a true zero at zero, and an ordinary value at three decimals', () => {
		expect(makeRow(spec('count'), budgets, { value: 0 }).value).toBe(0);
		expect(
			makeRow(spec('count'), budgets, { value: 0 }).detail
		).toBeUndefined();
		expect(makeRow(spec('bytes'), budgets, { value: 823027 }).value).toBe(
			823027
		);
	});
});
