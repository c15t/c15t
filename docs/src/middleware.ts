import { type NextRequest, NextResponse } from 'next/server';

/**
 * Configuration for the middleware matcher
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
 */
export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - api (API routes)
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 */
		'/((?!api|_next/static|_next/image|favicon.ico).*)',
	],
};

/**
 * The target URL to redirect the homepage to
 */
const HOMEPAGE_REDIRECT_TARGET = 'https://www-c15t.vercel.app/' as const;

/**
 * The marketing site URL for static file rewrites
 */
const MARKETING_SITE_URL = 'https://www-c15t.vercel.app' as const;

/**
 * Type definition for rewrite operation types
 */
type RewriteOperationType = 'homepage' | 'marketing static';

/**
 * Logs rewrite operations for debugging purposes
 *
 * @param operationType - The type of rewrite operation being performed
 * @param originalPath - The original request path
 * @param targetUrl - The target URL being rewritten to
 *
 * @internal
 */
function logRewrite(
	operationType: RewriteOperationType,
	originalPath: string,
	targetUrl: string
): void {
	// biome-ignore lint/suspicious/noConsoleLog: <explanation>
	// biome-ignore lint/suspicious/noConsole: <explanation>
	console.log(
		`[Middleware] ${operationType} rewrite: ${originalPath} → ${targetUrl}`
	);
}

/**
 * Creates a debug response with rewrite information
 *
 * @param targetUrl - The target URL to rewrite to
 * @param originalPath - The original request path
 * @returns A NextResponse object that rewrites to the target URL
 *
 * @throws {Error} When the target URL is invalid or rewrite fails
 */
function createDebugResponse(
	targetUrl: URL,
	originalPath: string
): NextResponse {
	try {
		return NextResponse.rewrite(targetUrl);
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: <explanation>
		console.error(
			`[Middleware] Failed to create rewrite response for ${originalPath}:`,
			error
		);
		throw new Error(`Rewrite failed for path: ${originalPath}`);
	}
}

/**
 * Middleware function that handles URL rewriting for the documentation site
 *
 * This middleware intercepts requests to the homepage (/) and transparently
 * rewrites them to the c15t main website, providing a seamless experience
 * by redirecting users to the primary marketing site. It also handles
 * marketing static files by rewriting _next paths appropriately.
 *
 * @param request - The incoming Next.js request object containing URL and headers
 * @returns A NextResponse object that either rewrites the URL or continues the request
 *
 * @throws {Error} When URL construction fails due to invalid request URL
 *
 * @example
 * ```ts
 * // Homepage rewrite:
 * // https://docs.example.com/ → https://www-c15t.vercel.app/
 *
 * // Marketing static file rewrite:
 * // /marketing-static/_next/static/chunks/main.js → https://www-c15t.vercel.app/_next/static/chunks/main.js
 * ```
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware
 */
export function middleware(request: NextRequest): NextResponse {
	const requestUrl = request.nextUrl;
	const path = requestUrl.pathname;

	// Handle _next files (JS, CSS, etc.) for marketing static content
	if (path.startsWith('/marketing-static/')) {
		const rewritePath = path.replace('/marketing-static/', '/');
		const marketingURL = new URL(rewritePath, MARKETING_SITE_URL);
		// Preserve original query string (e.g. _next/image params)
		marketingURL.search = requestUrl.search;

		logRewrite('marketing static', path, marketingURL.toString());
		return createDebugResponse(marketingURL, path);
	}

	// Check if the request is for the homepage
	if (path === '/') {
		try {
			// Create a new URL with the target external URL while preserving query parameters
			const rewriteUrl = new URL(HOMEPAGE_REDIRECT_TARGET);

			// Preserve any query parameters from the original request
			rewriteUrl.search = requestUrl.search;

			logRewrite('homepage', path, rewriteUrl.toString());

			// Rewrite the request to the external target URL
			return NextResponse.rewrite(rewriteUrl);
		} catch (error) {
			// Log the error and continue with the original request
			// biome-ignore lint/suspicious/noConsole: <explanation>
			console.error('Failed to rewrite homepage URL:', error);
			return NextResponse.next();
		}
	}

	// Continue with the original request for all other paths
	return NextResponse.next();
}
