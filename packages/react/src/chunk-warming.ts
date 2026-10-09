/**
 * Chunk-warming registry for the deferred `ConsentDialog`.
 *
 * The aggregate `ConsentDialog` is lazy-loaded and deferred until it can
 * render, so the first open would otherwise wait for its chunk. Surfaces
 * register their lazy import here, and two signals start it early:
 *
 * - Intent: pointerenter or focus on any `ConsentButton` that opens the
 *   dialog, including the stock banner's Customize button.
 * - Idle: once the page has loaded and gone quiet (see
 *   `scheduleIdlePreload`), while the banner is shown or a dialog trigger is
 *   mounted. This covers an immediate tap or focus-and-Enter, which leaves
 *   no lead time for intent warming, without competing with the page's own
 *   images for the connection.
 *
 * Module-level registry keeps banner components decoupled from the
 * aggregate exports (no context change, tree-shakes with the aggregate).
 */

import {
	isIdlePreloadAllowed,
	scheduleIdlePreload,
} from '@c15t/ui/utils/idle-preload';
import { useEffect } from 'react';

import { useUIConfig } from './ui-config-context';

type Warmer = () => void;

/**
 * When the deferred consent dialog starts loading before it opens.
 *
 * - `'idle'`: once the page has loaded and its network has gone quiet, in
 *   browser idle time, while the banner is shown or a button that opens the
 *   dialog is mounted. Also on hover or focus of such a button.
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

type IdleScheduler = typeof scheduleIdlePreload;

let activeGates = 0;
let cancelIdleWarm: (() => void) | undefined;
let scheduleIdle: IdleScheduler = scheduleIdlePreload;

const warmWhenIdle = function warmWhenIdle(): void {
	cancelIdleWarm = undefined;
	// The banner may have closed, or the trigger unmounted, before idle time.
	if (activeGates > 0 && isIdlePreloadAllowed()) {
		warmDialogChunk();
	}
};

const scheduleIdleWarm = function scheduleIdleWarm(): void {
	if (cancelIdleWarm || warmed || !isIdlePreloadAllowed()) {
		return;
	}
	cancelIdleWarm = scheduleIdle(warmWhenIdle);
};

/**
 * Hold an idle-warming gate open while `active`: the dialog loads once the
 * page has loaded and gone quiet, if a gate is still open then.
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
 * @param options - `scheduleIdle` replaces the idle scheduler, so a test can
 * run idle work on demand instead of waiting for the page to go quiet.
 * @internal
 */
export const resetDialogChunkWarmingForTests =
	function resetDialogChunkWarmingForTests(
		options: { scheduleIdle?: IdleScheduler } = {}
	): void {
		warmed = false;
		activeGates = 0;
		cancelIdleWarm?.();
		cancelIdleWarm = undefined;
		scheduleIdle = options.scheduleIdle ?? scheduleIdlePreload;
	};
