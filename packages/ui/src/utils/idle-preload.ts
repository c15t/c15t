/**
 * Schedule optional downloads, such as a consent dialog's code, for after the
 * page has finished loading. Framework-agnostic.
 *
 * The `load` event is too early on its own. A single-page app renders its
 * content after its scripts run, so its largest image often starts loading
 * after `load` has fired, and a download started then shares the connection
 * with that image. This waits until the page has also gone quiet: no
 * resource has finished and no largest-contentful-paint candidate has
 * painted for a while, and no `<img>` the visitor can see is still loading.
 *
 * Browsers report a resource only once it has finished, so a request still
 * in flight is visible only as an incomplete `<img>`. A CSS
 * `background-image` or SVG `<image>` that is still downloading cannot be
 * seen; it restarts the wait only when it finishes or paints, which may be
 * after the task has started. The maximum wait bounds every case.
 */

/**
 * How long no resource may finish and no LCP candidate may paint, with no
 * visible image loading, before the page counts as quiet.
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
 * Whether an `<img>` the visitor can see is still downloading. Images outside
 * the viewport, or not rendered, do not count: they are not the page's
 * largest paint, and lazy ones among them have not started.
 */
const isVisibleImageLoading = function isVisibleImageLoading(): boolean {
	// `document.images` is live: every check sees images added since the last.
	for (const image of Array.from(document.images)) {
		if (image.complete || image.getClientRects().length === 0) {
			continue;
		}
		// Inclusive edges: an image without set dimensions is 0x0 until its
		// size arrives, and a hero at the top of the page sits on edge 0.
		const rect = image.getBoundingClientRect();
		if (
			rect.bottom >= 0 &&
			rect.right >= 0 &&
			rect.top <= window.innerHeight &&
			rect.left <= window.innerWidth
		) {
			return true;
		}
	}
	return false;
};

/** Entry types whose arrival restarts the quiet window. */
const ACTIVITY_ENTRY_TYPES = ['resource', 'largest-contentful-paint'] as const;

/** When an entry shows the page was last busy. */
const activityTime = function activityTime(entry: PerformanceEntry): number {
	// Resources count when they finish; LCP candidates when they paint.
	return 'responseEnd' in entry
		? (entry as PerformanceResourceTiming).responseEnd
		: entry.startTime;
};

/**
 * Run `task` once the page has loaded and gone quiet, in an idle period.
 *
 * Waits for the window `load` event, then until no resource has finished and
 * no LCP candidate has painted for `quietMs` and no visible image is still
 * loading, then for an idle callback. If the page is busy again when the
 * idle callback fires, it waits for quiet again. After `maxWaitMs` past
 * `load` it stops waiting for quiet. Browsers without `requestIdleCallback`,
 * such as Safari, run the task shortly after the page goes quiet.
 *
 * A CSS background or SVG image still downloading is not seen; see the
 * module comment.
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
				lastActivity = Math.max(lastActivity, activityTime(entry));
			}
		});
		const supported = PerformanceObserver.supportedEntryTypes ?? ['resource'];
		for (const type of ACTIVITY_ENTRY_TYPES) {
			if (supported.includes(type)) {
				observer.observe({ buffered: true, type });
			}
		}
	} catch {
		// No resource timing: quiet means no visible image loading.
		observer = undefined;
	}

	const stopObserving = () => {
		observer?.disconnect();
		observer = undefined;
	};

	/** How much longer to wait for quiet, or 0 once the page is quiet. */
	const remainingWait = (now: number): number => {
		if (now - loadedAt >= maxWaitMs) {
			return 0;
		}
		if (isVisibleImageLoading()) {
			return IMAGE_POLL_MS;
		}
		const quietFor = now - Math.max(lastActivity, loadedAt);
		return quietFor < quietMs ? quietMs - quietFor : 0;
	};

	/**
	 * Check again in `wait` ms, or run once quiet. A check from an idle
	 * callback runs the task; any other schedules one. The page may start an
	 * image while the task waits for an idle period, such as a single-page
	 * app rendering its content, so the idle check looks again first.
	 */
	const check = (idle: boolean) => {
		timer = undefined;
		idleHandle = undefined;
		if (cancelled) {
			return;
		}
		const wait = remainingWait(performance.now());
		if (wait > 0) {
			timer = setTimeout(() => check(false), wait);
			return;
		}
		if (!idle) {
			if (typeof window.requestIdleCallback === 'function') {
				idleHandle = window.requestIdleCallback(() => check(true), {
					timeout: IDLE_CALLBACK_TIMEOUT_MS,
				});
			} else {
				timer = setTimeout(() => check(true), IDLE_FALLBACK_DELAY_MS);
			}
			return;
		}
		cancelled = true;
		stopObserving();
		task();
	};

	const afterLoad = () => {
		if (cancelled) {
			return;
		}
		loadedAt = performance.now();
		timer = setTimeout(() => check(false), quietMs);
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
