/**
 * The per-category list a consent surface renders.
 *
 * One derivation serves the dialog and the preference centre, because the two
 * show the same thing: the categories the policy put in scope, each switched to
 * the subject's own receipt when they have one and to the effective permission
 * when they do not. The native core decided both of those; this file only turns
 * them into rows and holds the switches until the subject saves.
 */

import { useCallback, useState } from 'react';

import type { ConsentSnapshot } from '../../protocol';
import type {
	AllConsentNames,
	OptionalConsentCategory,
} from '../../protocol/vocabulary';
import { OPTIONAL_CONSENT_CATEGORIES } from '../../protocol/vocabulary';
import { resolveConsentCopy } from './copy';

/** One row in a category list. */
export interface ConsentCategoryRow {
	/** Whether the row may be switched off. */
	readonly disabled: boolean;
	/** What the category covers, in the subject's language. */
	readonly description: string;
	/** Category this row decides. */
	readonly key: AllConsentNames;
	/** Category name, in the subject's language. */
	readonly label: string;
	/** Position of the switch. */
	readonly value: boolean;
}

/** Order the rows are listed in: necessary first, then the decidable ones. */
const ROW_ORDER: readonly AllConsentNames[] = [
	'necessary',
	...OPTIONAL_CONSENT_CATEGORIES,
];

/**
 * Which categories to list.
 *
 * The native core decides the list the surfaces render: `necessary`, then the
 * resolved policy scope narrowed by the app's declared scope, which is the same
 * set the web dialog derives from the policy. This function only puts those
 * names in display order and drops any the vocabulary does not know, because a
 * row it will not accept is a row that cannot be honoured. A snapshot from a
 * core with no configuration yet carries `null`, where the full vocabulary is
 * the safe reading: it is what the core itself falls back to before any policy
 * resolves.
 *
 * @param snapshot - Snapshot to read.
 * @returns Categories in display order.
 */
const scopeFor = function scopeFor(
	snapshot: ConsentSnapshot
): readonly AllConsentNames[] {
	const decided = snapshot.consentCategories;

	if (decided === null || decided.length === 0) {
		return ROW_ORDER;
	}

	return ROW_ORDER.filter((category) => decided.includes(category));
};

/**
 * Build the rows for one snapshot.
 *
 * A restricted category reads off and locked: the core has already decided that
 * no grant may apply, and a switch the subject is allowed to move but that
 * changes nothing is a lie about what the button does.
 *
 * @param snapshot - Snapshot to read.
 * @returns One row per category in scope, copy resolved.
 */
export const buildConsentCategoryRows = function buildConsentCategoryRows(
	snapshot: ConsentSnapshot
): readonly ConsentCategoryRow[] {
	const copy = resolveConsentCopy(snapshot.translations);

	return scopeFor(snapshot).map((key) => {
		const { description, title } = copy.categories[key];

		// Necessary is on by definition and is never a written decision, so it
		// settles before the receipts are read.
		if (key === 'necessary') {
			return { description, disabled: true, key, label: title, value: true };
		}

		const restrictions = snapshot.restrictions[key];
		const restricted = restrictions !== undefined && restrictions.length > 0;

		return {
			description,
			disabled: restricted,
			key,
			label: title,
			// Restricted means denied regardless of any grant, so the row reads
			// off. A locked switch showing "on" would tell the subject they have
			// allowed something the core has refused them, and a save would write
			// that allowance back.
			value: restricted
				? false
				: (snapshot.explicitChoice?.categories[key]?.value ??
					snapshot.effectivePermissions[key]),
		};
	});
};

/**
 * Whether two row lists render the same.
 *
 * The snapshot reparses on every native event, so identity is useless here and a
 * field compare is what keeps a subscriber quiet through a change it does not
 * display.
 *
 * @param current - Rows the subscriber rendered last.
 * @param next - Rows the subscriber would render now.
 * @returns `true` when every visible field matches.
 */
export const isConsentCategoryRowsEqual = function isConsentCategoryRowsEqual(
	current: readonly ConsentCategoryRow[],
	next: readonly ConsentCategoryRow[]
): boolean {
	if (current.length !== next.length) {
		return false;
	}

	return current.every((row, index) => {
		const other = next[index];

		return (
			other !== undefined &&
			row.disabled === other.disabled &&
			row.description === other.description &&
			row.key === other.key &&
			row.label === other.label &&
			row.value === other.value
		);
	});
};

/**
 * Select the rows out of a snapshot.
 *
 * Module scope, so the subscription behind it stays stable.
 *
 * @param snapshot - Snapshot to read.
 * @returns The rows to render.
 */
export const selectConsentCategoryRows = (
	snapshot: ConsentSnapshot
): readonly ConsentCategoryRow[] => buildConsentCategoryRows(snapshot);

/** What {@link useCategorySelection} hands a surface. */
export interface CategorySelection {
	/**
	 * The selection to write.
	 *
	 * Every category in scope, not only the ones that moved: pressing save is
	 * confirming the whole screen, and the core records exactly the categories it
	 * is handed.
	 *
	 * @returns A per-category decision ready for `save`.
	 */
	readonly commitSelection: () => Partial<
		Record<OptionalConsentCategory, boolean>
	>;
	/** Rows to render, with any pending switch applied. */
	readonly rows: readonly ConsentCategoryRow[];
	/** Forget pending switches, for when a surface closes. */
	readonly reset: () => void;
	/**
	 * Record a switch for one category.
	 *
	 * @param category - Category the subject moved.
	 * @param value - Position they moved it to.
	 */
	readonly toggle: (category: AllConsentNames, value: boolean) => void;
}

/**
 * Track switches on a category list until the subject saves.
 *
 * The state is the delta only: a row the subject never touched keeps whatever the
 * core reported, so an unrelated snapshot event arriving underneath an open sheet
 * cannot quietly move a switch the subject is looking at.
 *
 * @param rows - Rows to render.
 * @returns The visible rows plus the write payload.
 */
export const useCategorySelection = function useCategorySelection(
	rows: readonly ConsentCategoryRow[]
): CategorySelection {
	const [pending, setPending] = useState<Partial<Record<string, boolean>>>({});

	const toggle = useCallback((category: AllConsentNames, value: boolean) => {
		if (category === 'necessary') {
			return;
		}

		setPending((current) => ({ ...current, [category]: value }));
	}, []);

	const reset = useCallback(() => {
		setPending({});
	}, []);

	const visible: readonly ConsentCategoryRow[] = rows.map((row) => {
		const override = pending[row.key];

		return override === undefined ? row : { ...row, value: override };
	});

	const commitSelection = useCallback((): Partial<
		Record<OptionalConsentCategory, boolean>
	> => {
		const selection: Partial<Record<OptionalConsentCategory, boolean>> = {};

		for (const [category, value] of Object.entries(pending)) {
			if (category !== 'necessary' && value !== undefined) {
				selection[category as OptionalConsentCategory] = value;
			}
		}

		for (const row of rows) {
			const category = row.key;

			if (category !== 'necessary' && selection[category] === undefined) {
				selection[category] = row.value;
			}
		}

		return selection;
	}, [pending, rows]);

	return { commitSelection, reset, rows: visible, toggle };
};
