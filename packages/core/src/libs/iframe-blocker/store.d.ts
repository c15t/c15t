import type { ConsentStoreState } from '../../store/type';
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
export declare function createIframeManager(
	get: () => ConsentStoreState,
	_set: (partial: Partial<ConsentStoreState>) => void
): {
	/**
	 * Initializes the iframe blocker and starts monitoring iframes.
	 *
	 * @remarks
	 * - No-ops in non-browser environments (when `document` is undefined)
	 * - Respects `iframeBlockerConfig.disableAutomaticBlocking`
	 * - Discovers consent categories from iframes and updates
	 *   `consentCategories` via {@link ConsentStoreState.updateConsentCategories}
	 *
	 * Safe to call multiple times; initialization runs only once per
	 * page lifecycle.
	 */
	initializeIframeBlocker: () => void;
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
	updateIframeConsents: () => void;
	/**
	 * Destroys the iframe blocker and cleans up the observer.
	 *
	 * @remarks
	 * Disconnects the underlying `MutationObserver` and marks the
	 * iframe manager as uninitialized. Safe to call multiple times.
	 * No-ops in non-browser environments or when automatic blocking is
	 * disabled.
	 */
	destroyIframeBlocker: () => void;
};
