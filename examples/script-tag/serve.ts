/**
 * Serves the script-tag example on http://localhost:4173.
 *
 * `/c15t.js` and `/c15t.headless.js` come straight from the built
 * `@c15t/browser` package, the way a CDN would serve them. Cookies need an
 * http origin, so `file://` is not enough to try a full accept/reload cycle.
 *
 * ```sh
 * bun run --cwd examples/script-tag dev
 * ```
 */
import { fileURLToPath } from 'node:url';

const port = Number(process.env.PORT ?? 4173);
const html = new URL('./index.html', import.meta.url);

const bundles: Record<string, URL> = {
	'/c15t.headless.js': new URL(
		import.meta.resolve('@c15t/browser/c15t.headless.js')
	),
	'/c15t.js': new URL(import.meta.resolve('@c15t/browser/c15t.js')),
};

Bun.serve({
	fetch(request) {
		const { pathname } = new URL(request.url);
		const bundle = bundles[pathname];
		if (bundle) {
			return new Response(Bun.file(fileURLToPath(bundle)), {
				headers: { 'content-type': 'text/javascript; charset=utf-8' },
			});
		}
		if (pathname === '/') {
			return new Response(Bun.file(fileURLToPath(html)));
		}
		return new Response('Not found', { status: 404 });
	},
	port,
});

console.log(`script-tag example: http://localhost:${port}/`);
