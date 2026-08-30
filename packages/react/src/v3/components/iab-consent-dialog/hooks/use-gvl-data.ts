'use client';

import {
	type HeadlessIABDialogData,
	processGVLForDialog,
} from '@c15t/iab/v3/headless';
import { useMemo } from 'react';

import { useIAB } from '~/v3/iab-context';

/**
 * Processed GVL data for the IAB Consent Dialog.
 * @public
 */
export type GVLData = HeadlessIABDialogData;

/**
 * Hook to process GVL (Global Vendor List) data into UI-friendly format.
 *
 * @remarks
 * React wrapper around the framework-agnostic headless processor from
 * `@c15t/iab/v3/headless`.
 *
 * @returns Processed GVL data ready for UI rendering
 * @public
 */
export function useGVLData(): GVLData {
	const iabState = useIAB();

	return useMemo(
		() => processGVLForDialog(iabState),
		[iabState?.gvl, iabState?.nonIABVendors, iabState?.isLoadingGVL]
	);
}
