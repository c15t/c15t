import type { ConsentStoreState } from '../../store/type';
type SetState = (partial: Partial<ConsentStoreState>) => void;
type GetState = () => ConsentStoreState;
/**
 * Creates a network blocker manager that integrates with the main consent store.
 *
 * @remarks
 * The returned methods are designed to be spread into the
 * {@link ConsentStoreState} and provide network-blocking behavior for both
 * `fetch` and `XMLHttpRequest` based on the current consent snapshot.
 *
 * This helper is browser-only and will no-op when `window` is undefined.
 *
 * @param get - Store getter used to read the current consent state and
 * configuration
 * @param _set - Store setter used to update `networkBlocker` configuration
 * @returns An object with network blocker lifecycle methods to merge into
 * the store
 *
 * @internal
 */
export declare function createNetworkBlockerManager(
	get: GetState,
	_set: SetState
): {
	/**
	 * Initializes the network blocker by patching global fetch and XHR.
	 *
	 * @remarks
	 * - No-ops when running in non-browser environments
	 * - No-ops when network blocking is disabled or no rules are
	 *   configured
	 * - Takes a snapshot of the current `consents` state that is used
	 *   for all subsequent blocking decisions until updated via
	 *   {@link ConsentStoreState.updateNetworkBlockerConsents}
	 *
	 * Safe to call multiple times; initialization runs only once per
	 * page lifecycle.
	 */
	initializeNetworkBlocker: () => void;
	/**
	 * Updates the consent snapshot used by the network blocker.
	 * Intended to be called after script teardown has completed so that
	 * teardown network calls are not blocked.
	 */
	updateNetworkBlockerConsents: () => void;
	/**
	 * Updates the network blocker configuration at runtime.
	 * When enabling the blocker, this will initialize it if needed.
	 * When disabling, this will restore the original browser APIs.
	 *
	 * @param config - New network blocker configuration to apply
	 */
	setNetworkBlocker: (config: ConsentStoreState['networkBlocker']) => void;
	/**
	 * Destroys the network blocker and restores the original browser APIs.
	 *
	 * @remarks
	 * Restores the original `fetch` and `XMLHttpRequest` implementations
	 * and clears the internal consent snapshot. Safe to call multiple
	 * times and in non-browser environments.
	 */
	destroyNetworkBlocker: () => void;
};
export {};
