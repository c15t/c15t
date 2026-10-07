/** Wait for a browser event or timeout, cancelling every registered callback. */
const waitForStage = function waitForStage(
	signal: AbortSignal,
	subscribe: (ready: () => void) => () => void,
	timeout?: number
): Promise<boolean> {
	return new Promise((resolve) => {
		if (signal.aborted) {
			resolve(false);
			return;
		}
		let cleanup = () => {
			// Subscription is not installed yet.
		};
		let timer: ReturnType<typeof setTimeout> | undefined;
		const finish = () => {
			cleanup();
			clearTimeout(timer);
			signal.removeEventListener('abort', finish);
			resolve(!signal.aborted);
		};
		signal.addEventListener('abort', finish, { once: true });
		cleanup = subscribe(finish);
		if (timeout !== undefined) {
			timer = setTimeout(finish, timeout);
		}
	});
};

/** Wait for contentful paint, with a fallback for background tabs.
 * @internal
 */
export const waitForReplayPaint = function waitForReplayPaint(
	signal: AbortSignal
): Promise<boolean> {
	if (
		typeof performance.getEntriesByName === 'function' &&
		performance.getEntriesByName('first-contentful-paint').length > 0
	) {
		return Promise.resolve(!signal.aborted);
	}
	return waitForStage(
		signal,
		(ready) => {
			if (typeof PerformanceObserver === 'undefined') {
				return () => {
					// No observer is available to clean up.
				};
			}
			const observer = new PerformanceObserver((entries) => {
				if (entries.getEntriesByName('first-contentful-paint').length > 0) {
					ready();
				}
			});
			try {
				observer.observe({ buffered: true, type: 'paint' });
			} catch {
				observer.disconnect();
			}
			return () => observer.disconnect();
		},
		2000
	);
};

/** Wait until the page has loaded before taking a DOM snapshot.
 * @internal
 */
export const waitForReplayLoad = function waitForReplayLoad(
	signal: AbortSignal
): Promise<boolean> {
	if (document.readyState === 'complete') {
		return Promise.resolve(!signal.aborted);
	}
	return waitForStage(signal, (ready) => {
		window.addEventListener('load', ready, { once: true });
		return () => window.removeEventListener('load', ready);
	});
};

/** Schedule recorder setup when the browser is idle.
 * @internal
 */
export const waitForReplayIdle = function waitForReplayIdle(
	signal: AbortSignal
): Promise<boolean> {
	return waitForStage(signal, (ready) => {
		if (typeof window.requestIdleCallback === 'function') {
			const handle = window.requestIdleCallback(ready, { timeout: 1000 });
			return () => window.cancelIdleCallback(handle);
		}
		const handle = setTimeout(ready, 0);
		return () => clearTimeout(handle);
	});
};
