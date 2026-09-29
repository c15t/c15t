'use client';

import type { SaveUISource } from '@c15t/core';
import { createContext, useContext } from 'react';

/**
 * Value provided by the ConsentTrackingContext.
 *
 * @remarks
 * Carries the `uiSource` identifier so that consent actions
 * (accept, reject, custom) can record which UI component
 * collected the consent.
 *
 * @public
 */
export interface ConsentTrackingValue {
	/** Which UI component collected the consent (e.g., 'banner', 'dialog', 'widget') */
	uiSource?: string;
}

/**
 * Context for tracking which UI component is collecting consent.
 *
 * @remarks
 * Each consent component root (banner, dialog, widget, IAB variants)
 * provides a default `uiSource` value via this context. Consumers
 * (e.g., ConsentButton) read it to pass along with the API call.
 *
 * @public
 */
export const ConsentTrackingContext = createContext<ConsentTrackingValue>({});

/**
 * Hook to read the current consent tracking context.
 *
 * @returns The current {@link ConsentTrackingValue}
 * @public
 */
export const useConsentTracking = () => useContext(ConsentTrackingContext);

/**
 * Narrow a tracking `uiSource` to a value the kernel records. Custom labels
 * fall back to the kernel's `activeUI` attribution.
 *
 * @param value - The `uiSource` from props or context.
 * @returns A kernel save source, or `undefined` to keep the default.
 * @public
 */
export const toSaveUISource = function toSaveUISource(
	value: string | undefined
): SaveUISource | undefined {
	return value === 'banner' ||
		value === 'dialog' ||
		value === 'widget' ||
		value === 'none'
		? value
		: undefined;
};
