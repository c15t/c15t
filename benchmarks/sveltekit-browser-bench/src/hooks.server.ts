/**
 * `c15tHandle()` resolves the consent cookie and the geo/language/GPC
 * headers once per request onto `event.locals.c15t`, together with the mode
 * each arm's `loadConsent` resolves with.
 *
 * Two handles, picked by path:
 *
 * - `/ssr` resolves `hosted()`: `loadConsent` asks the fixture backend's
 *   `/init` on the request path, so the consent round-trip lands in the
 *   page's TTFB. This is the arm manifest mode is measured against.
 * - Every other route resolves `manifest()` on the server from the
 *   fixture's manifest, fetched at runtime and cached in-process. The
 *   browser saves through `/api/c15t` and re-inits through the app's own
 *   consent route (`createConsentRoute`) under the same prefix.
 */
import { c15tHandle, hosted, manifest } from '@c15t/svelte/kit';
import type { C15tHandle } from '@c15t/svelte/kit';

const hostedHandle = c15tHandle({
	mode: hosted({ backendURL: '/api/bench-consent' }),
});

const manifestHandle = c15tHandle({
	backendURL: '/api/c15t',
	mode: manifest({
		manifestURL: '/api/bench-consent/manifest',
		source: 'runtime',
	}),
	routePrefix: '/api/c15t',
});

const isHostedArm = function isHostedArm(pathname: string): boolean {
	return pathname === '/ssr' || pathname.startsWith('/ssr/');
};

export const handle: C15tHandle = (input) =>
	isHostedArm(input.event.url.pathname)
		? hostedHandle(input)
		: manifestHandle(input);
