'use client';

import { processGVLForDialog } from '@c15t/iab/headless';
import type { HeadlessIABDialogData } from '@c15t/iab/headless';
import { useMemo } from 'react';

import { useIAB } from '~/iab-context';

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
 * `@c15t/iab/headless`.
 *
 * @returns Processed GVL data ready for UI rendering
 * @public
 */
export const useGVLData = function useGVLData(): GVLData {
	const iabState = useIAB();

	return useMemo(() => processGVLForDialog(iabState), [iabState]);
};
