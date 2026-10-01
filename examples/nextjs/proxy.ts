import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Copies `?arm=` into a request header so the experiment layout, which never
 * sees `searchParams`, can read it with `headers()`. A real site asks its
 * flag provider instead; see `lib/flags.ts`.
 */
export const proxy = (request: NextRequest) => {
	const requestHeaders = new Headers(request.headers);
	requestHeaders.delete('x-example-experiment-arm');
	const arm = request.nextUrl.searchParams.get('arm');
	if (arm) {
		requestHeaders.set('x-example-experiment-arm', arm);
	}
	return NextResponse.next({ request: { headers: requestHeaders } });
};

export const config = { matcher: '/experiment' };
