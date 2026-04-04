/**
 * Simple dev server for the embed playground.
 *
 * Serves the HTML pages and proxies to the c15t backend.
 * Run: `bun serve.ts` from this directory.
 */

const EMBED_DIST = '../../packages/embed/dist';

Bun.serve({
	port: 4000,
	async fetch(req) {
		const url = new URL(req.url);
		let path = url.pathname;

		// Serve embed dist files (JS and CSS)
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

		// Default to index.html for root
		if (path === '/') path = '/index.html';

		// Try to serve the HTML file
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

console.log('Embed playground running at http://localhost:4000');
console.log('Pages:');
console.log('  http://localhost:4000/           — Prestyled mode');
console.log('  http://localhost:4000/headless.html    — Headless mode');
console.log('  http://localhost:4000/custom-elements.html — Custom elements');
console.log('  http://localhost:4000/dark.html        — Dark theme');
