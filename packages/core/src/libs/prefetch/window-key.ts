/**
 * Window property where `buildPrefetchScript()` stores its in-flight init
 * requests. In its own module so a caller can tell whether one exists
 * without loading the prefetch reader.
 *
 * @internal
 */
export const PREFETCH_WINDOW_KEY = '__c15tInitialDataPromises';

/**
 * Whether an inline prefetch script stored any init request on `window`.
 *
 * @returns `true` in a browser with at least one stored request.
 * @internal
 */
export const hasPrefetchedInitialData =
	function hasPrefetchedInitialData(): boolean {
		if (typeof window === 'undefined') {
			return false;
		}
		const entries = (window as unknown as Record<string, unknown>)[
			PREFETCH_WINDOW_KEY
		];
		return (
			typeof entries === 'object' &&
			entries !== null &&
			Object.keys(entries).length > 0
		);
	};
