/**
 * The merged v3 receipt view of a subject's consent rows.
 *
 * Every cookie-banner consent row is one append-only act. Rows written by a
 * v3 client carry the receipts that act confirmed; rows written before
 * receipts existed carry only the granted purpose codes. This module folds
 * them into the per-category shape the client evaluator reads, keeping each
 * receipt's original confirmation time and basis.
 *
 * ## Legacy rows
 *
 * A row written by the 2.x backend holds only the granted codes as
 * `purposeIds`; the refusals the client submitted were never stored. Such a
 * row therefore contributes a `legacy-v2` grant, timed at its `givenAt`, for
 * every code it holds and nothing for the rest: an absent code is historical
 * omission, not evidence of a refusal, and no receipt is invented from it.
 * Saves that reach this backend without receipts have their submitted values
 * written as receipts at write time, so their refusals do survive. The basis
 * carries no material fingerprint: the runtime decision's fingerprint is the
 * exact-policy hash, not the material one, so nothing comparable exists and
 * the receipt is grandfathered.
 *
 * A row whose stored receipts cannot be read is skipped entirely. Nothing is
 * salvaged from it, not even its granted codes, because the receipts were the
 * more specific evidence and they are unreadable.
 *
 * Pure. No queries, no clock.
 */

import {
	POLICY_OPTIONAL_CATEGORIES,
	subjectChoiceWireSchema,
} from '@c15t/schema';
import type {
	PolicyOptionalCategory,
	SubjectCategoryReceiptWire,
	SubjectChoiceWire,
} from '@c15t/schema';
import * as v from 'valibot';

/** The consent policy type that carries category receipts. */
export const COOKIE_BANNER_TYPE = 'cookie_banner';

/**
 * What a row's `choice` column holds.
 *
 * `absent` is a row written before receipts existed; `unreadable` is a row
 * whose receipts exist but cannot be read as the v3 wire, which poisons the
 * row for merging.
 */
export type StoredChoice =
	| { kind: 'absent' }
	| { kind: 'unreadable' }
	| { kind: 'receipts'; choice: SubjectChoiceWire };

export interface ChoiceSourceRow {
	readonly type: string;
	readonly givenAt: Date;
	readonly preferences: Readonly<Record<string, boolean>> | undefined;
	readonly choice: StoredChoice;
}

const OPTIONAL: ReadonlySet<string> = new Set(POLICY_OPTIONAL_CATEGORIES);

const isOptionalCategory = (value: string): value is PolicyOptionalCategory =>
	OPTIONAL.has(value);

/** Grants a legacy cookie-banner row holds, or none for other rows. */
const legacyReceipts = (
	row: ChoiceSourceRow
): Partial<Record<PolicyOptionalCategory, SubjectCategoryReceiptWire>> => {
	if (row.type !== COOKIE_BANNER_TYPE || row.preferences === undefined) {
		return {};
	}
	const receipts: Partial<
		Record<PolicyOptionalCategory, SubjectCategoryReceiptWire>
	> = {};
	for (const category of POLICY_OPTIONAL_CATEGORIES) {
		if (row.preferences[category] === true) {
			receipts[category] = {
				basis: { kind: 'legacy-v2' },
				confirmedAt: row.givenAt.getTime(),
				value: true,
			};
		}
	}
	return receipts;
};

/**
 * Folds consent rows into the latest receipt per category.
 *
 * A receipt wins by its own `confirmedAt`, not by row order: a partial save
 * that confirmed only `marketing` must not renew the `measurement` receipt an
 * earlier act made. Ties keep the later row.
 */
export const mergeSubjectChoice = function mergeSubjectChoice(
	rows: readonly ChoiceSourceRow[]
): SubjectChoiceWire | undefined {
	const categories: SubjectChoiceWire['categories'] = {};
	let any = false;
	const ordered = [...rows].sort(
		(left, right) => left.givenAt.getTime() - right.givenAt.getTime()
	);
	for (const row of ordered) {
		if (row.choice.kind === 'unreadable') {
			continue;
		}
		const receipts =
			row.choice.kind === 'receipts'
				? row.choice.choice.categories
				: legacyReceipts(row);
		for (const [key, receipt] of Object.entries(receipts)) {
			if (!isOptionalCategory(key) || receipt === undefined) {
				continue;
			}
			const current = categories[key];
			if (current === undefined || receipt.confirmedAt >= current.confirmedAt) {
				categories[key] = receipt;
				any = true;
			}
		}
	}
	return any ? { categories, version: 3 } : undefined;
};

/** What a row's `choice` column holds. See {@link StoredChoice}. */
export const decodeStoredChoice = function decodeStoredChoice(
	value: unknown
): StoredChoice {
	if (value === null || value === undefined) {
		return { kind: 'absent' };
	}
	const parsed = (() => {
		if (typeof value !== 'string') {
			return value;
		}
		try {
			return JSON.parse(value) as unknown;
		} catch {
			return undefined;
		}
	})();
	const validated = v.safeParse(subjectChoiceWireSchema, parsed);
	return validated.success
		? { choice: validated.output, kind: 'receipts' }
		: { kind: 'unreadable' };
};

/** Stored `purposeIds` as codes, or `undefined` when nothing was granted. */
export const decodePreferences = function decodePreferences(
	purposeIds: unknown,
	codesById: ReadonlyMap<string, string>
): Record<string, boolean> | undefined {
	const parsed = (() => {
		if (typeof purposeIds !== 'string') {
			return purposeIds;
		}
		try {
			return JSON.parse(purposeIds) as unknown;
		} catch {
			return undefined;
		}
	})();
	if (!Array.isArray(parsed) || parsed.length === 0) {
		return undefined;
	}
	const preferences: Record<string, boolean> = {};
	for (const id of parsed) {
		const code = typeof id === 'string' ? codesById.get(id) : undefined;
		if (code !== undefined) {
			preferences[code] = true;
		}
	}
	return Object.keys(preferences).length > 0 ? preferences : undefined;
};
