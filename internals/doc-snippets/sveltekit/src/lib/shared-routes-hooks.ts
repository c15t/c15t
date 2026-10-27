// #region docs:shared-routes-handle title="src/hooks.server.ts"
import type { Handle } from '@sveltejs/kit';
import { c15tHandle } from 'c15t/svelte/kit';

const SHARED_ROUTES = ['/api/feed', '/blog'];

const isShared = (pathname: string) =>
	SHARED_ROUTES.some(
		(route) => pathname === route || pathname.startsWith(`${route}/`)
	);

const visitorHandle = c15tHandle();
const sharedHandle = c15tHandle({ subjectCookie: false });

export const handle: Handle = (input) =>
	isShared(input.event.url.pathname)
		? sharedHandle(input)
		: visitorHandle(input);
// #endregion docs:shared-routes-handle
