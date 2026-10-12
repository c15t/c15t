/**
 * The one place budgets are read. Everything else takes a value from here, so
 * changing a ceiling means editing `budgets.json` and nothing else.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { MobileBudget, MobileSampling } from './types';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Absolute path of the editable budget file. */
export const BUDGET_FILE = resolve(HERE, '..', 'budgets.json');

interface BudgetFile {
	contract: string;
	sampling: MobileSampling;
	budgets: Record<string, MobileBudget>;
}

const UNITS = new Set(['ms', 'us', 'bytes', 'count', 'percent']);
const SOURCES = new Set(['contract', 'allowance']);

/**
 * Fail loudly on a malformed budget file. A silently ignored typo would turn a
 * budget into no budget, which is the one thing a gate must not do.
 *
 * @param raw - Parsed JSON.
 * @returns The validated file.
 * @throws {Error} When a budget is missing a field or carries a bad value.
 */
const validate = function validate(raw: unknown): BudgetFile {
	const file = raw as Partial<BudgetFile>;

	if (typeof file.contract !== 'string' || file.contract.length === 0) {
		throw new Error(`${BUDGET_FILE}: missing "contract"`);
	}

	if (!file.budgets || typeof file.budgets !== 'object') {
		throw new Error(`${BUDGET_FILE}: missing "budgets"`);
	}

	for (const [key, budget] of Object.entries(file.budgets)) {
		if (typeof budget?.max !== 'number' || !Number.isFinite(budget.max)) {
			throw new Error(`${BUDGET_FILE}: budget "${key}" needs a finite "max"`);
		}
		if (!UNITS.has(budget.unit)) {
			throw new Error(
				`${BUDGET_FILE}: budget "${key}" has unknown unit "${budget.unit}"`
			);
		}
		if (!SOURCES.has(budget.source)) {
			throw new Error(
				`${BUDGET_FILE}: budget "${key}" has unknown source "${budget.source}"`
			);
		}
		if (typeof budget.note !== 'string' || budget.note.length === 0) {
			throw new Error(`${BUDGET_FILE}: budget "${key}" needs a "note"`);
		}
	}

	return file as BudgetFile;
};

/**
 * Read and validate `budgets.json`.
 *
 * @returns The contract path, the sampling plan, and every budget.
 */
export const loadBudgets = function loadBudgets(): BudgetFile {
	return validate(JSON.parse(readFileSync(BUDGET_FILE, 'utf8')) as unknown);
};

/**
 * Look up one budget.
 *
 * @param budgets - Loaded budget map.
 * @param id - Row id.
 * @returns The budget, or `undefined` when the row is report-only.
 */
export const budgetFor = function budgetFor(
	budgets: Record<string, MobileBudget>,
	id: string
): MobileBudget | undefined {
	return budgets[id];
};
