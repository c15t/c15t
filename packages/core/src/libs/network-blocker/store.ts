import type { ConsentStoreState } from '../../store/type';
import type { ConsentState } from '../../types';
import { shouldBlockRequest } from './core';
import type { BlockedRequestInfo, NetworkBlockerConfig } from './types';

type SetState = (partial: Partial<ConsentStoreState>) => void;
type GetState = () => ConsentStoreState;
type XhrOpen = XMLHttpRequest['open'];
type XhrSend = XMLHttpRequest['send'];

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
export function createNetworkBlockerManager(get: GetState, _set: SetState) {
	let originalFetch: typeof fetch | null = null;
	let originalXhrOpen: XhrOpen | null = null;
	let originalXhrSend: XhrSend | null = null;

	let isInitialized = false;
	let blockingConsents: ConsentState | null = null;

	const notifyBlockedRequest = (
		config: NetworkBlockerConfig | undefined,
		info: BlockedRequestInfo
	) => {
		if (!config) {
			return;
		}

		if (config.logBlockedRequests !== false) {
			const ruleId = info.rule?.id ?? 'unknown';

			console.warn('[c15t] Network request blocked by consent manager', {
				method: info.method,
				url: info.url,
				ruleId,
			});
		}

		if (config.onRequestBlocked) {
			config.onRequestBlocked(info);
		}
	};

	const getBlockingConsents = (): ConsentState => {
		if (blockingConsents) {
			return blockingConsents;
		}

		return get().consents;
	};

	const patchFetch = () => {
		if (typeof window === 'undefined') {
			return;
		}

		const hasFetch = typeof window.fetch === 'function';

		if (!hasFetch) {
			return;
		}

		if (originalFetch) {
			return;
		}

		originalFetch = window.fetch;

		window.fetch = ((
			input: RequestInfo | URL,
			init?: RequestInit
		): Promise<Response> => {
			const state = get();
			const config = state.networkBlocker;

			if (!originalFetch) {
				throw new Error('Network blocker fetch wrapper not initialized.');
			}

			const hasRules =
				config?.enabled && config?.rules && config?.rules.length > 0;

			if (!hasRules) {
				return originalFetch.call(window, input, init);
			}

			let method = 'GET';

			if (init?.method) {
				method = init.method;
			} else if (input instanceof Request) {
				method = input.method;
			}

			let url: string;

			if (typeof input === 'string' || input instanceof URL) {
				url = input.toString();
			} else {
				url = input.url;
			}

			const consents = getBlockingConsents();

			const { shouldBlock, rule } = shouldBlockRequest(
				{
					url,
					method,
				},
				consents,
				config
			);

			if (shouldBlock) {
				notifyBlockedRequest(config, {
					method,
					url,
					rule,
				});

				const blockedResponse = new Response(null, {
					status: 451,
					statusText: 'Request blocked by consent manager',
				});

				return Promise.resolve(blockedResponse);
			}

			return originalFetch.call(window, input, init);
		}) as typeof window.fetch;
	};

	const patchXmlHttpRequest = () => {
		if (typeof window === 'undefined') {
			return;
		}

		const hasXhr =
			typeof window.XMLHttpRequest !== 'undefined' &&
			typeof window.XMLHttpRequest.prototype.open === 'function' &&
			typeof window.XMLHttpRequest.prototype.send === 'function';

		if (!hasXhr) {
			return;
		}

		if (originalXhrOpen || originalXhrSend) {
			return;
		}

		originalXhrOpen = window.XMLHttpRequest.prototype.open;
		originalXhrSend = window.XMLHttpRequest.prototype.send;

		window.XMLHttpRequest.prototype.open = function (
			method: string,
			url: string,
			async?: boolean,
			user?: string | null,
			password?: string | null
		) {
			const internal = this as unknown as {
				__c15tMethod?: string;
				__c15tUrl?: string;
			};

			internal.__c15tMethod = method;
			internal.__c15tUrl = url;

			if (!originalXhrOpen) {
				throw new Error('Network blocker XHR open wrapper not initialized.');
			}

			return originalXhrOpen.call(
				this,
				method,
				url,
				async ?? true,
				user,
				password
			);
		};

		window.XMLHttpRequest.prototype.send = function (
			body?: Document | XMLHttpRequestBodyInit | null
		) {
			const state = get();
			const config = state.networkBlocker;

			const isEnabled = config?.enabled !== false;
			const hasRules = isEnabled && config?.rules && config?.rules.length > 0;

			if (hasRules) {
				const internal = this as unknown as {
					__c15tMethod?: string;
					__c15tUrl?: string;
				};

				const method = internal.__c15tMethod || 'GET';
				const url = internal.__c15tUrl || '';
				const consents = getBlockingConsents();

				const { shouldBlock, rule } = shouldBlockRequest(
					{
						url,
						method,
					},
					consents,
					config
				);

				if (shouldBlock) {
					notifyBlockedRequest(config, {
						method,
						url,
						rule,
					});

					try {
						this.abort();
					} catch {
						// Ignore abort errors
					}

					const progressEvent = new ProgressEvent('error');

					if (typeof this.onerror === 'function') {
						this.onerror(progressEvent);
					}

					this.dispatchEvent(progressEvent);
					return;
				}
			}

			if (!originalXhrSend) {
				throw new Error('Network blocker XHR send wrapper not initialized.');
			}

			return originalXhrSend.call(this, body);
		};
	};

	return {
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
		initializeNetworkBlocker: () => {
			if (isInitialized) {
				return;
			}

			if (typeof window === 'undefined') {
				return;
			}

			const state = get();
			const config = state.networkBlocker;

			const hasRules =
				config?.enabled && config?.rules && config?.rules.length > 0;

			if (!hasRules) {
				return;
			}

			blockingConsents = state.consents;

			patchFetch();
			patchXmlHttpRequest();

			isInitialized = true;
		},

		/**
		 * Updates the consent snapshot used by the network blocker.
		 * Intended to be called after script teardown has completed so that
		 * teardown network calls are not blocked.
		 */
		updateNetworkBlockerConsents: () => {
			if (!isInitialized) {
				return;
			}

			blockingConsents = get().consents;
		},

		/**
		 * Updates the network blocker configuration at runtime.
		 * When enabling the blocker, this will initialize it if needed.
		 * When disabling, this will restore the original browser APIs.
		 *
		 * @param config - New network blocker configuration to apply
		 */
		setNetworkBlocker: (config: ConsentStoreState['networkBlocker']) => {
			const isEnabled = config?.enabled !== false;
			const shouldEnable =
				isEnabled && config?.rules && config?.rules.length > 0;

			const partial: Partial<ConsentStoreState> = { networkBlocker: config };

			_set(partial);

			if (!shouldEnable) {
				if (!isInitialized) {
					return;
				}

				if (typeof window === 'undefined') {
					return;
				}

				if (originalFetch) {
					window.fetch = originalFetch;
					originalFetch = null;
				}

				if (originalXhrOpen && originalXhrSend) {
					window.XMLHttpRequest.prototype.open = originalXhrOpen;
					window.XMLHttpRequest.prototype.send = originalXhrSend;
					originalXhrOpen = null;
					originalXhrSend = null;
				}

				blockingConsents = null;
				isInitialized = false;
				return;
			}

			if (!isInitialized) {
				blockingConsents = get().consents;
				patchFetch();
				patchXmlHttpRequest();
				isInitialized = true;
			}
		},

		/**
		 * Destroys the network blocker and restores the original browser APIs.
		 *
		 * @remarks
		 * Restores the original `fetch` and `XMLHttpRequest` implementations
		 * and clears the internal consent snapshot. Safe to call multiple
		 * times and in non-browser environments.
		 */
		destroyNetworkBlocker: () => {
			if (!isInitialized) {
				return;
			}

			if (typeof window === 'undefined') {
				return;
			}

			if (originalFetch) {
				window.fetch = originalFetch;
				originalFetch = null;
			}

			if (originalXhrOpen && originalXhrSend) {
				window.XMLHttpRequest.prototype.open = originalXhrOpen;
				window.XMLHttpRequest.prototype.send = originalXhrSend;
				originalXhrOpen = null;
				originalXhrSend = null;
			}

			blockingConsents = null;
			isInitialized = false;
		},
	};
}
