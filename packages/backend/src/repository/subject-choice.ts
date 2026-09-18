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
 * Legacy snapshots and unreadable rows supersede older grants. Explicit
 * denials survive unless a later receipt or legacy grant replaces them.
 * No grants are salvaged from an unreadable row's purpose codes.
 *
 * Pure. No queries, no clock.
 */

import {
	POLICY_OPTIONAL_CATEGORIES,
	subjectChoiceWireSchema,
	vendorChoiceWireSchema,
} from '@c15t/schema';
import type {
	PolicyOptionalCategory,
	SubjectCategoryReceiptWire,
	SubjectChoiceWire,
	VendorChoiceWire,
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
 * A v3 receipt wins by its own `confirmedAt`, not by row order: a partial save
 * that confirmed only `marketing` must not renew the `measurement` receipt an
 * earlier act made. Ties keep the later row.
 */
export const mergeSubjectChoice = function mergeSubjectChoice(
	rows: readonly ChoiceSourceRow[]
): SubjectChoiceWire | null {
	const categories = new Map<
		PolicyOptionalCategory,
		SubjectCategoryReceiptWire
	>();
	const ordered = [...rows].sort(
		(left, right) => left.givenAt.getTime() - right.givenAt.getTime()
	);
	for (const row of ordered) {
		if (row.type !== COOKIE_BANNER_TYPE) {
			continue;
		}
		if (row.choice.kind !== 'receipts') {
			// Legacy rows are snapshots, not partial receipt patches. A later
			// snapshot or unreadable record cannot renew an earlier grant whose
			// category it no longer proves. Keep explicit denials intact.
			for (const category of POLICY_OPTIONAL_CATEGORIES) {
				const current = categories.get(category);
				if (current?.value && current.confirmedAt <= row.givenAt.getTime()) {
					categories.delete(category);
				}
			}
		}
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
			const current = categories.get(key);
			if (current === undefined || receipt.confirmedAt >= current.confirmedAt) {
				categories.set(key, receipt);
			}
		}
	}
	return categories.size > 0
		? { categories: Object.fromEntries(categories), version: 3 }
		: null;
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

/**
 * What a row's `vendorChoice` column holds. `absent` covers rows written
 * before vendor consent existed and rows whose save declared no vendors.
 *
 * @internal
 */
export type StoredVendorChoice =
	| { kind: 'absent' }
	| { kind: 'unreadable' }
	| { kind: 'grants'; vendorChoice: VendorChoiceWire };

/**
 * What a row's `vendorChoice` column holds. See {@link StoredVendorChoice}.
 *
 * @internal
 */
export const decodeStoredVendorChoice = function decodeStoredVendorChoice(
	value: unknown
): StoredVendorChoice {
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
	const validated = v.safeParse(vendorChoiceWireSchema, parsed);
	return validated.success
		? { kind: 'grants', vendorChoice: validated.output }
		: { kind: 'unreadable' };
};

/** @internal */
export interface VendorSourceRow {
	readonly id: string;
	readonly type: string;
	readonly givenAt: Date;
	readonly vendorChoice: StoredVendorChoice;
}

/**
 * The vendor grant map of a subject's most recent cookie-banner act.
 *
 * Unlike category receipts, a vendor map is one complete decision, so the
 * map on the latest act by `givenAt` replaces every earlier one outright.
 * `givenAt` is the act's time; the map's own `confirmedAt` travels with it
 * but does not pick the winner, since a client may send them independently.
 * Two acts at the same instant can both exist when they differ in policy or
 * domain, and SQL does not define which one a query returns last, so a tie is
 * broken by the row id: the greater id wins on every engine. A row without a
 * map is skipped: that act did not decide vendors. A row whose map is
 * unreadable is the newest decision and cannot be read, so the aggregate is
 * `null` rather than an older map that the unreadable act superseded.
 *
 * @internal
 */
export const mergeSubjectVendorChoice = function mergeSubjectVendorChoice(
	rows: readonly VendorSourceRow[]
): VendorChoiceWire | null {
	let newest: {
		givenAt: number;
		id: string;
		vendorChoice: VendorChoiceWire | null;
	} | null = null;
	for (const row of rows) {
		if (row.type !== COOKIE_BANNER_TYPE || row.vendorChoice.kind === 'absent') {
			continue;
		}
		const givenAt = row.givenAt.getTime();
		const later =
			newest === null ||
			givenAt > newest.givenAt ||
			(givenAt === newest.givenAt && row.id > newest.id);
		if (later) {
			newest = {
				givenAt,
				id: row.id,
				vendorChoice:
					row.vendorChoice.kind === 'grants'
						? row.vendorChoice.vendorChoice
						: null,
			};
		}
	}
	return newest?.vendorChoice ?? null;
};
