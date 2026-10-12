// External mock consent backend for the cold-start benchmark. Serves the
// manifest captured from the seeded alpha.2 gateway with the gateway's cache
// headers, counts every origin call, and injects latency or failures on
// /manifest and /init.
//
//   node mock-backend.mjs <port>
//   GET /__control?delay=200&mode=ok|fail|hang&cc=<cache-control>
//   GET /__metrics   events since the last reset
//   GET /__reset     clear events
import { readFileSync } from 'node:fs';
import http from 'node:http';
import { setTimeout as sleep } from 'node:timers/promises';

const port = Number(process.argv[2] ?? 4790);
const manifest = readFileSync(
	new URL('consumer/fixture/manifest.json', import.meta.url)
);
const ETAG = '"cold-start-bench-manifest"';
let delay = 0;
let mode = 'ok';
let cacheControl = 'public, s-maxage=300, stale-while-revalidate=86400';
let events = [];
let seq = 0;

const finish = (res, event, status, body) => {
	res.statusCode = status;
	res.end(body);
	event.status = status;
	event.doneAt = Date.now();
};

const control = (url, res) => {
	if (url.searchParams.has('delay')) {
		delay = Number(url.searchParams.get('delay'));
	}
	if (url.searchParams.has('mode')) {
		mode = url.searchParams.get('mode');
	}
	if (url.searchParams.has('cc')) {
		cacheControl = url.searchParams.get('cc');
	}
	res.setHeader('content-type', 'application/json');
	res.end(JSON.stringify({ cacheControl, delay, mode }));
};

const server = http.createServer(async (req, res) => {
	const url = new URL(req.url, 'http://localhost');
	if (url.pathname === '/__control') {
		control(url, res);
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
	seq += 1;
	const event = {
		at: Date.now(),
		delay: 0,
		id: seq,
		ifNoneMatch: req.headers['if-none-match'] ?? null,
		method: req.method,
		mode,
		path: url.pathname,
		query: url.search,
	};
	events.push(event);
	req.resume();
	const gated = url.pathname === '/manifest' || url.pathname === '/init';
	if (gated && delay > 0) {
		event.delay = delay;
		await sleep(delay);
	}
	if (gated && mode === 'hang') {
		// Never answer; the client has to time out.
		req.socket.on('close', () => {
			event.closedAt = Date.now();
		});
		return;
	}
	if (gated && mode === 'fail') {
		finish(res, event, 503, 'backend unavailable');
		return;
	}
	if (url.pathname === '/manifest') {
		res.setHeader('cache-control', cacheControl);
		res.setHeader('etag', ETAG);
		res.setHeader('x-c15t-manifest-cdn-ttl', '604800');
		res.setHeader('x-c15t-policy-contract', '1');
		res.setHeader('x-c15t-version', '3.0');
		if (req.headers['if-none-match'] === ETAG) {
			finish(res, event, 304);
			return;
		}
		res.setHeader('content-type', 'application/json');
		finish(res, event, 200, manifest);
		return;
	}
	if (url.pathname === '/sessions') {
		finish(res, event, 204);
		return;
	}
	finish(res, event, 404, 'not found');
});

server.listen(port, '127.0.0.1', () => {
	console.log(`mock backend ready on ${port}`);
});
