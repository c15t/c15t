// Forwards the docs site's consent backend (compiled into its build as
// 127.0.0.1:4318) to the seeded local gateway, adds latency to /init and
// /manifest, and records every call in memory.
//
//   node site-proxy.mjs
//   GET /__control?delay=200   GET /__metrics   GET /__reset
import http from 'node:http';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const GATEWAY = 'http://127.0.0.1:4130/local/london/gateway-alpha';
const DROPPED_REQUEST_HEADERS = new Set([
	'accept-encoding',
	'connection',
	'content-length',
	'host',
]);
const DROPPED_RESPONSE_HEADERS = new Set([
	'connection',
	'content-encoding',
	'content-length',
	'transfer-encoding',
]);
const GATED = /\/(?:init|manifest)(?:\?|$)/u;

export const createSiteProxy = () => {
	let delay = 0;
	let events = [];

	const forward = async (req, res, url) => {
		const start = performance.now();
		const at = Date.now();
		const wait = GATED.test(req.url) ? delay : 0;
		const chunks = [];
		for await (const chunk of req) {
			chunks.push(chunk);
		}
		const headers = new Headers();
		for (const [key, value] of Object.entries(req.headers)) {
			if (value && !DROPPED_REQUEST_HEADERS.has(key)) {
				headers.set(key, Array.isArray(value) ? value.join(',') : value);
			}
		}
		headers.set('x-c15t-country', 'DE');
		headers.set('x-c15t-region', 'BE');
		if (wait) {
			await sleep(wait);
		}
		const target = new URL(GATEWAY);
		target.pathname += url.pathname;
		target.search = url.search;
		const upstream = await fetch(target, {
			body: chunks.length ? Buffer.concat(chunks) : undefined,
			headers,
			method: req.method,
			redirect: 'error',
		});
		const body = Buffer.from(await upstream.arrayBuffer());
		res.statusCode = upstream.status;
		for (const [key, value] of upstream.headers) {
			if (!DROPPED_RESPONSE_HEADERS.has(key)) {
				res.setHeader(key, value);
			}
		}
		res.end(body);
		events.push({
			at,
			delay: wait,
			method: req.method,
			ms: performance.now() - start,
			path: url.pathname,
			status: upstream.status,
		});
	};

	return http.createServer(async (req, res) => {
		const url = new URL(req.url, 'http://localhost');
		if (url.pathname === '/__control') {
			delay = Number(url.searchParams.get('delay') ?? 0);
			res.end(JSON.stringify({ delay }));
			return;
		}
		if (url.pathname === '/__metrics') {
			res.setHeader('content-type', 'application/json');
			res.end(JSON.stringify(events));
			return;
		}
		if (url.pathname === '/__reset') {
			events = [];
			res.end('{}');
			return;
		}
		try {
			await forward(req, res, url);
		} catch (error) {
			console.error('Site proxy upstream request failed', error);
			res.statusCode = 502;
			res.setHeader('content-type', 'text/plain; charset=utf-8');
			res.end('Upstream request failed');
		}
	});
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	createSiteProxy().listen(4318, '127.0.0.1', () => {
		console.log('site proxy ready');
	});
}
