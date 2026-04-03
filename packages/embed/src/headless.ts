/**
 * Headless convenience API — mounted on `window.c15tStore.c15t` alongside
 * the existing Zustand store that core already places on `window.c15tStore`.
 *
 * The raw Zustand store (`window.c15tStore.getState()`, `.subscribe()`) is
 * always available. This module adds a simpler event-based layer for embed
 * users who don't want to deal with Zustand directly.
 *
 * @example
 * ```html
 * <script src="c15t.js" data-backend="..." data-headless="true"></script>
 * <script>
 *   // Raw store (always available — set by c15t core):
 *   const state = window.c15tStore.getState();
 *   state.saveConsents('all');
 *
 *   // Convenience API (added by embed):
 *   window.c15tStore.c15t.on('consent', (consents) => { ... });
 * </script>
 * ```
 */

import type { ConsentRuntimeResult } from 'c15t';

type ConsentStore = ConsentRuntimeResult['consentStore'];
type Listener = (...args: unknown[]) => void;

export interface C15tEmbedAPI {
	/**
	 * Subscribe to events.
	 * - `'ready'` — runtime initialized, consent state available
	 * - `'consent'` — consent state changed
	 */
	on(event: 'ready' | 'consent', callback: Listener): () => void;

	/** Get consent categories with their display metadata */
	getCategories(): Array<{
		name: string;
		title: string;
		description: string;
		disabled: boolean;
	}>;
}

/**
 * Creates the embed convenience API and attaches it to the existing store
 * as `store.c15t`. Does NOT overwrite `window.c15tStore`.
 */
export function attachEmbedAPI(store: ConsentStore): C15tEmbedAPI {
	const listeners: Record<string, Set<Listener>> = {
		ready: new Set(),
		consent: new Set(),
	};

	let readyFired = false;

	// Subscribe to store changes for event dispatching
	store.subscribe((state, prevState) => {
		// Fire ready once when init completes
		if (!readyFired && state.consentInfo !== null) {
			readyFired = true;
			for (const cb of listeners.ready) {
				try {
					cb(state.consents);
				} catch (_e) {
					/* user callback error */
				}
			}
		}

		// Fire consent change
		if (state.consents !== prevState.consents) {
			for (const cb of listeners.consent) {
				try {
					cb(state.consents);
				} catch (_e) {
					/* user callback error */
				}
			}
		}
	});

	const api: C15tEmbedAPI = {
		on(event, callback) {
			const set = listeners[event];
			if (!set) return () => {};

			set.add(callback);

			// If subscribing to 'ready' after it already fired, call immediately
			if (event === 'ready' && readyFired) {
				try {
					callback(store.getState().consents);
				} catch (_e) {
					/* user callback error */
				}
			}

			return () => {
				set.delete(callback);
			};
		},

		getCategories() {
			const state = store.getState();
			return state.consentTypes.map((ct) => ({
				name: ct.name,
				title: ct.title ?? ct.name,
				description: ct.description ?? '',
				disabled: ct.disabled ?? false,
			}));
		},
	};

	// Attach to the existing store object (don't overwrite it)
	// biome-ignore lint/suspicious/noExplicitAny: extending the store object
	(store as any).c15t = api;

	return api;
}
