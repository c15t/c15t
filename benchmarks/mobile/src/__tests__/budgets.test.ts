/**
 * The budget file is the whole gate, so these cases guard the file itself and the
 * wiring between it and the row list. A row whose budget key points at nothing is
 * a row that silently stops being gated, which is the failure mode worth a test.
 */

import { describe, expect, it } from 'vitest';

import { loadBudgets } from '../budgets';
import { ROWS } from '../rows';

const file = loadBudgets();

describe('budgets.json', () => {
	it('names the contract it takes ceilings from', () => {
		expect(file.contract).toBe('native/CONTRACT.md');
	});

	it('gives every budget a finite max, a known unit, a source, and a note', () => {
		for (const [key, budget] of Object.entries(file.budgets)) {
			expect(Number.isFinite(budget.max), `${key} max`).toBe(true);
			expect(['ms', 'us', 'bytes', 'count', 'percent']).toContain(budget.unit);
			expect(['contract', 'allowance']).toContain(budget.source);
			expect(budget.note.length, `${key} note`).toBeGreaterThan(10);
		}
	});

	it('explains where every allowance came from, since none quotes the contract', () => {
		const allowances = Object.entries(file.budgets).filter(
			([, budget]) => budget.source === 'allowance'
		);
		expect(allowances.length).toBeGreaterThan(0);

		for (const [key, budget] of allowances) {
			// An allowance is this harness's own promise, so the note has to say what
			// the number guards rather than just restate it.
			expect(
				budget.note.length,
				`${key} needs a justification`
			).toBeGreaterThan(40);
			expect(budget.note, `${key} must not claim the contract`).not.toMatch(
				/CONTRACT\.md states/iu
			);
		}
	});

	it('carries a sampling plan with room for warmup', () => {
		expect(file.sampling.warmupIterations).toBeGreaterThan(0);
		expect(file.sampling.measuredIterations).toBeGreaterThan(0);
		expect(file.sampling.idleWindowMs).toBeGreaterThanOrEqual(30_000);
		expect(file.sampling.subsequentRunDiffTolerancePercent).toBeGreaterThan(0);
	});
});

describe('rows against budgets', () => {
	it('points every row at a budget that exists, or at none on purpose', () => {
		for (const [name, spec] of Object.entries(ROWS)) {
			if (spec.budgetKey === null) {
				continue;
			}
			expect(file.budgets[spec.budgetKey], `${name} budgetKey`).toBeDefined();
		}
	});

	it('leaves no budget unreferenced, because an orphan is a ceiling nobody enforces', () => {
		const referenced = new Set(
			Object.values(ROWS)
				.map((spec) => spec.budgetKey)
				.filter((key): key is string => key !== null)
		);
		for (const key of Object.keys(file.budgets)) {
			expect(
				referenced.has(key),
				`${key} is in budgets.json but no row reads it`
			).toBe(true);
		}
	});

	it('gates each contract statement with at least one row', () => {
		const contractKeys = Object.entries(file.budgets)
			.filter(([, budget]) => budget.source === 'contract')
			.map(([key]) => key);

		const gated = new Set(
			Object.values(ROWS)
				.map((spec) => spec.budgetKey)
				.filter((key): key is string => key !== null)
		);

		for (const key of contractKeys) {
			expect(gated.has(key), `${key} has no row`).toBe(true);
		}
	});

	it('covers every surface the report groups by', () => {
		expect(
			new Set(Object.values(ROWS).map((spec) => spec.surface)).size
		).toBeGreaterThanOrEqual(4);
	});
});
