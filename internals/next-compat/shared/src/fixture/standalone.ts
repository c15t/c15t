/**
 * The backend stub as its own Node HTTP server.
 *
 * @remarks
 * Cells that ship a server mount the fixture handlers inside the app under
 * `/api/c15t`. A static export has no server, so the suite's global setup
 * runs this one beside the static file server instead. The browser then
 * calls it cross-origin, which is why every response carries CORS headers
 * and `OPTIONS` preflights are answered here; the in-app mounts never need
 * them.
 */

import { once } from 'node:events';
import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';

import { handleFixtureRequest } from './index';
import { toWebRequest, writeWebResponse } from './node-adapter';

export interface FixtureServerOptions {
	/** Interface to bind. Defaults to `127.0.0.1`. */
	host?: string;
	/** Port to bind; `0` picks a free one. Defaults to `0`. */
	port?: number;
	/** Path prefix the handlers are mounted under. Defaults to `/api/c15t`. */
	basePath?: string;
}

export interface FixtureServer {
	/** Origin of the server, for example `http://127.0.0.1:41235`. */
	url: string;
	/** Absolute backend URL, the origin plus `basePath`. */
	backendURL: string;
	close: () => Promise<void>;
}

const NO_STORE = { 'cache-control': 'no-store' } as const;

const applyCors = function applyCors(
	headers: Headers,
	req: IncomingMessage
): void {
	const { origin } = req.headers;
	if (!origin) {
		return;
	}
	headers.set('access-control-allow-origin', origin);
	headers.set('access-control-allow-credentials', 'true');
	headers.set('vary', 'origin');
};

const answerPreflight = function answerPreflight(
	req: IncomingMessage,
	res: ServerResponse
): void {
	const headers = new Headers({
		'access-control-allow-headers':
			req.headers['access-control-request-headers'] ?? '*',
		'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
		'access-control-max-age': '600',
		...NO_STORE,
	});
	applyCors(headers, req);
	res.statusCode = 204;
	headers.forEach((value, name) => {
		res.setHeader(name, value);
	});
	res.end();
};

const notFound = function notFound(path: string): Response {
	return Response.json(
		{ error: `unhandled ${path}` },
		{ headers: NO_STORE, status: 404 }
	);
};

const createHandler = function createHandler(basePath: string) {
	return async function handle(req: IncomingMessage, res: ServerResponse) {
		if (req.method === 'OPTIONS') {
			answerPreflight(req, res);
			return;
		}
		try {
			const request = await toWebRequest(req);
			const { pathname } = new URL(request.url);
			const response =
				pathname === basePath || pathname.startsWith(`${basePath}/`)
					? await handleFixtureRequest(
							request,
							pathname.slice(basePath.length).split('/').filter(Boolean)
						)
					: notFound(pathname);
			applyCors(response.headers, req);
			await writeWebResponse(response, res);
		} catch (error) {
			res.statusCode = 500;
			res.setHeader('content-type', 'text/plain');
			res.end(error instanceof Error ? error.stack : String(error));
		}
	};
};

const listen = async function listen(
	server: Server,
	host: string,
	port: number
): Promise<number> {
	server.listen(port, host);
	try {
		// `once` rejects with the `error` event, for example EADDRINUSE.
		await once(server, 'listening');
	} catch (error) {
		server.close();
		throw error;
	}
	const address = server.address();
	return typeof address === 'object' && address ? address.port : port;
};

/**
 * Starts the fixture handlers on their own port.
 *
 * @throws {Error} When the requested port cannot be bound.
 */
export const startFixtureServer = async function startFixtureServer({
	host = '127.0.0.1',
	port = 0,
	basePath = '/api/c15t',
}: FixtureServerOptions = {}): Promise<FixtureServer> {
	const server = createServer(createHandler(basePath));
	const boundPort = await listen(server, host, port);
	const url = `http://${host}:${boundPort}`;
	return {
		backendURL: `${url}${basePath}`,
		close: async () => {
			server.closeAllConnections();
			server.close();
			await once(server, 'close');
		},
		url,
	};
};
