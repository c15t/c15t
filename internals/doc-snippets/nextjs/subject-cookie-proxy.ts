// #region docs:subject-cookie-proxy title="proxy.ts"
import { c15tProxy } from 'c15t/next/proxy';

const SHARED_ROUTES = ['/api/feed', '/blog'];

const isShared = (pathname: string) =>
	SHARED_ROUTES.some(
		(route) => pathname === route || pathname.startsWith(`${route}/`)
	);

export const proxy = (request: Parameters<typeof c15tProxy>[0]) =>
	c15tProxy(request, { subjectCookie: !isShared(request.nextUrl.pathname) });
// #endregion docs:subject-cookie-proxy
