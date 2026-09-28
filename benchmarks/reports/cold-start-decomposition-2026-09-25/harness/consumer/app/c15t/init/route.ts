import { createNextConsentRouteHandlers } from 'c15t/next/api';
import { after } from 'next/server';

import { mark, markSince } from '../../bench-timing';

/**
 * Same-origin `/init`, resolved from the cached manifest like the docs
 * site's `/ripple-forge-lantern/init`. The browser only calls it when the
 * server render could not resolve consent.
 */
const backendURL =
	process.env.C15T_BENCH_BACKEND_URL ?? 'http://127.0.0.1:4790';
const handlers = createNextConsentRouteHandlers({
	backendURL,
	onBackgroundRevalidate: (refresh) => after(() => refresh),
});

export const GET = async (request: Request) => {
	const start = mark('route:init:start');
	try {
		return await handlers.GET(request);
	} catch (error) {
		mark('route:init:error', { message: String(error) });
		throw error;
	} finally {
		markSince('route:init:end', start);
	}
};
