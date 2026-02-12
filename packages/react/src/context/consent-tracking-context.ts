'use client';

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
