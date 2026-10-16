/**
 * The IAB draft: what each switch on the IAB screens holds, and how one press
 * moves it.
 *
 * Pure functions over {@link ConsentIabSelection}, so the Swift and Kotlin
 * renderers can port them line for line and check themselves against the
 * fixtures in `native/ui`.
 *
 * @packageDocumentation
 */

import type {
	ConsentIabDisplayConsentRow,
	ConsentIabDisplayModel,
	ConsentIabSelection,
} from '../components/iab-display-model';

/** What a caller may already have decided, in whole or in part. */
export type ConsentIabInitialSelection = Partial<ConsentIabSelection>;

/**
 * The complete set of decisions the IAB screens can express, seeded from what
 * the caller already holds.
 *
 * Every key the screens can move gets an entry whether or not the caller named
 * it, so one save hands over a selection a TC String can be encoded from
 * directly. Absent means what it means on the web: a purpose or a partner
 * consent that was never granted is `false`, and a legitimate interest that was
 * never objected to is `true`.
 *
 * @param model - Disclosure the rows came from.
 * @param initial - Decisions already held, in whole or in part.
 * @returns A selection with one entry per decision the screens can move.
 * @example
 * ```ts
 * seedConsentIabSelection(model, { vendorConsents: { '755': true } });
 * ```
 */
export const seedConsentIabSelection = function seedConsentIabSelection(
	model: ConsentIabDisplayModel,
	initial?: ConsentIabInitialSelection
): ConsentIabSelection {
	const purposeConsents: Record<number, boolean> = {};
	const specialFeatureOptIns: Record<number, boolean> = {};
	const walk = (row: ConsentIabDisplayConsentRow): void => {
		if (row.kind === 'stack') {
			for (const purpose of row.purposes) {
				purposeConsents[purpose.id] =
					initial?.purposeConsents?.[purpose.id] ?? false;
			}

			return;
		}

		if (row.toggle === 'special-feature') {
			specialFeatureOptIns[row.id] =
				initial?.specialFeatureOptIns?.[row.id] ?? false;

			return;
		}

		purposeConsents[row.id] = initial?.purposeConsents?.[row.id] ?? false;
	};

	for (const row of model.consentRows) {
		walk(row);
	}

	const vendorConsents: Record<string, boolean> = {};
	const vendorLegitimateInterests: Record<string, boolean> = {};

	for (const vendor of model.vendors) {
		const key = String(vendor.id);

		vendorConsents[key] = initial?.vendorConsents?.[key] ?? false;

		if (vendor.legIntPurposes.length > 0) {
			vendorLegitimateInterests[key] =
				initial?.vendorLegitimateInterests?.[key] ?? true;
		}
	}

	return {
		purposeConsents,
		specialFeatureOptIns,
		vendorConsents,
		vendorLegitimateInterests,
	};
};

/**
 * Move every entry of one map to one position.
 *
 * @param map - Map to rewrite.
 * @param value - Position to move each entry to.
 * @returns A new map with the same keys.
 */
const mapTo = function mapTo<KeyType extends number | string>(
	map: Record<KeyType, boolean>,
	value: boolean
): Record<KeyType, boolean> {
	const next = {} as Record<KeyType, boolean>;

	for (const key of Object.keys(map) as KeyType[]) {
		next[key] = value;
	}

	return next;
};

/**
 * Every decision moved the same way, for Accept all and Reject all.
 *
 * Special purposes are absent because they are not consent: no consent map
 * has an entry for them.
 *
 * @param model - Disclosure the rows came from.
 * @param value - Position to move everything to.
 * @returns A complete selection at that position.
 */
export const decideConsentIabSelection = function decideConsentIabSelection(
	model: ConsentIabDisplayModel,
	value: boolean
): ConsentIabSelection {
	const seeded = seedConsentIabSelection(model);

	return {
		purposeConsents: mapTo(seeded.purposeConsents, value),
		specialFeatureOptIns: mapTo(seeded.specialFeatureOptIns, value),
		vendorConsents: mapTo(seeded.vendorConsents, value),
		vendorLegitimateInterests: mapTo(seeded.vendorLegitimateInterests, value),
	};
};

/** Row id of a purpose switch. */
export const purposeRowId = (id: number): string => `purpose.${String(id)}`;

/** Row id of a stack switch. */
export const stackRowId = (id: number): string => `stack.${String(id)}`;

/** Row id of a special feature switch. */
export const specialFeatureRowId = (id: number): string =>
	`specialFeature.${String(id)}`;

