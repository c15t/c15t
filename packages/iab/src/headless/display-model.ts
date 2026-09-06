/**
 * The canonical IAB display model.
 *
 * {@link processGVLForDialog} answers "what is in the GVL"; this answers
 * "what does a surface put on screen, in what order, under which test-id".
 * Every adapter — React, Svelte, Vue and the Astro server render — reads
 * the rows from here instead of deriving its own, which is what keeps the
 * four preference centres listing the same purposes the same number of
 * times.
 *
 * Two lists come out of it, matching the two places the preference centre
 * puts things:
 *
 * - {@link HeadlessIABDialogDisplayModel.consentRows} — everything the
 *   visitor can decide on: purpose 1, the standalone purposes, the stacks,
 *   then the special features.
 * - {@link HeadlessIABDialogDisplayModel.essentialRows} — the locked
 *   "essential functions" section: special purposes, then features.
 *
 * A row's `testId` is part of the model rather than the components,
 * because the same numeric id can name a purpose, a special purpose, a
 * feature and a special feature at once. Deriving `purpose-item-${id}` in
 * each surface made `purpose-item-1` stand for four different rows, so
 * counting them told you nothing about whether two adapters agreed.
 *
 * @packageDocumentation
 */

import { processGVLForDialog } from './dialog-data';
import type {
	HeadlessIABDialogData,
	HeadlessIABProcessedPurpose,
	HeadlessIABProcessedVendor,
	HeadlessIABStateInput,
} from './types';

/** What a row represents, and which section it belongs to. */
export type HeadlessIABDisplayRowKind =
	| 'purpose'
	| 'stack'
	| 'special-feature'
	| 'special-purpose'
	| 'feature';

/**
 * Which consent map a row's toggle writes to.
 *
 * `'none'` is the locked essential rows: they render a toggle that is on
 * and cannot be changed, because the legal basis is not consent.
 */
export type HeadlessIABDisplayToggle = 'purpose' | 'special-feature' | 'none';

/** A single toggleable or locked row. */
export interface HeadlessIABDisplayRow {
	kind: Exclude<HeadlessIABDisplayRowKind, 'stack'>;
	/** The GVL id within its own kind. Not unique across kinds. */
	id: number;
	/** The row's `data-testid`. Unique across the whole surface. */
	testId: string;
	name: string;
	description: string;
	illustrations: string[];
	vendors: HeadlessIABProcessedVendor[];
	/** Whether the toggle is fixed on. */
	locked: boolean;
	/** Which consent map the toggle writes to. */
	toggle: HeadlessIABDisplayToggle;
}

/** A stack, with the purposes it absorbed. */
export interface HeadlessIABDisplayStackRow {
	kind: 'stack';
	id: number;
	testId: string;
	name: string;
	description: string;
	/** The purposes the stack covers, as rows in their own right. */
	purposes: HeadlessIABDisplayRow[];
}

/** Any row in {@link HeadlessIABDialogDisplayModel.consentRows}. */
export type HeadlessIABDisplayConsentRow =
	| HeadlessIABDisplayRow
	| HeadlessIABDisplayStackRow;

/** Everything a preference centre needs to render, already ordered. */
export interface HeadlessIABDialogDisplayModel {
	/** Rows the visitor decides on, in render order. */
	consentRows: HeadlessIABDisplayConsentRow[];
	/** The locked "essential functions" rows, in render order. */
	essentialRows: HeadlessIABDisplayRow[];
	/** The count next to the purposes tab. */
	purposeTabCount: number;
	/** The count next to the vendors tab. */
	vendorTabCount: number;
	/** Distinct vendors named by the essential rows. */
	essentialPartnerCount: number;
	/** Whether the GVL is still on its way. */
	isLoading: boolean;
	/** Whether there is a GVL to render. */
	isReady: boolean;
	/** The processed GVL the rows were built from. */
	data: HeadlessIABDialogData;
}

