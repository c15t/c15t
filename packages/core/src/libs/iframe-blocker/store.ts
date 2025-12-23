import type { ConsentStoreState } from '../../store/type';
import {
	getIframeConsentCategories,
	processAllIframes,
	setupIframeObserver,
} from './core';

/**
 * Creates an iframe manager that integrates with the main consent store.
 *
 * @remarks
 * The returned methods are intended to be spread into the
 * {@link ConsentStoreState} and provide iframe-blocking behavior based on
 * the current consent preferences.
 *
 * @param get - The store's `getState` method
 * @param _set - The store's `setState` method (currently unused)
 * @returns An object with iframe management methods to be merged into the
 * store
 *
 * @internal
 */
export function createIframeManager(
	get: () => ConsentStoreState,
	_set: (partial: Partial<ConsentStoreState>) => void
) {
	// Store MutationObserver in closure (DOM API, not serializable)
	// Similar to how script loader manages DOM elements
	let observer: MutationObserver | null = null;
	let isInitialized = false;

	return {
		/**
		 * Initializes the iframe blocker and starts monitoring iframes.
		 *
		 * @remarks
		 * - No-ops in non-browser environments (when `document` is undefined)
		 * - Respects `iframeBlockerConfig.disableAutomaticBlocking`
		 * - Discovers consent categories from iframes and updates
		 *   `gdprTypes` via {@link ConsentStoreState.updateConsentCategories}
		 *
		 * Safe to call multiple times; initialization runs only once per
		 * page lifecycle.
		 */
		initializeIframeBlocker: () => {
			// Check if already initialized
			if (isInitialized) {
				return;
			}

			// Skip initialization in non-browser environments
			if (typeof document === 'undefined') {
				return;
			}

			const state = get();

			if (state.iframeBlockerConfig?.disableAutomaticBlocking) {
				return;
			}

			// Helper to extract and register iframe categories
			const discoverAndRegisterCategories = () => {
				const iframeCategories = getIframeConsentCategories();
				if (iframeCategories.length > 0) {
					get().updateConsentCategories(iframeCategories);
				}
			};

			// Wait for DOM to be ready before scanning for iframes
			if (document.readyState === 'loading') {
				document.addEventListener(
					'DOMContentLoaded',
					discoverAndRegisterCategories
				);
			} else {
				// DOM already loaded, scan immediately
				discoverAndRegisterCategories();
			}

			// Also scan after a small delay to catch any late-rendered iframes
			setTimeout(discoverAndRegisterCategories, 100);

			// Process all existing iframes (pure function call)
			processAllIframes(state.consents);

			// Set up observer for dynamically added iframes
			// Pass callback to discover categories when new iframes are added
			observer = setupIframeObserver(
				() => get().consents,
				(categories) => get().updateConsentCategories(categories)
			);

			// Mark as initialized
			isInitialized = true;
		},

		/**
		 * Updates iframe consent state and reprocesses all iframes.
		 *
		 * @remarks
		 * Re-applies blocking rules to all known iframes using the current
		 * consent state. This is a no-op when:
		 * - The blocker has not been initialized
		 * - Running in a non-browser environment
		 * - Automatic blocking is disabled
		 */
		updateIframeConsents: () => {
			// Only process if initialized
			if (!isInitialized) {
				return;
			}

			// Skip processing in non-browser environments
			if (typeof document === 'undefined') {
				return;
			}

			const state = get();
			const { consents, iframeBlockerConfig } = state;

			if (iframeBlockerConfig?.disableAutomaticBlocking) {
				return;
			}

			processAllIframes(consents);
		},

		/**
		 * Destroys the iframe blocker and cleans up the observer.
		 *
		 * @remarks
		 * Disconnects the underlying `MutationObserver` and marks the
		 * iframe manager as uninitialized. Safe to call multiple times.
		 * No-ops in non-browser environments or when automatic blocking is
		 * disabled.
		 */
		destroyIframeBlocker: () => {
			// Only destroy if initialized
			if (!isInitialized) {
				return;
			}

			// Skip destruction in non-browser environments
			if (typeof document === 'undefined') {
				return;
			}

			const state = get();
			const { iframeBlockerConfig } = state;

			if (iframeBlockerConfig?.disableAutomaticBlocking) {
				return;
			}

			if (observer) {
				observer.disconnect();
				observer = null;
			}

			// Mark as not initialized
			isInitialized = false;
		},
	};
}
