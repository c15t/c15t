/**
 * Serves a `next build` static export (`out/`) the way a static host does:
 * `/` maps to `index.html`, `/client` to `client.html` (or
 * `client/index.html` when `trailingSlash` is on), and anything with an
 * extension is served as-is.
 */

import { once } from 'node:events';
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, resolve, sep } from 'node:path';

export interface StaticServer {
	url: string;
	close: () => Promise<void>;
}

const CONTENT_TYPES: Record<string, string> = {
	'.css': 'text/css; charset=utf-8',
	'.html': 'text/html; charset=utf-8',
	'.ico': 'image/x-icon',
	'.js': 'text/javascript; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.map': 'application/json; charset=utf-8',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.txt': 'text/plain; charset=utf-8',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
};

const isFile = function isFile(path: string): boolean {
	try {
		return statSync(path).isFile();
	} catch {
		return false;
	}
};

const candidatesFor = function candidatesFor(pathname: string): string[] {
	if (pathname === '/') {
		return ['index.html'];
	}
	const relativePath = pathname.replace(/^\/+/u, '').replace(/\/+$/u, '');
	if (extname(relativePath) !== '') {
		return [relativePath];
	}
	return [`${relativePath}.html`, `${relativePath}/index.html`];
};

const resolveFile = function resolveFile(
	outDir: string,
	pathname: string
): string | undefined {
	for (const candidate of candidatesFor(decodeURIComponent(pathname))) {
		const file = resolve(outDir, candidate);
		if (file.startsWith(`${outDir}${sep}`) && isFile(file)) {
			return file;
		}
	}
	return undefined;
};

const createHandler = function createHandler(outDir: string) {
	return function handle(req: IncomingMessage, res: ServerResponse) {
		const { pathname } = new URL(req.url ?? '/', 'http://static.invalid');
		const file = resolveFile(outDir, pathname);
		if (!file) {
			res.statusCode = 404;
			res.setHeader('content-type', 'text/plain; charset=utf-8');
			res.end(`not found: ${pathname}`);
			return;
		}
		res.statusCode = 200;
		res.setHeader(
			'content-type',
			CONTENT_TYPES[extname(file)] ?? 'application/octet-stream'
		);
		res.setHeader('cache-control', 'no-store');
		createReadStream(file).pipe(res);
	};
};

/**
 * Serves `outDir` on a free port.
 */
export const startStaticServer = async function startStaticServer(
	outDir: string,
	host = '127.0.0.1'
): Promise<StaticServer> {
	const server = createServer(createHandler(resolve(outDir)));
	server.listen(0, host);
	await once(server, 'listening');
	const address = server.address();
	const port = typeof address === 'object' && address ? address.port : 0;
	return {
		close: async () => {
			server.closeAllConnections();
			server.close();
			await once(server, 'close');
		},
		url: `http://${host}:${port}`,
	};
};
