/**
 * A consent backend for the examples: `/manifest`, `/init`, `/subjects`
 * and the script-tag build at `/c15t.js`.
 *
 * The manifest comes from the measured checkout's own
 * `buildBrowserBenchManifest()`, so its schema and the example's runtime
 * always come from the same revision. Every example builds and runs
 * against this server, and the runner routes the hard-coded
 * `*.inth.app` hosts here too.
 */
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { basename, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

export interface FixtureBackend {
	url: string;
	manifest: unknown;
	init: unknown;
	/** Requests per endpoint since the last reset, keyed `GET /init`. */
	counts: () => Record<string, number>;
	reset: () => void;
	close: () => Promise<void>;
}

export interface FixtureBackendOptions {
	/** Checkout whose policy fixtures and browser build to serve. */
	root: string;
	port: number;
	latencyMs: number;
}

interface PolicyFixturesModule {
	buildBrowserBenchManifest: () => unknown;
	resolveBrowserBenchInit: (manifest: never) => unknown;
}

/**
 * Set by the runner when it routes a hard-coded host here, so `/c15t.js`
 * is configured for the origin the page asked for.
 */
export const PUBLIC_ORIGIN_HEADER = 'x-examples-payload-origin';

/**
 * The configuration `@c15t/backend` puts in front of the full script-tag
 * build (`packages/backend/src/http/script.ts`): hosted mode against the
 * backend that served it.
 */
export const scriptPrelude = function scriptPrelude(backendURL: string) {
	const config = JSON.stringify({ backendURL, mode: 'hosted' });
	return `(function(c){window.c15t=window.c15t||[];Array.isArray(window.c15t)?window.c15t.unshift(["config",c]):window.c15t.config(c)})(${config});\n`;
};

const readBody = async function readBody(
	request: IncomingMessage
): Promise<string> {
	const chunks: Buffer[] = [];
	for await (const chunk of request) {
		chunks.push(chunk as Buffer);
	}
	return Buffer.concat(chunks).toString('utf8');
};

/**
 * Cross-origin with credentials: echo the caller's origin and any
 * requested headers, because examples send c15t's protocol headers.
 */
const corsHeaders = function corsHeaders(
	request: IncomingMessage
): Record<string, string> {
	const { origin } = request.headers;
	if (!origin) {
		return {};
	}
	return {
		'access-control-allow-credentials': 'true',
		'access-control-allow-headers':
			request.headers['access-control-request-headers'] ?? '*',
		'access-control-allow-methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
		'access-control-allow-origin': origin,
		'access-control-max-age': '600',
		vary: 'origin',
	};
};

/**
 * Start the fixture backend for one checkout.
 *
 * @param options - Checkout root, port and simulated latency.
 * @returns The running backend.
 */
export const startFixtureBackend = async function startFixtureBackend(
	options: FixtureBackendOptions
): Promise<FixtureBackend> {
	const fixturesPath = join(
		options.root,
		'benchmarks/shared/src/policy-fixtures.ts'
	);
	const fixtures = (await import(
		pathToFileURL(fixturesPath).href
	)) as PolicyFixturesModule;
	const manifest = await fixtures.buildBrowserBenchManifest();
	const init = await fixtures.resolveBrowserBenchInit(manifest as never);
	const browserDist = join(options.root, 'packages/browser/dist');
	let counts: Record<string, number> = {};

	const json = function json(
		request: IncomingMessage,
		response: ServerResponse,
		status: number,
		body: unknown,
		cacheControl = 'no-store'
	) {
		response.writeHead(status, {
			...corsHeaders(request),
			'cache-control': cacheControl,
			'content-type': 'application/json',
		});
		response.end(JSON.stringify(body));
	};

	/** The script-tag build and the chunks it loads next to itself. */
	const serveScript = function serveScript(
		request: IncomingMessage,
		response: ServerResponse,
		path: string
	) {
		const file = join(browserDist, basename(path));
		if (!existsSync(file)) {
			response.writeHead(404, corsHeaders(request));
			response.end();
			return;
		}
		response.writeHead(200, {
			...corsHeaders(request),
			'cache-control': 'no-store',
			'content-type': path.endsWith('.css')
				? 'text/css'
				: 'text/javascript; charset=utf-8',
		});
		const backendURL =
			request.headers[PUBLIC_ORIGIN_HEADER] ?? `http://${request.headers.host}`;
		response.end(
			path === '/c15t.js'
				? `${scriptPrelude(String(backendURL))}${readFileSync(file, 'utf8')}`
				: readFileSync(file)
		);
	};

	const handle = async function handle(
		request: IncomingMessage,
		response: ServerResponse
	) {
		const method = request.method ?? 'GET';
		const path = new URL(request.url ?? '/', 'http://fixture').pathname;
		if (method === 'OPTIONS') {
			response.writeHead(204, corsHeaders(request));
			response.end();
			return;
		}
		const key = path.startsWith('/subjects/')
			? `${method} /subjects/:id`
			: `${method} ${path}`;
		counts[key] = (counts[key] ?? 0) + 1;
		if (method === 'GET' && /\.(?:js|css)$/u.test(path)) {
			serveScript(request, response, path);
			return;
		}
		if (options.latencyMs > 0) {
			await sleep(options.latencyMs);
		}
		if (path === '/manifest' && method === 'GET') {
			json(request, response, 200, manifest, 'public, max-age=60');
			return;
		}
		if (path === '/init') {
			json(request, response, 200, init);
			return;
		}
		if (path === '/subjects' && method === 'POST') {
			const body = (JSON.parse((await readBody(request)) || '{}') ?? {}) as {
				subjectId?: string;
			};
			json(request, response, 200, {
				ok: true,
				subjectId: body.subjectId ?? 'examples-payload-subject',
			});
			return;
		}
		if (path.startsWith('/subjects/')) {
			// No stored record: a fresh visitor.
			if (method === 'GET') {
				json(request, response, 404, { error: 'not found' });
				return;
			}
			await readBody(request);
			json(request, response, 200, { ok: true });
			return;
		}
		json(request, response, 404, { error: `no fixture for ${key}` });
	};

	const server = createServer(async (request, response) => {
		try {
			await handle(request, response);
		} catch (error) {
			response.writeHead(500);
			response.end(String(error));
		}
	});
	await new Promise<void>((resolve, reject) => {
		server.once('error', reject);
		server.listen(options.port, '127.0.0.1', () => resolve());
	});

	return {
		close: () =>
			new Promise<void>((resolve) => {
				server.closeAllConnections();
				server.close(() => resolve());
			}),
		counts: () => ({ ...counts }),
		init,
		manifest,
		reset: () => {
			counts = {};
		},
		url: `http://127.0.0.1:${options.port}`,
	};
};
