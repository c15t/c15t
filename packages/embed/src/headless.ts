/**
 * Headless API — exposed on `window.c15tStoreStore` for custom builders.
 *
 * Provides a simple imperative API over the consent runtime store
 * for developers who want to build their own consent UI (like Zed).
 *
 * @example
 * ```html
 * <script src="c15t.js" data-backend="..." data-headless="true"></script>
 * <script>
 *   window.c15tStore.on('ready', (state) => {
 *     console.log('Categories:', window.c15tStore.getCategories());
 *     // Build your own UI here
 *   });
 *
 *   // Later, when user consents:
 *   window.c15tStore.saveConsents('all');
 * </script>
 * ```
 */

import type { ConsentRuntimeResult } from 'c15t';

type ConsentStore = ConsentRuntimeResult['consentStore'];
type Listener = (...args: unknown[]) => void;

export interface C15tHeadlessAPI {
	/** Get current saved consent state */
	getConsents(): Record<string, boolean>;

	/** Get available consent categories with their metadata */
	getCategories(): Array<{
		name: string;
		title: string;
		description: string;
		disabled: boolean;
	}>;

	/**
	 * Save consent preferences.
	 * - `'all'` — enable all consents
	 * - `'necessary'` — only necessary consents
	 * - `'custom'` + preferences object — specific choices
	 */
	saveConsents(
		type: 'all' | 'necessary' | 'custom',
		preferences?: Record<string, boolean>
	): void;

	/** Show the consent banner */
	showBanner(): void;

	/** Show the consent dialog (preferences) */
	showDialog(): void;

	/** Hide all consent UI */
	hideUI(): void;

	/**
	 * Subscribe to events.
	 * - `'ready'` — runtime initialized, consent state available
	 * - `'consent'` — consent state changed
	 */
	on(event: 'ready' | 'consent', callback: Listener): () => void;
}

declare global {
	interface Window {
		c15tStore?: C15tHeadlessAPI;
	}
}

export function createHeadlessAPI(store: ConsentStore): C15tHeadlessAPI {
	const listeners: Record<string, Set<Listener>> = {
		ready: new Set(),
		consent: new Set(),
	};

	let readyFired = false;

	// Subscribe to consent changes
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

	const api: C15tHeadlessAPI = {
		getConsents() {
			return { ...store.getState().consents };
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

		saveConsents(type, preferences) {
			const state = store.getState();
			if (type === 'custom' && preferences) {
				// Set each preference before saving
				for (const [name, value] of Object.entries(preferences)) {
					state.setSelectedConsent(
						name as Parameters<typeof state.setSelectedConsent>[0],
						value
					);
				}
				state.saveConsents('custom');
			} else {
				state.saveConsents(type as 'all' | 'necessary');
			}
		},

		showBanner() {
			store.getState().setActiveUI('banner', { force: true });
		},

		showDialog() {
			store.getState().setActiveUI('dialog');
		},

		hideUI() {
			store.getState().setActiveUI('none');
		},

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
	};

	return api;
}

/**
 * Mount the headless API on `window.c15tStore`.
 */
export function mountHeadlessAPI(store: ConsentStore): C15tHeadlessAPI {
	const api = createHeadlessAPI(store);
	window.c15tStore = api;
	return api;
}
