/** URL query helpers shared by the request-parameter modules. */

/**
 * Append query parameters to a URL. A relative URL stays relative and a
 * fragment stays last.
 *
 * @param url - The request URL, possibly empty.
 * @param params - The parameters. Nothing is appended when empty.
 * @returns The URL with the parameters.
 * @internal
 */
export const appendSearchParams = function appendSearchParams(
	url: string,
	params: URLSearchParams
): string {
	const query = params.toString();
	if (!query) {
		return url;
	}
	const hash = url.indexOf('#');
	const base = hash === -1 ? url : url.slice(0, hash);
	const fragment = hash === -1 ? '' : url.slice(hash);
	let separator = '?';
	if (base.includes('?')) {
		separator = base.endsWith('?') || base.endsWith('&') ? '' : '&';
	}
	return `${base}${separator}${query}${fragment}`;
};
