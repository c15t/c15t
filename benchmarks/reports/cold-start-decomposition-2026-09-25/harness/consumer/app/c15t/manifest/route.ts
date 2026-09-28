// The marker imports bracket the evaluation of c15t/next/api. Keep all three
// first and in this order.
import '../../mark-before-api';
import { createNextConsentRouteHandlers } from 'c15t/next/api';

import '../../mark-after-api';

import { after } from 'next/server';

import { mark, markSince } from '../../bench-timing';

/**
 * The same-origin manifest proxy the docs site uses
 * (`/ripple-forge-lantern/manifest`), pointed at an external mock backend.
 * `C15T_MANIFEST_REVALIDATE_SECONDS=0` reproduces the site, which turns the
 * Next Data Cache off and keeps only the SDK's in-process cache. Unset, the
 * handler uses its documented default and also writes the Next Data Cache.
 * A `cold` query gives the request its own upstream URL: a cold SDK manifest
 * cache and a cold Data Cache entry in a warm process.
 */
const backendURL =
	process.env.C15T_BENCH_BACKEND_URL ?? 'http://127.0.0.1:4790';
const onBackgroundRevalidate = (refresh: Promise<void>) => after(() => refresh);
const handlers = createNextConsentRouteHandlers({
	backendURL,
	onBackgroundRevalidate,
});

export const GET = async (request: Request) => {
	const start = mark('route:manifest:start');
	const token = new URL(request.url).searchParams.get('cold');
	const selected = token
		? createNextConsentRouteHandlers({
				manifestURL: `${backendURL}/manifest?cold=${encodeURIComponent(token)}`,
				onBackgroundRevalidate,
			})
		: handlers;
	try {
		return await selected.manifestGET(request);
	} finally {
		markSince('route:manifest:end', start, { token });
	}
};
