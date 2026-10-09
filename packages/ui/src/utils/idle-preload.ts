/**
 * Schedule optional downloads, such as a consent dialog's code, for after the
 * page has finished loading. Framework-agnostic.
 *
 * The `load` event is too early on its own. A single-page app renders its
 * content after its scripts run, so its largest image often starts loading
 * after `load` has fired, and a download started then shares the connection
 * with that image. This waits until the page has also gone quiet: no
 * resource has finished for a while and no image the visitor can see is
 * still loading.
 */

/**
 * How long no resource may finish, with no visible image loading, before the
 * page counts as quiet.
 */
export const IDLE_PRELOAD_QUIET_MS = 1000;

/**
 * The longest wait after `load`. A page that never goes quiet, such as one
 * that polls, still runs the task after this, in idle time.
 */
export const IDLE_PRELOAD_MAX_WAIT_MS = 10_000;

/** How long `requestIdleCallback` may hold the task once the page is quiet. */
const IDLE_CALLBACK_TIMEOUT_MS = 2000;

/** Delay that stands in for an idle period where there is no idle callback. */
const IDLE_FALLBACK_DELAY_MS = 50;

/** How often a page with a loading image is checked again. */
const IMAGE_POLL_MS = 250;

const SLOW_CONNECTIONS = new Set(['slow-2g', '2g']);

interface NetworkInformationLike {
	effectiveType?: string;
	saveData?: boolean;
}

/**
 * Timing knobs for {@link scheduleIdlePreload}. The defaults suit a consent
 * dialog; tests pass smaller values.
 */
export interface IdlePreloadOptions {
	/** See {@link IDLE_PRELOAD_QUIET_MS}. */
	quietMs?: number;
	/** See {@link IDLE_PRELOAD_MAX_WAIT_MS}. */
	maxWaitMs?: number;
}

/**
 * Whether the visitor's connection allows downloads they may never need.
 *
 * Returns `false` on the server, while offline, with Save-Data on, and on
 * 2G-class connections. Downloads started by intent, such as hovering a
 * button, should not check this.
 *
 * @returns `true` when an idle preload may run.
 */
export const isIdlePreloadAllowed = function isIdlePreloadAllowed(): boolean {
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

/**
 * Whether an image the visitor can see is still downloading. Lazy images
 * outside the viewport have not started and do not count.
 */
const isVisibleImageLoading = function isVisibleImageLoading(): boolean {
	for (const image of Array.from(document.images)) {
		if (image.complete) {
			continue;
		}
		if (image.loading !== 'lazy') {
			return true;
		}
		const rect = image.getBoundingClientRect();
		if (
			rect.bottom > 0 &&
			rect.right > 0 &&
			rect.top < window.innerHeight &&
			rect.left < window.innerWidth
		) {
			return true;
		}
	}
	return false;
};

/**
 * Run `task` once the page has loaded and gone quiet, in an idle period.
 *
 * Waits for the window `load` event, then until no resource has finished for
 * `quietMs` and no visible image is still loading, then for an idle callback.
 * After `maxWaitMs` past `load` it stops waiting for quiet. Browsers without
 * `requestIdleCallback`, such as Safari, run the task shortly after the page
 * goes quiet.
 *
 * Does nothing on the server. Callers decide whether the download is wanted;
 * see {@link isIdlePreloadAllowed}.
 *
 * @param task - The download to start.
 * @param options - Timing overrides; see {@link IdlePreloadOptions}.
 * @returns A function that cancels the task if it has not run yet.
 *
 * @example
 * ```ts
 * const cancel = scheduleIdlePreload(() => {
 * 	void import('./dialog');
 * });
 * // The dialog is no longer reachable:
 * cancel();
 * ```
 */
export const scheduleIdlePreload = function scheduleIdlePreload(
	task: () => void,
	options: IdlePreloadOptions = {}
): () => void {
	if (typeof window === 'undefined' || typeof document === 'undefined') {
		return () => undefined;
	}
	const quietMs = options.quietMs ?? IDLE_PRELOAD_QUIET_MS;
	const maxWaitMs = options.maxWaitMs ?? IDLE_PRELOAD_MAX_WAIT_MS;

	let cancelled = false;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let idleHandle: number | undefined;
	let observer: PerformanceObserver | undefined;
	let lastActivity = 0;
	let loadedAt = 0;

	try {
		observer = new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				lastActivity = Math.max(
					lastActivity,
					(entry as PerformanceResourceTiming).responseEnd
				);
			}
		});
		observer.observe({ buffered: true, type: 'resource' });
	} catch {
		// No resource timing: quiet means no visible image loading.
		observer = undefined;
	}

	const stopObserving = () => {
		observer?.disconnect();
		observer = undefined;
	};

	const run = () => {
		if (cancelled) {
			return;
		}
		cancelled = true;
		task();
	};

	const runWhenIdle = () => {
		stopObserving();
		if (typeof window.requestIdleCallback === 'function') {
			idleHandle = window.requestIdleCallback(run, {
				timeout: IDLE_CALLBACK_TIMEOUT_MS,
			});
		} else {
			timer = setTimeout(run, IDLE_FALLBACK_DELAY_MS);
		}
	};

	const check = () => {
		timer = undefined;
		if (cancelled) {
			return;
		}
		const now = performance.now();
		if (now - loadedAt >= maxWaitMs) {
			runWhenIdle();
			return;
		}
		if (isVisibleImageLoading()) {
			timer = setTimeout(check, IMAGE_POLL_MS);
			return;
		}
		const quietFor = now - Math.max(lastActivity, loadedAt);
		if (quietFor < quietMs) {
			timer = setTimeout(check, quietMs - quietFor);
			return;
		}
		runWhenIdle();
	};

	const afterLoad = () => {
		if (cancelled) {
			return;
		}
		loadedAt = performance.now();
		timer = setTimeout(check, quietMs);
	};

	if (document.readyState === 'complete') {
		afterLoad();
	} else {
		window.addEventListener('load', afterLoad, { once: true });
	}

	return () => {
		if (cancelled) {
			return;
		}
		cancelled = true;
		window.removeEventListener('load', afterLoad);
		stopObserving();
		if (timer !== undefined) {
			clearTimeout(timer);
		}
		if (
			idleHandle !== undefined &&
			typeof window.cancelIdleCallback === 'function'
		) {
			window.cancelIdleCallback(idleHandle);
		}
	};
};
