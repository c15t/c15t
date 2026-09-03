/**
 * Kernel Connector
 * Connects to a `ConsentKernel`, either handed in directly or exposed on
 * the window object under a namespace.
 */

import type { ConsentKernel, ConsentSnapshot } from '@c15t/core';

/**
 * Window property the connector polls for a kernel when none is passed in.
 * Apps expose their kernel with `window.c15tKernel = kernel`.
 */
export const DEFAULT_KERNEL_NAMESPACE = 'c15tKernel';

/**
 * Options for creating a kernel connector
 */
export interface StoreConnectorOptions {
	/**
	 * The namespace used to look the kernel up on the window object
	 * @default 'c15tKernel'
	 */
	namespace?: string;

	/**
	 * Kernel handle to connect to directly. Skips window polling.
	 */
	kernel?: ConsentKernel;

	/**
	 * Callback when the kernel becomes available
	 */
	onConnect?: (snapshot: ConsentSnapshot, kernel: ConsentKernel) => void;

	/**
	 * Callback when the kernel snapshot changes
	 */
	onStateChange?: (snapshot: ConsentSnapshot) => void;

	/**
	 * Callback when the kernel could not be found after several attempts
	 */
	onDisconnect?: () => void;
}

export interface ConnectionDiagnostics {
	namespace: string;
	reconnectAttempts: number;
	nextRetryInMs: number | null;
	lastError: string | null;
	isPolling: boolean;
	disconnectNotified: boolean;
}

/**
 * Kernel connector instance interface
 */
export interface StoreConnector {
	/**
	 * Get the current kernel snapshot
	 * Returns null if no kernel is connected
	 */
	getState: () => ConsentSnapshot | null;

	/**
	 * Get the connected kernel
	 * Returns null if no kernel is connected
	 */
	getKernel: () => ConsentKernel | null;

	/**
	 * Check if a kernel is connected
	 */
	isConnected: () => boolean;

	/**
	 * Subscribe to snapshot changes
	 * Returns unsubscribe function
	 */
	subscribe: (listener: (snapshot: ConsentSnapshot) => void) => () => void;

	/**
	 * Gets connection diagnostics for disconnected-state troubleshooting.
	 */
	getDiagnostics: () => ConnectionDiagnostics;

	/**
	 * Subscribe to diagnostics changes.
	 */
	subscribeDiagnostics: (
		listener: (diagnostics: ConnectionDiagnostics) => void
	) => () => void;

	/**
	 * Triggers an immediate reconnect attempt when disconnected.
	 */
	retryConnection: () => void;

	/**
	 * Disconnect from the kernel and cleanup
	 */
	destroy: () => void;
}

/**
 * Structural check for a kernel handle. Only the members the devtools
 * call are verified so a compatible test double also passes.
 */
export const isConsentKernel = function isConsentKernel(
	value: unknown
): value is ConsentKernel {
	if (!value || typeof value !== 'object') {
		return false;
	}
	const candidate = value as Record<string, unknown>;
	return (
		typeof candidate.getSnapshot === 'function' &&
		typeof candidate.subscribe === 'function' &&
		typeof candidate.set === 'object' &&
		candidate.set !== null &&
		typeof candidate.commands === 'object' &&
		candidate.commands !== null
	);
};

const readWindowKernel = function readWindowKernel(
	namespace: string
): ConsentKernel | null {
	if (typeof window === 'undefined') {
		return null;
	}
	const candidate = (window as unknown as Record<string, unknown>)[namespace];
	return isConsentKernel(candidate) ? candidate : null;
};

/**
 * Creates a connector to a consent kernel
 */