/** Row id of a special purpose, which has no switch. */
export const specialPurposeRowId = (id: number): string =>
	`specialPurpose.${String(id)}`;

/** Row id of a feature, which has no switch. */
export const featureRowId = (id: number): string => `feature.${String(id)}`;

/** Route id of a partner's detail screen. */
export const vendorRouteId = (id: number | string): string =>
	`vendor.${String(id)}`;

/** Row id of a partner's consent switch. */
export const vendorConsentRowId = (id: number | string): string =>
	`vendor.${String(id)}.consent`;

/** Row id of a partner's legitimate interest switch. */
export const vendorLegitimateInterestRowId = (id: number | string): string =>
	`vendor.${String(id)}.legitimateInterest`;

/**
 * The trailing number of a row id with a known prefix.
 *
 * @param rowId - Row id to read.
 * @param prefix - Prefix including the dot.
 * @returns The id, or `null` when the row id has another shape.
 */
const numericSuffix = function numericSuffix(
	rowId: string,
	prefix: string
): number | null {
	if (!rowId.startsWith(prefix)) {
		return null;
	}

	const rest = rowId.slice(prefix.length);

	return /^\d+$/u.test(rest) ? Number(rest) : null;
};

/**
 * Apply one switch press to the draft.
 *
 * The row id names the switch: `purpose.N`, `stack.N` (every purpose in the
 * stack), `specialFeature.N`, `vendor.X.consent`, or
 * `vendor.X.legitimateInterest` (`true` means not objected). Any other id
 * leaves the draft as it was.
 *
 * @param model - Disclosure the rows came from.
 * @param selection - Draft before the press.
 * @param rowId - Row whose switch moved.
 * @param value - Position the switch moved to.
 * @returns The draft after the press.
 * @example
 * ```ts
 * applyIabToggle(model, draft, 'stack.42', true);
 * ```
 */
export const applyIabToggle = function applyIabToggle(
	model: ConsentIabDisplayModel,
	selection: ConsentIabSelection,
	rowId: string,
	value: boolean
): ConsentIabSelection {
	const purpose = numericSuffix(rowId, 'purpose.');

	if (purpose !== null) {
		const row = model.consentRows
			.flatMap((candidate) =>
				candidate.kind === 'stack' ? candidate.purposes : [candidate]
			)
			.find(
				(candidate) =>
					candidate.toggle === 'purpose' && candidate.id === purpose
			);

		// A purpose no partner holds on consent has a locked switch; a stray
		// press must not record a consent nobody relies on.
		if (row === undefined || !row.hasConsentBasis) {
			return selection;
		}

		return {
			...selection,
			purposeConsents: { ...selection.purposeConsents, [purpose]: value },
		};
	}

	const stack = numericSuffix(rowId, 'stack.');

	if (stack !== null) {
		const row = model.consentRows.find(
			(candidate) => candidate.kind === 'stack' && candidate.id === stack
		);

		if (row === undefined || row.kind !== 'stack') {
			return selection;
		}

		const purposeConsents = { ...selection.purposeConsents };

		for (const member of row.purposes) {
			if (member.hasConsentBasis) {
				purposeConsents[member.id] = value;
			}
		}

		return { ...selection, purposeConsents };
	}

	const feature = numericSuffix(rowId, 'specialFeature.');

	if (feature !== null) {
		if (
			!model.consentRows.some(
				(row) =>
					row.kind !== 'stack' &&
					row.toggle === 'special-feature' &&
					row.id === feature
			)
		) {
			return selection;
		}
		return {
			...selection,
			specialFeatureOptIns: {
				...selection.specialFeatureOptIns,
				[feature]: value,
			},
		};
	}

	if (rowId.startsWith('vendor.')) {
		if (rowId.endsWith('.consent')) {
			const key = rowId.slice('vendor.'.length, -'.consent'.length);
			if (!model.vendors.some((vendor) => String(vendor.id) === key)) {
				return selection;
			}

			return {
				...selection,
				vendorConsents: { ...selection.vendorConsents, [key]: value },
			};
		}

		if (rowId.endsWith('.legitimateInterest')) {
			const key = rowId.slice('vendor.'.length, -'.legitimateInterest'.length);
			if (
				!model.vendors.some(
					(vendor) =>
						String(vendor.id) === key && vendor.legIntPurposes.length > 0
				)
			) {
				return selection;
			}

			return {
				...selection,
				vendorLegitimateInterests: {
					...selection.vendorLegitimateInterests,
					[key]: value,
				},
			};
		}
	}

	return selection;
};
