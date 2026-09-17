/**
 * Issue #1010 asks for seven axes, and a harness can stop covering one without
 * anyone deleting anything: a row renamed, a budget key dropped, a measurement that
 * quietly returns `not-measured` forever. These cases hold the mapping.
 */

import { describe, expect, it } from 'vitest';

import { MOBILE_AXES } from '../axes';
import { loadBudgets } from '../budgets';
import { ROWS } from '../rows';

const file = loadBudgets();
const rowIds = new Set(Object.values(ROWS).map((spec) => spec.id));
const specById = new Map(Object.values(ROWS).map((spec) => [spec.id, spec]));

describe('the seven axes from issue #1010', () => {
	it('lists each of them exactly once, in the issue order', () => {
		expect(MOBILE_AXES.map((entry) => entry.axis)).toEqual([
			1, 2, 3, 4, 5, 6, 7,
		]);
	});

	it('gives every axis at least one row', () => {
		for (const entry of MOBILE_AXES) {
			expect(
				entry.rows.length,
				`axis ${entry.axis} has no row`
			).toBeGreaterThan(0);
		}
	});

	it('names rows that exist', () => {
		for (const entry of MOBILE_AXES) {
			for (const id of entry.rows) {
				expect(rowIds.has(id), `axis ${entry.axis} names ${id}`).toBe(true);
			}
		}
	});

	it('covers every axis with a gated row, since a budget must sit behind it', () => {
		for (const entry of MOBILE_AXES) {
			const gated = entry.rows.filter((id) => {
				const key = specById.get(id)?.budgetKey;
				return (
					key !== null && key !== undefined && file.budgets[key] !== undefined
				);
			});

			expect(
				gated.length,
				`axis ${entry.axis} has no budgeted row`
			).toBeGreaterThan(0);
		}
	});

	it('never claims an axis is covered by a row with no budget key at all', () => {
		// A row with `budgetKey: null` reports a number and gates nothing. It may sit
		// beside an axis for context, but it cannot be what the axis rests on.
		for (const entry of MOBILE_AXES) {
			for (const id of entry.rows) {
				expect(
					specById.get(id)?.budgetKey,
					`${id} is listed under axis ${entry.axis} and gates nothing`
				).not.toBeNull();
			}
		}
	});
});

describe('coverage notes', () => {
	it('says which axis rows did not produce a number this run', async () => {
		const { coverageNotes } = await import('../axes');
		const notes = coverageNotes([
			{ id: ROWS.uiMount.id, status: 'measured' },
			{ id: ROWS.uiRemount.id, status: 'not-measured' },
		]);
		const axis3 = notes.find((note) => note.startsWith('axis 3/7'));

		expect(axis3).toContain(ROWS.uiMount.id);
		expect(axis3).toContain('not measured this run');
		expect(axis3).toContain(ROWS.uiRemount.id);
	});

	it('says NOT COVERED rather than printing an empty list', async () => {
		const { coverageNotes } = await import('../axes');
		const notes = coverageNotes([]);

		expect(notes.filter((note) => note.includes('NOT COVERED')).length).toBe(7);
	});
});
