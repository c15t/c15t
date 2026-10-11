'use client';

/**
 * Loads the trigger toolbar on demand. The single-button trigger becomes a
 * toolbar only while `<ConsentDevTools>` is mounted, so apps without
 * DevTools never download it. The DevTools entry registers the toolbar when
 * it loads, so the swap to a toolbar never waits on a request.
 *
 * @internal
 * @packageDocumentation
 */

import type { TriggerToolbar } from './atoms/toolbar';

/** The toolbar view the trigger renders while DevTools is mounted. */
export type TriggerToolbarComponent = typeof TriggerToolbar;

let loaded: TriggerToolbarComponent | undefined;
let pending: Promise<TriggerToolbarComponent> | undefined;

/**
 * Make the toolbar available synchronously.
 *
 * @param component - The toolbar view.
 * @internal
 */
export const registerTriggerToolbar = function registerTriggerToolbar(
	component: TriggerToolbarComponent
): void {
	loaded = component;
};

/**
 * The toolbar view when it has loaded or been registered.
 *
 * @returns The toolbar view, or `undefined` while it is not loaded.
 * @internal
 */
export const getTriggerToolbar = function getTriggerToolbar():
	| TriggerToolbarComponent
	| undefined {
	return loaded;
};

/**
 * Load the toolbar view. A failed load is not cached, so a later call
 * retries.
 *
 * @returns The toolbar view.
 * @internal
 */
export const loadTriggerToolbar =
	function loadTriggerToolbar(): Promise<TriggerToolbarComponent> {
		if (loaded) {
			return Promise.resolve(loaded);
		}
		pending ??= (async () => {
			try {
				const module = await import('./atoms/toolbar');
				loaded ??= module.TriggerToolbar;
				return loaded;
			} catch (error) {
				pending = undefined;
				throw error;
			}
		})();
		return pending;
	};
