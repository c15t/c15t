'use client';

import { resolveIABDialogDisplayModel } from '@c15t/iab/headless';
import type { HeadlessIABDialogDisplayModel } from '@c15t/iab/headless';
import { useMemo } from 'react';

import { useIAB } from '~/iab-context';

/**
 * The rows the IAB preference centre renders.
 * @public
 */
export type IABDisplayModel = HeadlessIABDialogDisplayModel;

/**
 * Hook over the shared IAB display model.
 *
 * @remarks
 * React wrapper around `resolveIABDialogDisplayModel` from
 * `@c15t/iab/headless`, so React, Svelte, Vue and the Astro server render
 * agree on which rows a preference centre shows and in what order.
 *
 * @returns The ordered rows plus the tab counts.
 * @public
 */
export const useIABDisplayModel =
	function useIABDisplayModel(): IABDisplayModel {
		const iabState = useIAB();

		return useMemo(() => resolveIABDialogDisplayModel(iabState), [iabState]);
	};
