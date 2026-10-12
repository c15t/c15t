/** URL query helpers shared by the request-parameter modules. */

const PLUS = /\+/gu;

const decodeKey = function decodeKey(raw: string): string {
	try {
		return decodeURIComponent(raw.replace(PLUS, ' '));
	} catch {
		return raw;
	}
};

/**
 * Set query parameters on a URL. A relative URL stays relative and a
 * fragment stays last.
 *
 * Each parameter replaces any the URL already has under the same name, so
 * it appears once and the new value wins. The URL's other parameters keep
 * their order and their original encoding.
 *
 * @param url - The request URL, possibly empty.
 * @param params - The parameters. Nothing changes when empty.
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
	const start = base.indexOf('?');
	if (start === -1) {
		return `${base}?${query}${fragment}`;
	}
	const names = new Set(params.keys());
	const kept = base
		.slice(start + 1)
		.split('&')
		.filter((part) => {
			if (!part) {
				return false;
			}
			const equals = part.indexOf('=');
			return !names.has(
				decodeKey(equals === -1 ? part : part.slice(0, equals))
			);
		});
	kept.push(query);
	return `${base.slice(0, start)}?${kept.join('&')}${fragment}`;
};
