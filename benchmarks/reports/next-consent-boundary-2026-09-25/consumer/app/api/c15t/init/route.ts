import { createNextConsentRouteHandlers } from 'c15t/next/api';
import { after } from 'next/server';

/**
 * The documented same-origin init route: resolves init from the cached
 * manifest with the request's geography. The `bench-manifest` cookie selects
 * a per-sample upstream URL (cold cache, or a failing upstream).
 */
export const GET = (request: Request) => {
	const cookie = request.headers.get('cookie') ?? '';
	const token = /(?:^|;\s*)bench-manifest=(?<token>[^;]+)/u.exec(cookie)?.groups
		?.token;
	const upstream = token
		? `/api/bench-consent/manifest?cold=${token}`
		: '/api/bench-consent/manifest';
	return createNextConsentRouteHandlers({
		manifestURL: upstream,
		onBackgroundRevalidate: (refresh) => after(() => refresh),
		reportSessions: false,
	}).GET(request);
};
