import { createNextConsentRouteHandlers } from 'c15t/next/api';
import { after } from 'next/server';

/**
 * The documented same-origin manifest proxy, with its in-process and Next
 * Data Cache layers. A `cold` query gives the request its own upstream URL,
 * which is a cold SDK manifest cache in a warm process.
 */
export const GET = (request: Request) => {
	const token = new URL(request.url).searchParams.get('cold');
	const upstream = token
		? `/api/bench-consent/manifest?cold=${encodeURIComponent(token)}`
		: '/api/bench-consent/manifest';
	return createNextConsentRouteHandlers({
		manifestURL: upstream,
		onBackgroundRevalidate: (refresh) => after(() => refresh),
	}).manifestGET(request);
};
