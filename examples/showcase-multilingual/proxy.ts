import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { isLocale, matchLocale } from '@/lib/locales';

// Sends a path without a locale to the visitor's language: `/` becomes
// `/de` for a German browser. c15t's banner then follows the route.
export const proxy = (request: NextRequest) => {
	const { pathname } = request.nextUrl;
	const first = pathname.split('/')[1] ?? '';
	if (isLocale(first)) {
		return NextResponse.next();
	}
	const url = request.nextUrl.clone();
	const locale = matchLocale(request.headers.get('accept-language'));
	url.pathname = pathname === '/' ? `/${locale}` : `/${locale}${pathname}`;
	return NextResponse.redirect(url);
};

export const config = {
	matcher: ['/((?!_next|favicon.ico|.*\\..*).*)'],
};
