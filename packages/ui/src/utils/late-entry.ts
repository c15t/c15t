/**
 * Whether a consent surface is arriving into a page that has already
 * painted. Framework-agnostic.
 */

/**
 * How long after the first contentful paint a banner still counts as part
 * of it. Two changes within about 100ms read as one.
 */
export const LATE_ENTRY_THRESHOLD_MS = 100;

/**
 * Whether a banner mounting now arrives after the page has painted.
 *
 * A banner that shows with the first paint is part of the page, so it
 * appears at once. One that mounts later, such as after a slow script or a
 * client-side init, would pop into a page someone is already reading, so
 * it fades in. Adapters mark that mount with `data-entry="late"`.
 *
 * Returns `false` on the server, before the first contentful paint, and in
 * browsers without paint timing.
 *
 * @param now - The current time on the performance timeline. Defaults to
 * `performance.now()`.
 * @returns `true` when the first contentful paint happened more than
 * {@link LATE_ENTRY_THRESHOLD_MS} ago.
 *
 * @example
 * ```ts
 * if (isLateEntry()) {
 * 	banner.setAttribute('data-entry', 'late');
 * }
 * ```
 */
export const isLateEntry = function isLateEntry(now?: number): boolean {
	if (
		typeof performance === 'undefined' ||
		typeof performance.getEntriesByType !== 'function'
	) {
		return false;
	}
	const paint = performance
		.getEntriesByType('paint')
		.find((entry) => entry.name === 'first-contentful-paint');
	if (!paint) {
		return false;
	}
	return (now ?? performance.now()) - paint.startTime > LATE_ENTRY_THRESHOLD_MS;
};
