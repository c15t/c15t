'use client';

import type { PreferenceControl, PresentationAction } from '@c15t/core';
import {
	resolveActionLabels,
	resolvePreferenceControlLabels,
} from '@c15t/core';
import { useMemo } from 'react';

import { useTranslations } from './use-translations';

/** Labels for the controls a consent surface renders. */
export interface ConsentLabels {
	/** Button label for each action in `actionGroups`. */
	actions: Record<PresentationAction, string>;
	/** Label for each entry in `preferenceControls`. */
	preferenceControls: Record<PreferenceControl, string>;
}

/**
 * Translated labels for every consent action and preference control.
 *
 * @remarks
 * Pairs with the `banner` and `dialog` state from `useHeadlessConsentUI`, so
 * a custom UI can label any resolved action without its own map. Keys the
 * active language leaves out use English.
 *
 * @returns Labels keyed by action and by preference control.
 *
 * @example
 * ```tsx
 * const { banner, performBannerAction } = useHeadlessConsentUI();
 * const labels = useConsentLabels();
 *
 * banner.orderedActions.map((action) => (
 *   <button key={action} onClick={() => performBannerAction(action)}>
 *     {labels.actions[action]}
 *   </button>
 * ));
 * ```
 * @public
 */
export const useConsentLabels = function useConsentLabels(): ConsentLabels {
	const translations = useTranslations();
	return useMemo(
		() => ({
			actions: resolveActionLabels(translations),
			preferenceControls: resolvePreferenceControlLabels(translations),
		}),
		[translations]
	);
};
