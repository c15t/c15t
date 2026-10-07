#!/usr/bin/env node
/**
 * Production server for the built example.
 *
 * `vite build` emits `dist/server/server.js` as a bare `{ fetch }` handler
 * with no listener, so `node dist/server/server.js` exits at once. This is
 * the Node host TanStack Start documents for that output: srvx's node:http
 * adapter serving `dist/client` as static files in front of the handler,
 * the same split a Next `next start` server does internally.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { serve } from 'srvx';
import { staticMiddleware } from 'srvx/static';

import { withRegionPreview } from './region-preview.mjs';

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// `--static` serves only the prerendered files, the way a static host
// would. `bun run start:static` uses it for the `static` rendering variant.
const staticOnly = process.argv.includes('--static');

const notFound = () => new Response('Not found', { status: 404 });
const loadServerFetch = async () => {
	const { default: server } = await import(
		pathToFileURL(resolve(appDir, 'dist/server/server.js')).href
	);
	return (request) => server.fetch(withRegionPreview(request));
};

const hostname = process.env.HOST ?? '127.0.0.1';
const port = Number(process.env.PORT ?? '3010');

const instance = serve({
	fetch: staticOnly ? notFound : await loadServerFetch(),
	// The bench runner sends SIGTERM and expects the process gone within
	// half a second; srvx's graceful drain would hold idle keep-alive
	// connections open for up to five seconds first.
	gracefulShutdown: false,
	hostname,
	middleware: [staticMiddleware({ dir: resolve(appDir, 'dist/client') })],
	port,
});
await instance.ready();
console.log(
	`c15t TanStack Start example listening on http://${hostname}:${port}`
);
