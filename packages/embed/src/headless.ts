/**
 * Headless API for the embed script.
 *
 * Provides `window.c15tReady` — a Promise that resolves with the Zustand
 * store once the runtime is initialized. This is the recommended way to
 * interact with c15t from plain JavaScript.
 *
 * @example
 * ```html
 * <script src="c15t.js" data-backend="..." data-headless="true"></script>
 * <script>
 *   // Wait for the runtime to initialize
 *   const store = await window.c15tReady;
 *
 *   // Read consent state
 *   console.log(store.getState().consents);
 *
 *   // Subscribe to changes
 *   store.subscribe((state) => console.log(state.consents));
 *
 *   // Save consent
 *   store.getState().saveConsents('all');
 *
 *   // Show UI
 *   store.getState().setActiveUI('dialog');
 * </script>
 * ```
 */

import type { ConsentRuntimeResult } from 'c15t/runtime';

type ConsentStore = ConsentRuntimeResult['consentStore'];

let resolveReady: ((store: ConsentStore) => void) | null = null;

/**
 * Creates `window.c15tReady` — a Promise that resolves once the consent
 * runtime has initialized (i.e. the /init response has been processed).
 *
 * If the store is already initialized when called, resolves immediately.
 */
export function setupReadyPromise(store: ConsentStore): void {
	// Create the promise on window immediately so scripts can await it
	const promise = new Promise<ConsentStore>((resolve) => {
		resolveReady = resolve;
	});

	// biome-ignore lint/suspicious/noExplicitAny: extending window
	(window as any).c15tReady = promise;

	// Check if already initialized
	const state = store.getState();
	if (state.consentInfo !== null) {
		resolveReady?.(store);
		resolveReady = null;
		return;
	}

	// Subscribe and resolve when init completes
	const unsub = store.subscribe((state) => {
		if (state.consentInfo !== null && resolveReady) {
			resolveReady(store);
			resolveReady = null;
			unsub();
		}
	});
}
