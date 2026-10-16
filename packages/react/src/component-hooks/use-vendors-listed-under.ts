'use client';

import type { AllConsentNames, ResolvedVendor } from '@c15t/core';
import { deniedVendorIds, vendorsListedUnder } from '@c15t/core';
import { useMemo } from 'react';

import { useDeclaredVendors, useVendorChoice } from '~/hooks';

/**
 * The vendors the stock preference center lists under one category, for a
 * custom preference center that shows the same rows.
 *
 * @remarks
 * A vendor known only from a script's `vendor` slug gets no row until the
 * site declares a vendor in `vendors` or on the backend, unless the visitor
 * turned it off. Then it stays listed so the visitor can turn it on again.
 * Under an `iab` policy the list is empty.
 *
 * @param category - The category row being rendered.
 * @returns The vendors to list, in declared order.
 *
 * @example
 * ```tsx
 * function CategoryVendors({ category }: { category: AllConsentNames }) {
 *   const vendors = useVendorsListedUnder(category);
 *   return (
 *     <ul>
 *       {vendors.map((vendor) => (
 *         <li key={vendor.id}>{vendor.name ?? vendor.id}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 * @public
 */
export const useVendorsListedUnder = function useVendorsListedUnder(
	category: AllConsentNames
): ResolvedVendor[] {
	const declared = useDeclaredVendors();
	const vendorChoice = useVendorChoice();
	return useMemo(
		() =>
			vendorsListedUnder(
				declared,
				category,
				deniedVendorIds({
					vendorChoice,
					vendors: { declared, listVersion: null },
				})
			),
		[declared, category, vendorChoice]
	);
};
