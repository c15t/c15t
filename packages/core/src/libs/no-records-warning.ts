// Typed here so core needs no Node types. TypeScript erases it, leaving the
// expression bundlers look for.
declare const process: { env: { NODE_ENV?: string } };

/**
 * Set on `globalThis` once a page has shown the warning, so two copies of
 * c15t on one page warn once.
 */
const WARNED = Symbol.for('c15t.noRecordsWarned');

/**
 * What offline mode logs once per page until `acknowledgeNoRecords` is set.
 *
 * @internal
 */
export const NO_RECORDS_WARNING =
	'[c15t] Offline mode keeps consent only in this browser. c15t keeps no server-side record of consent. Offline mode also has no geolocation, so every visitor gets the same policy. Use it for development and tests. For production, see https://c15t.com/docs/concepts/modes\nSet acknowledgeNoRecords: true to hide this message.';

/**
 * Whether this is a production build.
 *
 * Bundlers replace the literal `process.env.NODE_ENV` at build time, so a
 * production build skips the warning even in the browser, which has no
 * `process`. Without a bundler and without `process`, the read throws and
 * counts as development.
 */
function isProductionBuild(): boolean {
	try {
		return process.env.NODE_ENV === 'production';
	} catch {
		return false;
	}
}

/**
 * Warn once per page that offline mode keeps no consent records.
 *
 * Logs {@link NO_RECORDS_WARNING} with `console.warn` in the browser in
 * development builds. Stays silent on the server, in production builds, and
 * when the app sets `acknowledgeNoRecords: true`. It never throws, so it
 * cannot block consent.
 *
 * @param acknowledged - The offline mode's `acknowledgeNoRecords` option.
 *
 * @internal
 */
export function warnOfflineModeKeepsNoRecords(
	acknowledged: boolean | undefined
): void {
	if (
		acknowledged === true ||
		typeof window === 'undefined' ||
		isProductionBuild()
	) {
		return;
	}
	const store = globalThis as { [WARNED]?: true };
	if (store[WARNED]) {
		return;
	}
	store[WARNED] = true;
	console.warn(NO_RECORDS_WARNING);
}
