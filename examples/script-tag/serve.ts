/**
 * Serves the script-tag example on http://localhost:4173.
 *
 * `/c15t.js`, `/c15t.headless.js` and `/c15t.devtools.js` come straight
 * from the built `@c15t/browser` package, the way a CDN would serve them.
 * The rest stands in for the third parties a real page loads: two vendor
 * scripts, two embeds and a tracking endpoint, all local so the example
 * works offline and every request is visible in the page's log.
 *
 * Cookies need an http origin, so `file://` is not enough to try a full
 * accept/reload cycle.
 *
 * ```sh
 * bun run --cwd examples/script-tag dev
 * ```
 */
import { fileURLToPath } from 'node:url';

const port = Number(process.env.PORT ?? 4173);
const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

const bundles: Record<string, string> = {
	'/c15t.devtools.js': fileURLToPath(
		import.meta.resolve('@c15t/browser/c15t.devtools.js')
	),
	'/c15t.headless.js': fileURLToPath(
		import.meta.resolve('@c15t/browser/c15t.headless.js')
	),
	'/c15t.js': fileURLToPath(import.meta.resolve('@c15t/browser/c15t.js')),
};

const pages: Record<string, string> = {
	'/': here('./index.html'),
	'/embed/map.html': here('./embed/map.html'),
	'/embed/video.html': here('./embed/video.html'),
	'/vendor/analytics.js': here('./vendor/analytics.js'),
	'/vendor/chat-widget.js': here('./vendor/chat-widget.js'),
};

const contentTypes: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
};

let events = 0;

Bun.serve({
	fetch(request) {
		const { pathname } = new URL(request.url);
		if (pathname === '/api/track') {
			// What a consent-gated analytics endpoint sees once the network
			// blocker lets a request through.
			events += 1;
			return Response.json({ ok: true, received: events });
		}
		const file = bundles[pathname] ?? pages[pathname];
		if (!file) {
			return new Response('Not found', { status: 404 });
		}
		const extension = file.slice(file.lastIndexOf('.'));
		return new Response(Bun.file(file), {
			headers: {
				'cache-control': 'no-store',
				'content-type': contentTypes[extension] ?? 'application/octet-stream',
			},
		});
	},
	port,
});

console.log(`script-tag example: http://localhost:${port}/`);
