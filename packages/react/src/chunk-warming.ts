/**
 * Chunk-warming registry for the deferred `ConsentDialog`.
 *
 * The aggregate `ConsentDialog` is lazy-loaded and deferred until it can
 * render, so the first open would otherwise wait for its chunk. Surfaces
 * register their lazy import here, and two signals start it early:
 *
 * - Intent: pointerenter or focus on any `ConsentButton` that opens the
 *   dialog, including the stock banner's Customize button.
 * - Idle: once the page has loaded and the browser is idle, while the banner
 *   is shown or a dialog trigger is mounted. This covers an immediate tap or
 *   focus-and-Enter, which leaves no lead time for intent warming.
 *
 * Module-level registry keeps banner components decoupled from the
 * aggregate exports (no context change, tree-shakes with the aggregate).
 */

import { useEffect } from 'react';

import { useUIConfig } from './ui-config-context';

type Warmer = () => void;

/**
 * When the deferred consent dialog starts loading before it opens.
 *
 * - `'idle'`: after the page's load event, in browser idle time, while the
 *   banner is shown or a button that opens the dialog is mounted. Also on
 *   hover or focus of such a button.
 * - `'intent'`: only on hover or focus of a button that opens the dialog.
 *
 * @public
 */
export type DialogPreload = 'idle' | 'intent';

const warmers = new Set<Warmer>();
let warmed = false;

/** Register a lazy chunk's import trigger. Returns an unregister fn. */
export const registerDialogChunkWarmer = function registerDialogChunkWarmer(
	warmer: Warmer
): () => void {
	warmers.add(warmer);
	if (warmed) {
		warmer();
	}
	return () => {
		warmers.delete(warmer);
	};
};

/**
 * Fire every registered warmer. Warmers share one in-flight import, so
 * repeated calls are cheap, and a call after a failed import retries it.
 */
export const warmDialogChunk = function warmDialogChunk(): void {
	warmed = true;
	for (const warmer of warmers) {
		warmer();
	}
};

interface NetworkInformationLike {
	effectiveType?: string;
	saveData?: boolean;
}

const SLOW_CONNECTIONS = new Set(['slow-2g', '2g']);
// Safari has no requestIdleCallback; a short delay after load stands in.
const IDLE_FALLBACK_DELAY_MS = 200;

/**
 * Idle warming spends bytes the visitor may never need, so it stays off when
 * they asked to save data, on 2G-class connections, and while offline.
 * Intent warming is unaffected.
 */
const idleWarmingAllowed = function idleWarmingAllowed(): boolean {
	if (typeof navigator === 'undefined' || navigator.onLine === false) {
		return false;
	}
	const { connection } = navigator as Navigator & {
		connection?: NetworkInformationLike;
	};
	if (connection?.saveData === true) {
		return false;
	}
	return !SLOW_CONNECTIONS.has(connection?.effectiveType ?? '');
};

let activeGates = 0;
let idleScheduled = false;

const warmWhenIdle = function warmWhenIdle(): void {
	idleScheduled = false;
	// The banner may have closed, or the trigger unmounted, before idle time.
	if (activeGates > 0 && idleWarmingAllowed()) {
		warmDialogChunk();
	}
};

const scheduleIdleWarm = function scheduleIdleWarm(): void {
	if (idleScheduled || warmed || !idleWarmingAllowed()) {
		return;
	}
	idleScheduled = true;
	const afterLoad = () => {
		if (typeof window.requestIdleCallback === 'function') {
			window.requestIdleCallback(warmWhenIdle);
		} else {
			window.setTimeout(warmWhenIdle, IDLE_FALLBACK_DELAY_MS);
		}
	};
	if (document.readyState === 'complete') {
		afterLoad();
	} else {
		window.addEventListener('load', afterLoad, { once: true });
	}
};

/**
 * Hold an idle-warming gate open while `active`: the dialog loads in the next
 * idle period after the page's load event, if a gate is still open then.
 * Consumers opt out with `preloadDialog: 'intent'`.
 *
 * @param active - Whether the dialog can be opened soon from this component,
 * for example because the banner is shown or a trigger is mounted.
 * @internal
 */
export const useIdleDialogWarming = function useIdleDialogWarming(
	active: boolean
): void {
	const { preloadDialog = 'idle' } = useUIConfig();
	const enabled = active && preloadDialog === 'idle';
	useEffect(() => {
		if (!enabled) {
			return;
		}
		activeGates += 1;
		scheduleIdleWarm();
		return () => {
			activeGates -= 1;
		};
	}, [enabled]);
};

/**
 * Reset module state between tests.
 *
 * @internal
 */
export const resetDialogChunkWarmingForTests =
	function resetDialogChunkWarmingForTests(): void {
		warmed = false;
		activeGates = 0;
		idleScheduled = false;
	};
