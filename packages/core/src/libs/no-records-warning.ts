import { isProductionBuild } from './is-production';

/**
 * Set on `globalThis` once a page has shown the warning, so two copies of
 * c15t on one page, such as a framework bundle and a script tag, warn once.
 */
const WARNED = Symbol.for('c15t.noRecordsWarned');

/** What local mode logs once per page until `acknowledgeNoRecords` is set. */
export const NO_RECORDS_WARNING =
	'[c15t] Local mode keeps consent only in this browser. c15t keeps no server-side record of consent. Local mode also has no geolocation, so every visitor gets the same policy. Use it for development and tests. For production, see https://c15t.com/docs/concepts/modes\nSet acknowledgeNoRecords: true to hide this message.';

/**
 * Log {@link NO_RECORDS_WARNING} once per page. Stays silent on the server,
 * where there is no page to warn once for.
 *
 * Callers decide when it applies: framework packages in development builds,
 * and the script tag on development hosts, since its file is always a
 * production build.
 *
 * @internal
 */
export const warnNoConsentRecords = function warnNoConsentRecords(): void {
	if (typeof window === 'undefined') {
		return;
	}
	const store = globalThis as { [WARNED]?: true };
	if (store[WARNED]) {
		return;
	}
	store[WARNED] = true;
	console.warn(NO_RECORDS_WARNING);
};

/**
 * Warn that local mode keeps no consent records, in development builds,
 * unless the app set `acknowledgeNoRecords`.
 *
 * @param acknowledged - The mode's `acknowledgeNoRecords`.
 * @internal
 */
export const warnNoConsentRecordsInDevelopment =
	function warnNoConsentRecordsInDevelopment(
		acknowledged: boolean | undefined
	): void {
		if (acknowledged === true || isProductionBuild()) {
			return;
		}
		warnNoConsentRecords();
	};
