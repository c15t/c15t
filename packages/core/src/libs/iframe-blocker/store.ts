import type { PrivacyConsentState } from '../../store.type';
import {
	getIframeConsentCategories,
	processAllIframes,
	setupIframeObserver,
} from './core';

/**
 * Creates an iframe manager that integrates with the main consent store.
 * Follows the script loader pattern with pure functions and state management.
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
	// Store MutationObserver in closure (DOM API, not serializable)
	// Similar to how script loader manages DOM elements
	let observer: MutationObserver | null = null;
	let isInitialized = false;

	return {
		/**
		 * Initializes the iframe blocker and starts monitoring iframes.
		 * Processes existing iframes, sets up observer, and discovers consent categories.
		 *
		 * @throws {Error} When called in a non-browser environment (document is undefined)
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
		 * Pure function approach - just calls processAllIframes with current consents.
		 *
		 * @throws {Error} When called in a non-browser environment (document is undefined)
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
		 * Resets the active state in the store.
		 *
		 * @throws {Error} When called in a non-browser environment (document is undefined)
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
