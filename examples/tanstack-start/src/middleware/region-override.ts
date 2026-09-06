import { createMiddleware } from '@tanstack/react-start';

/**
 * Region preview via URL query: `?country=US&region=CA`.
 *
 * Local development has no CDN geo header, so this middleware lets you force
 * a location and watch the manifest re-resolve. It writes the canonical
 * `x-c15t-country` / `x-c15t-region` headers onto the request, which is what
 * `consentRequestMiddleware()` and the consent routes read first.
 *
 * The browser's follow-up requests (`/api/c15t/init`, `POST
 * /api/self-host/subjects`) do not carry the page's query string, so for
 * same-origin requests without one the override falls back to the query of
 * the `referer`. That keeps the client-side init and the consent save on
 * the same policy the server rendered. Never ship this to production.
 */
const readOverrideSource = function readOverrideSource(
	request: Request
): URLSearchParams | undefined {
	const url = new URL(request.url);
	if (url.searchParams.has('country') || url.searchParams.has('region')) {
		return url.searchParams;
	}
	const referer = request.headers.get('referer');
	if (!referer) {
		return undefined;
	}
	try {
		const refererURL = new URL(referer);
		return refererURL.origin === url.origin
			? refererURL.searchParams
			: undefined;
	} catch {
		return undefined;
	}
};

export const regionOverrideMiddleware = createMiddleware().server(
	({ next, request }) => {
		const source = readOverrideSource(request);
		const country = source?.get('country');
		const region = source?.get('region');

		if (country) {
			request.headers.set('x-c15t-country', country.toUpperCase());
		}
		if (region) {
			request.headers.set('x-c15t-region', region.toUpperCase());
		}

		return next();
	}
);
