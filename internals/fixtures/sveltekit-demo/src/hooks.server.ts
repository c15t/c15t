import { c15tHandle, hosted, manifest } from '@c15t/svelte/kit';
import type { C15tHandle } from '@c15t/svelte/kit';

import { testBackend } from '#lib/test-backend.js';

// Reads the consent cookie, location headers and GPC once per request and
// stores them on `event.locals.c15t`, with the mode `loadConsent` resolves
// with. Each area of this app talks to its own backend, so each gets its own
// handle.
const { backendURL = 'https://your-project.inth.app' } =
	testBackend('backendURL');

// `/consent-example` and `/experiment-example`: the server asks the
// backend's `/init`. A prerendered page carries no visitor's consent, so the
// browser asks the backend there.
const hostedHandle = c15tHandle({ mode: hosted({ backendURL }) });

// `/manifest-example`: the server resolves from the backend's cached policy
// manifest, and the browser re-inits through the route in
// `src/routes/api/c15t`.
const manifestHandle = c15tHandle({
	backendURL,
	mode: manifest(),
	routePrefix: '/api/c15t',
});

// The showcase: `/api/showcase` is this app's own consent route. It resolves
// `/init` from the self-hosted backend's manifest in-process and proxies
// writes to it, so the browser only talks to this origin.
const showcaseHandle = c15tHandle({
	mode: hosted({ backendURL: '/api/showcase' }),
});

const areaHandles: readonly (readonly [prefix: string, handle: C15tHandle])[] =
	[
		['/consent-example', hostedHandle],
		['/experiment-example', hostedHandle],
		['/manifest-example', manifestHandle],
	];

export const handle: C15tHandle = (input) => {
	const { pathname } = input.event.url;
	const area = areaHandles.find(
		([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`)
	);
	return (area?.[1] ?? showcaseHandle)(input);
};
