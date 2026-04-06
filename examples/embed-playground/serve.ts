/**
 * Dev server for the embed playground.
 *
 * Serves HTML pages, the embed dist at clean paths (/c15t.js, /c15t.css),
 * and proxies /api/* requests to a c15t backend.
 *
 * Run: `bun serve.ts` from this directory.
 *
 * The backend URL defaults to http://localhost:3000 (the demo app).
 * Override with BACKEND_URL env var.
 */

const EMBED_DIST = '../../packages/embed/dist';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

Bun.serve({
	port: 4000,
	async fetch(req) {
		const url = new URL(req.url);
		let path = url.pathname;

		// ─── Serve embed dist at clean paths ──────────────────────────────
		if (path === '/c15t.js') {
			return new Response(Bun.file(`${EMBED_DIST}/c15t.js`), {
				headers: { 'Content-Type': 'application/javascript' },
			});
		}
		if (path === '/c15t.css') {
			return new Response(Bun.file(`${EMBED_DIST}/c15t.css`), {
				headers: { 'Content-Type': 'text/css' },
			});
		}

		// ─── Also serve at old paths for backwards compat ─────────────────
		if (path.startsWith('/packages/embed/dist/')) {
			const file = Bun.file(`../../${path}`);
			if (await file.exists()) {
				const ext = path.split('.').pop();
				return new Response(file, {
					headers: {
						'Content-Type':
							ext === 'css' ? 'text/css' : 'application/javascript',
					},
				});
			}
		}

		// ─── Proxy API requests to the backend ────────────────────────────
		if (path.startsWith('/api/')) {
			const backendUrl = `${BACKEND_URL}${path}${url.search}`;
			try {
				const resp = await fetch(backendUrl, {
					method: req.method,
					headers: req.headers,
					body: req.method !== 'GET' ? await req.text() : undefined,
				});
				return new Response(resp.body, {
					status: resp.status,
					headers: {
						'Content-Type':
							resp.headers.get('Content-Type') || 'application/json',
						'Access-Control-Allow-Origin': '*',
					},
				});
			} catch {
				return new Response(
					JSON.stringify({ error: `Backend at ${BACKEND_URL} unreachable` }),
					{
						status: 502,
						headers: { 'Content-Type': 'application/json' },
					}
				);
			}
		}

		// ─── Serve HTML pages ─────────────────────────────────────────────
		if (path === '/') path = '/index.html';

		const file = Bun.file(`.${path}`);
		if (await file.exists()) {
			const ext = path.split('.').pop();
			const contentType =
				ext === 'html'
					? 'text/html'
					: ext === 'js'
						? 'application/javascript'
						: ext === 'css'
							? 'text/css'
							: 'application/octet-stream';

			return new Response(file, {
				headers: { 'Content-Type': contentType },
			});
		}

		return new Response('Not found', { status: 404 });
	},
});

console.log(`Embed playground running at http://localhost:4000`);
console.log(`Proxying /api/* to ${BACKEND_URL}`);
console.log('Pages:');
console.log('  http://localhost:4000/           — Prestyled mode');
console.log('  http://localhost:4000/headless.html    — Headless mode');
console.log('  http://localhost:4000/custom-elements.html — Custom elements');
console.log('  http://localhost:4000/dark.html        — Dark theme');
