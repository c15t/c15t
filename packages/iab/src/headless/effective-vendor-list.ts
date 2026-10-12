/**
 * Vendor declarations after publisher restrictions.
 *
 * A type 1 or 2 restriction changes the legal basis a vendor uses for a
 * purpose, and type 0 removes the purpose. Preference UIs that classify a
 * vendor's purposes from the raw list would show the wrong control: an
 * opt-out that clears consent while the vendor keeps processing on
 * legitimate interest. Deriving the UI from this list shows the basis the
 * IAB gates actually evaluate.
 *
 * @packageDocumentation
 */

import type { GlobalVendorList, PublisherRestriction } from '@c15t/core';

/**
 * Purposes current TCF policy allows only with consent. Mirrors
 * `CONSENT_ONLY_PURPOSES` in the TCF module, which this headless entry does
 * not import.
 */
const CONSENT_ONLY_PURPOSES: readonly number[] = [1, 3, 4, 5, 6];

type Vendor = GlobalVendorList['vendors'][number];

const without = (list: readonly number[], purposeId: number): number[] =>
	list.filter((id) => id !== purposeId);

/** Appends a purpose once, even if the list already declares it. */
const including = (list: readonly number[], purposeId: number): number[] =>
	list.includes(purposeId) ? [...list] : [...list, purposeId];

/** One restriction applied to one vendor, following the TCF v2 rules. */
const restrictVendor = function restrictVendor(
	vendor: Vendor,
	{ purposeId, restrictionType }: PublisherRestriction
): Vendor {
	const purposes = vendor.purposes ?? [];
	const legIntPurposes = vendor.legIntPurposes ?? [];
	const flexible = vendor.flexiblePurposes?.includes(purposeId) === true;
	const consent = purposes.includes(purposeId);
	const legitimateInterest = legIntPurposes.includes(purposeId);
	const remove = (): Vendor => ({
		...vendor,
		flexiblePurposes: without(vendor.flexiblePurposes ?? [], purposeId),
		legIntPurposes: without(legIntPurposes, purposeId),
		purposes: without(purposes, purposeId),
	});
	if (restrictionType === 0) {
		return consent || legitimateInterest ? remove() : vendor;
	}
	if (restrictionType === 1 && legitimateInterest) {
		// Without flexibility the vendor has no permitted basis left.
		return flexible
			? {
					...vendor,
					legIntPurposes: without(legIntPurposes, purposeId),
					purposes: including(purposes, purposeId),
				}
			: remove();
	}
	if (restrictionType === 2 && consent) {
		return flexible && !CONSENT_ONLY_PURPOSES.includes(purposeId)
			? {
					...vendor,
					legIntPurposes: including(legIntPurposes, purposeId),
					purposes: without(purposes, purposeId),
				}
			: remove();
	}
	// Requiring the basis the vendor already uses changes nothing.
	return vendor;
};

/**
 * Returns the vendor list with each restricted vendor's `purposes` and
 * `legIntPurposes` set to the legal basis it may actually use.
 *
 * - Type 0 removes the purpose from the vendor.
 * - Type 1 moves a flexible LI purpose to `purposes`.
 * - Type 2 moves a flexible consent purpose to `legIntPurposes`, except
 *   for purposes 1 and 3 to 6.
 * - A basis change the vendor list does not allow removes the purpose,
 *   because the vendor may not process it on any basis.
 *
 * Vendors missing from the list are ignored. The input is not modified.
 *
 * @param gvl - The Global Vendor List.
 * @param restrictions - Publisher restrictions, if any.
 * @returns `gvl` itself when nothing applies, otherwise a restricted copy.
 *
 * @example
 * ```ts
 * const effective = applyPublisherRestrictionsToGVL(gvl, [
 *   { purposeId: 7, restrictionType: 2, vendorIds: [755] },
 * ]);
 * effective.vendors[755]?.legIntPurposes.includes(7); // true
 * ```
 *
 * @public
 */
export const applyPublisherRestrictionsToGVL =
	function applyPublisherRestrictionsToGVL(
		gvl: GlobalVendorList,
		restrictions: readonly PublisherRestriction[] | undefined
	): GlobalVendorList {
		if (!restrictions?.length) {
			return gvl;
		}
		let vendors: GlobalVendorList['vendors'] | null = null;
		for (const restriction of restrictions) {
			for (const vendorId of restriction.vendorIds) {
				const current = (vendors ?? gvl.vendors)[vendorId];
				if (!current) {
					continue;
				}
				const next = restrictVendor(current, restriction);
				if (next !== current) {
					vendors ??= { ...gvl.vendors };
					vendors[vendorId] = next;
				}
			}
		}
		return vendors ? { ...gvl, vendors } : gvl;
	};

/** Legitimate interest signals publisher restrictions introduce. */
export interface IntroducedLegitimateInterest {
	/** Purposes a restriction moved some vendor onto legitimate interest for. */
	purposes: number[];
	/** Vendors a restriction moved onto legitimate interest for some purpose. */
	vendors: number[];
}

/**
 * The legitimate interest signals type 2 restrictions introduce: purposes
 * and vendors that use legitimate interest only because a restriction
 * moved a flexible consent purpose there.
 *
 * Under the TCF, legitimate interest applies until the visitor objects, so
 * preference controls show these as allowed while the draft has no value,
 * and saving encodes them as allowed. An objection in the draft wins.
 *
 * @param gvl - The Global Vendor List.
 * @param restrictions - Publisher restrictions, if any.
 * @returns Purpose and vendor IDs, each sorted and listed once.
 *
 * @public
 */
export const introducedLegitimateInterest =
	function introducedLegitimateInterest(
		gvl: GlobalVendorList,
		restrictions: readonly PublisherRestriction[] | undefined
	): IntroducedLegitimateInterest {
		const effective = applyPublisherRestrictionsToGVL(
			gvl,
			restrictions
		).vendors;
		const purposes = new Set<number>();
		const vendors = new Set<number>();
		for (const { purposeId, restrictionType, vendorIds } of restrictions ??
			[]) {
			if (restrictionType !== 2) {
				continue;
			}
			for (const vendorId of vendorIds) {
				const before = gvl.vendors[vendorId]?.legIntPurposes ?? [];
				const after = effective[vendorId]?.legIntPurposes ?? [];
				if (after.includes(purposeId) && !before.includes(purposeId)) {
					purposes.add(purposeId);
					vendors.add(vendorId);
				}
			}
		}
		const sorted = (ids: Set<number>) => [...ids].sort((a, b) => a - b);
		return { purposes: sorted(purposes), vendors: sorted(vendors) };
	};
