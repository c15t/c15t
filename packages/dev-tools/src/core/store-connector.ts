/**
 * Store Connector
 * Connects to the c15tStore exposed on the window object
 */

import type { ConsentStoreState } from 'c15t';
import type { StoreApi } from 'zustand/vanilla';

/**
 * Options for creating a store connector
 */
export interface StoreConnectorOptions {
	/**
	 * The namespace used to access the store on the window object
	 * @default 'c15tStore'
	 */
	namespace?: string;

	/**
	 * Callback when the store becomes available
	 */
	onConnect?: (
		state: ConsentStoreState,
		store: StoreApi<ConsentStoreState>
	) => void;

	/**
	 * Callback when store state changes
	 */
	onStateChange?: (state: ConsentStoreState) => void;

	/**
	 * Callback when the store connection is lost or not found
	 */
	onDisconnect?: () => void;
}

/**
 * Store connector instance interface
 */
export interface StoreConnector {
	/**
	 * Get the current store state
	 * Returns null if store is not connected
	 */
	getState: () => ConsentStoreState | null;

	/**
	 * Get the raw store API
	 * Returns null if store is not connected
	 */
	getStore: () => StoreApi<ConsentStoreState> | null;

	/**
	 * Check if the store is connected
	 */
	isConnected: () => boolean;

	/**
	 * Subscribe to store state changes
	 * Returns unsubscribe function
	 */
	subscribe: (listener: (state: ConsentStoreState) => void) => () => void;

	/**
	 * Disconnect from the store and cleanup
	 */
	destroy: () => void;
}

/**
 * Creates a connector to the c15tStore
 */
export function createStoreConnector(
	options: StoreConnectorOptions = {}
): StoreConnector {
	const {
		namespace = 'c15tStore',
		onConnect,
		onStateChange,
		onDisconnect,
	} = options;

	let store: StoreApi<ConsentStoreState> | null = null;
	let unsubscribe: (() => void) | null = null;
	let pollInterval: ReturnType<typeof setInterval> | null = null;
	const listeners = new Set<(state: ConsentStoreState) => void>();

	/**
	 * Try to connect to the store
	 */
	function tryConnect(): boolean {
		if (typeof window === 'undefined') {
			return false;
		}

		const storeInstance = (window as unknown as Record<string, unknown>)[
			namespace
		] as StoreApi<ConsentStoreState> | undefined;

		if (storeInstance && typeof storeInstance.getState === 'function') {
			store = storeInstance;

			// Subscribe to store changes
			unsubscribe = store.subscribe((state) => {
				onStateChange?.(state);
				for (const listener of listeners) {
					listener(state);
				}
			});

			// Notify connection
			const currentState = store.getState();
			onConnect?.(currentState, store);

			// Stop polling
			if (pollInterval) {
				clearInterval(pollInterval);
				pollInterval = null;
			}

			return true;
		}

		return false;
	}

	/**
	 * Start polling for store availability
	 */
	function startPolling(): void {
		if (pollInterval) {
			return;
		}

		// Try immediately
		if (tryConnect()) {
			return;
		}

		// Poll every 100ms for up to 5 seconds
		let attempts = 0;
		const maxAttempts = 50;

		pollInterval = setInterval(() => {
			attempts++;

			if (tryConnect()) {
				return;
			}

			if (attempts >= maxAttempts) {
				if (pollInterval) {
					clearInterval(pollInterval);
					pollInterval = null;
				}
				onDisconnect?.();
			}
		}, 100);
	}

	// Start connecting
	startPolling();

	return {
		getState: () => store?.getState() ?? null,

		getStore: () => store,

		isConnected: () => store !== null,

		subscribe: (listener) => {
			listeners.add(listener);

			// If already connected, call with current state
			if (store) {
				listener(store.getState());
			}

			return () => {
				listeners.delete(listener);
			};
		},

		destroy: () => {
			if (pollInterval) {
				clearInterval(pollInterval);
				pollInterval = null;
			}

			if (unsubscribe) {
				unsubscribe();
				unsubscribe = null;
			}

			store = null;
			listeners.clear();
		},
	};
}

/**
 * Get the store directly from the window object (one-time access)
 */
export function getC15tStore(
	namespace = 'c15tStore'
): StoreApi<ConsentStoreState> | null {
	if (typeof window === 'undefined') {
		return null;
	}

	const store = (window as unknown as Record<string, unknown>)[namespace] as
		| StoreApi<ConsentStoreState>
		| undefined;

	if (store && typeof store.getState === 'function') {
		return store;
	}

	return null;
}

/**
 * Check if the c15t store is available
 */
export function isC15tStoreAvailable(namespace = 'c15tStore'): boolean {
	return getC15tStore(namespace) !== null;
}