export const createStoreConnector = function createStoreConnector(
	options: StoreConnectorOptions = {}
): StoreConnector {
	const {
		namespace = DEFAULT_KERNEL_NAMESPACE,
		kernel: providedKernel,
		onConnect,
		onStateChange,
		onDisconnect,
	} = options;

	let kernel: ConsentKernel | null = null;
	let unsubscribe: (() => void) | null = null;
	let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
	let reconnectAttempts = 0;
	let hasNotifiedDisconnect = false;
	const listeners = new Set<(snapshot: ConsentSnapshot) => void>();
	const diagnosticsListeners = new Set<
		(diagnostics: ConnectionDiagnostics) => void
	>();
	let diagnostics: ConnectionDiagnostics = {
		disconnectNotified: false,
		isPolling: false,
		lastError: null,
		namespace,
		nextRetryInMs: null,
		reconnectAttempts: 0,
	};
	const INITIAL_RETRY_DELAY_MS = 100;
	const MAX_RETRY_DELAY_MS = 2000;
	const DISCONNECT_NOTIFY_ATTEMPTS = 5;

	const updateDiagnostics = function updateDiagnostics(
		partial: Partial<ConnectionDiagnostics>,
		notify = true
	): void {
		diagnostics = {
			...diagnostics,
			...partial,
		};
		if (!notify) {
			return;
		}
		for (const listener of diagnosticsListeners) {
			listener(diagnostics);
		}
	};

	const clearReconnectTimer = function clearReconnectTimer(): void {
		if (reconnectTimeout) {
			clearTimeout(reconnectTimeout);
			reconnectTimeout = null;
			updateDiagnostics({ isPolling: false, nextRetryInMs: null });
		}
	};

	const resetReconnectState = function resetReconnectState(): void {
		reconnectAttempts = 0;
		hasNotifiedDisconnect = false;
		updateDiagnostics({
			disconnectNotified: false,
			lastError: null,
			nextRetryInMs: null,
			reconnectAttempts: 0,
		});
	};

	const notifyDisconnectedOnce = function notifyDisconnectedOnce(): void {
		if (hasNotifiedDisconnect) {
			return;
		}
		hasNotifiedDisconnect = true;
		updateDiagnostics({ disconnectNotified: true });
		onDisconnect?.();
	};

	/**
	 * Try to connect to the kernel
	 */
	const tryConnect = function tryConnect(): boolean {
		const candidate = providedKernel ?? readWindowKernel(namespace);

		if (candidate) {
			if (kernel === candidate && unsubscribe) {
				return true;
			}

			if (unsubscribe) {
				unsubscribe();
				unsubscribe = null;
			}

			kernel = candidate;

			unsubscribe = kernel.subscribe((snapshot) => {
				onStateChange?.(snapshot);
				for (const listener of listeners) {
					listener(snapshot);
				}
			});

			onConnect?.(kernel.getSnapshot(), kernel);

			clearReconnectTimer();
			resetReconnectState();
			updateDiagnostics({
				lastError: null,
			});

			return true;
		}

		updateDiagnostics({
			lastError:
				typeof window === 'undefined'
					? 'No window available to look the kernel up on'
					: `Kernel "${namespace}" not found on window`,
		});
		return false;
	};

	/**
	 * Start polling for kernel availability
	 */
	const scheduleReconnect = function scheduleReconnect(
		immediate = false
	): void {
		if (kernel || reconnectTimeout) {
			return;
		}

		const delay = immediate
			? 0
			: Math.min(
					INITIAL_RETRY_DELAY_MS * 2 ** Math.min(reconnectAttempts, 5),
					MAX_RETRY_DELAY_MS
				);
		updateDiagnostics({
			isPolling: true,
			nextRetryInMs: delay,
			reconnectAttempts,
		});

		reconnectTimeout = setTimeout(() => {
			reconnectTimeout = null;
			reconnectAttempts += 1;
			updateDiagnostics({
				nextRetryInMs: null,
				reconnectAttempts,
			});
			if (tryConnect()) {
				return;
			}

			if (reconnectAttempts >= DISCONNECT_NOTIFY_ATTEMPTS) {
				notifyDisconnectedOnce();
			}
			scheduleReconnect();
		}, delay);
	};

	const startPolling = function startPolling(): void {
		if (tryConnect()) {
			return;
		}
		scheduleReconnect(true);
	};

	// Start connecting
	startPolling();

	return {
		destroy: () => {
			clearReconnectTimer();

			if (unsubscribe) {
				unsubscribe();
				unsubscribe = null;
			}

			kernel = null;
			listeners.clear();
			diagnosticsListeners.clear();
		},

		getDiagnostics: () => diagnostics,

		getKernel: () => kernel,

		getState: () => kernel?.getSnapshot() ?? null,

		isConnected: () => kernel !== null,

		retryConnection: () => {
			if (kernel) {
				return;
			}
			resetReconnectState();
			scheduleReconnect(true);
		},

		subscribe: (listener) => {
			listeners.add(listener);

			// If already connected, call with current snapshot
			if (kernel) {
				listener(kernel.getSnapshot());
			}

			return () => {
				listeners.delete(listener);
			};
		},

		subscribeDiagnostics: (listener) => {
			diagnosticsListeners.add(listener);
			listener(diagnostics);
			return () => {
				diagnosticsListeners.delete(listener);
			};
		},
	};
};

/**
 * Get the kernel directly from the window object (one-time access)
 */
export const getC15tKernel = function getC15tKernel(
	namespace = DEFAULT_KERNEL_NAMESPACE
): ConsentKernel | null {
	return readWindowKernel(namespace);
};

/**
 * Check if a c15t kernel is exposed on the window
 */
export const isC15tKernelAvailable = function isC15tKernelAvailable(
	namespace = DEFAULT_KERNEL_NAMESPACE
): boolean {
	return getC15tKernel(namespace) !== null;
};
