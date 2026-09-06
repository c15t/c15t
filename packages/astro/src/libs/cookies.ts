/**
 * Cookie helpers for the server-side consent fetches.
 */

/**
 * Keeps only the named cookies from a `Cookie` request header.
 *
 * The server-side `/init` call replays the visitor's cookies at the consent
 * backend. Replaying the whole header would hand a third-party host every
 * session and auth cookie the site owns, so only the consent cookie travels.
 *
 * @param cookieHeader - The incoming `Cookie` header value.
 * @param names - Cookie names to keep.
 * @returns The filtered header, or `undefined` when nothing remains.
 */
export const filterCookieHeader = function filterCookieHeader(
	cookieHeader: string,
	names: readonly string[]
): string | undefined {
	const allowed = new Set(names);
	const kept = cookieHeader
		.split(';')
		.map((pair) => pair.trim())
		.filter((pair) => {
			const name = pair.split('=')[0]?.trim();
			return name !== undefined && allowed.has(name);
		});
	return kept.length > 0 ? kept.join('; ') : undefined;
};
