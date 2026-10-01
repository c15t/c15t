/**
 * Region preview for the demo: `?country=US&region=CA` becomes the
 * `x-c15t-country` / `x-c15t-region` headers a CDN would normally add.
 *
 * It runs in the HTTP host (the Vite dev server and `scripts/serve.mjs`),
 * outside the application, so the app's `src/start.ts` stays the plain
 * setup the docs publish. Follow-up requests carry no query string, so a
 * same-origin request without one falls back to the `referer` query and
 * stays on the policy the page rendered with. Never ship this.
 *
 * @param {string} url Absolute request URL.
 * @param {string | null | undefined} referer The request's `referer`.
 * @returns {Record<string, string>} Headers to set on the request.
 */
export const regionPreviewHeaders = (url, referer) => {
	const requestURL = new URL(url);
	let source;
	if (
		requestURL.searchParams.has('country') ||
		requestURL.searchParams.has('region')
	) {
		source = requestURL.searchParams;
	} else if (referer) {
		try {
			const refererURL = new URL(referer);
			if (refererURL.origin === requestURL.origin) {
				source = refererURL.searchParams;
			}
		} catch {
			source = undefined;
		}
	}
	const headers = {};
	const country = source?.get('country');
	const region = source?.get('region');
	if (country) {
		headers['x-c15t-country'] = country.toUpperCase();
	}
	if (region) {
		headers['x-c15t-region'] = region.toUpperCase();
	}
	return headers;
};

/**
 * Applies {@link regionPreviewHeaders} to a Fetch API request.
 *
 * @param {Request} request Incoming request.
 * @returns {Request} The same request, or a copy with preview headers.
 */
export const withRegionPreview = (request) => {
	const preview = Object.entries(
		regionPreviewHeaders(request.url, request.headers.get('referer'))
	);
	if (preview.length === 0) {
		return request;
	}
	const headers = new Headers(request.headers);
	for (const [name, value] of preview) {
		headers.set(name, value);
	}
	const init = { headers };
	if (request.body) {
		// Node requires `duplex` to forward a streamed body.
		init.duplex = 'half';
	}
	return new Request(request, init);
};
