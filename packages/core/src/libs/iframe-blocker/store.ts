import type { PrivacyConsentState } from '../../store.type';
import { createIframeBlocker } from './core';
import type { IframeBlocker } from './types';

let iframeBlocker: IframeBlocker | null = null;

/**
 * Resets the iframe blocker instance for testing purposes
 * @internal
 */
export function resetIframeBlocker() {
	iframeBlocker = null;
}

/**
 * Creates an iframe manager that integrates with the main consent store.
 *
 * @param get - The store's `getState` method
 * @param set - The store's `setState` method
 * @returns An object with iframe management methods to be spread into the store
 *
 * @internal
 */
export function createIframeManager(
	get: () => PrivacyConsentState,
	_set: (partial: Partial<PrivacyConsentState>) => void
) {
	return {
		initializeIframeBlocker: () => {
			if (typeof window === 'undefined' || iframeBlocker) {
				return;
			}

			const { iframeBlockerConfig, consents } = get();
			iframeBlocker = createIframeBlocker(iframeBlockerConfig, consents);
		},
		updateIframeConsents: () => {
			if (iframeBlocker) {
				const { consents } = get();
				iframeBlocker.updateConsents(consents);
			}
		},
		destroyIframeBlocker: () => {
			if (iframeBlocker) {
				iframeBlocker.destroy();
				iframeBlocker = null;
			}
		},
	};
}
