import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Forward the banner-experiment query into request headers so the App
 * Router layout, which never sees `searchParams`, can read them with
 * `headers()`. A real site resolves the arm from its flag provider
 * instead; this is only how the demo passes the URL choice to the server.
 */
export const proxy = (request: NextRequest) => {
	const { searchParams } = request.nextUrl;
	const requestHeaders = new Headers(request.headers);
	if (searchParams.get('experiment') === '1') {
		requestHeaders.set('x-example-experiment', '1');
		const arm = searchParams.get('arm');
		if (arm) {
			requestHeaders.set('x-example-experiment-arm', arm);
		}
	}
	return NextResponse.next({ request: { headers: requestHeaders } });
};

export const config = { matcher: '/app-router' };