/** Test-id prefix per row kind. */
const TEST_ID_PREFIX: Record<HeadlessIABDisplayRowKind, string> = {
	feature: 'feature-item',
	purpose: 'purpose-item',
	'special-feature': 'special-feature-item',
	'special-purpose': 'special-purpose-item',
	stack: 'stack-item',
};

/**
 * The `data-testid` for one row.
 *
 * @param kind - The row kind.
 * @param id - The GVL id within that kind.
 * @returns A test-id unique across the surface.
 * @example
 * ```ts
 * iabDisplayTestId('special-feature', 1); // 'special-feature-item-1'
 * ```
 */
export const iabDisplayTestId = function iabDisplayTestId(
	kind: HeadlessIABDisplayRowKind,
	id: number
): string {
	return `${TEST_ID_PREFIX[kind]}-${id}`;
};

const toRow = function toRow(
	purpose: HeadlessIABProcessedPurpose,
	kind: Exclude<HeadlessIABDisplayRowKind, 'stack'>,
	toggle: HeadlessIABDisplayToggle
): HeadlessIABDisplayRow {
	return {
		description: purpose.description,
		id: purpose.id,
		illustrations: purpose.illustrations,
		kind,
		locked: toggle === 'none',
		name: purpose.name,
		testId: iabDisplayTestId(kind, purpose.id),
		toggle,
		vendors: purpose.vendors,
	};
};

/**
 * Resolve the rows every IAB preference centre renders.
 *
 * Pure — no framework reactivity, no DOM. Each adapter wraps it in its own
 * memo (`useMemo`, `$derived`, `computed`) or, on the Astro server path,
 * calls it once per render.
 *
 * @param iab - IAB state carrying the GVL and any custom vendors.
 * @returns The ordered rows plus the tab counts.
 * @example
 * ```ts
 * const model = resolveIABDialogDisplayModel(iabState);
 * for (const row of model.consentRows) {
 *   if (row.kind === 'stack') renderStack(row);
 *   else renderPurpose(row);
 * }
 * ```
 */
export const resolveIABDialogDisplayModel =
	function resolveIABDialogDisplayModel(
		iab: HeadlessIABStateInput | null
	): HeadlessIABDialogDisplayModel {
		const data = processGVLForDialog(iab);

		const consentRows: HeadlessIABDisplayConsentRow[] = [
			...data.standalonePurposes.map((purpose) =>
				toRow(purpose, 'purpose', 'purpose')
			),
			...data.stacks.map((stack): HeadlessIABDisplayStackRow => ({
				description: stack.description,
				id: stack.id,
				kind: 'stack',
				name: stack.name,
				purposes: stack.purposes.map((purpose) =>
					toRow(purpose, 'purpose', 'purpose')
				),
				testId: iabDisplayTestId('stack', stack.id),
			})),
			...data.specialFeatures.map((feature) =>
				toRow(feature, 'special-feature', 'special-feature')
			),
		];

		const essentialRows: HeadlessIABDisplayRow[] = [
			...data.specialPurposes.map((purpose) =>
				toRow(purpose, 'special-purpose', 'none')
			),
			...data.features.map((feature) => toRow(feature, 'feature', 'none')),
		];

		const essentialPartners = new Set<HeadlessIABProcessedVendor['id']>();
		for (const row of essentialRows) {
			for (const vendor of row.vendors) {
				essentialPartners.add(vendor.id);
			}
		}

		return {
			consentRows,
			data,
			essentialPartnerCount: essentialPartners.size,
			essentialRows,
			isLoading: data.isLoading,
			isReady: data.isReady,
			// The tab count is the whole GVL, not the rows: a purpose absorbed
			// into a stack still counts once, and a stack itself does not.
			purposeTabCount:
				data.purposes.length +
				data.specialPurposes.length +
				data.specialFeatures.length +
				data.features.length,
			vendorTabCount: data.totalVendors,
		};
	};
