// HTTP/2 (TLS) reverse proxy in front of a local `next start`, so browser
// measurements see one multiplexed connection as on a production CDN instead
// of HTTP/1.1's six-connections-per-host queue.
// Usage: node h2-proxy.mjs <listenPort> <upstreamPort> <certDir>
// certDir holds a self-signed cert.pem and key.pem for 127.0.0.1.
import { readFileSync } from 'node:fs';
import http from 'node:http';
import http2 from 'node:http2';

const [listenPort, upstreamPort] = process.argv.slice(2, 4).map(Number);
const [, , , , dir] = process.argv;
const server = http2.createSecureServer({
	allowHTTP1: false,
	cert: readFileSync(`${dir}/cert.pem`),
	key: readFileSync(`${dir}/key.pem`),
});

const HOP = new Set([
	'connection',
	'keep-alive',
	'transfer-encoding',
	'upgrade',
	'proxy-connection',
]);

server.on('stream', (stream, headers) => {
	const path = headers[':path'];
	const method = headers[':method'];
	const forward = {};
	for (const [key, value] of Object.entries(headers)) {
		if (!key.startsWith(':')) {
			forward[key] = value;
		}
	}
	forward.host = `127.0.0.1:${upstreamPort}`;
	const upstream = http.request(
		{ headers: forward, host: '127.0.0.1', method, path, port: upstreamPort },
		(response) => {
			// The browser may cancel the stream (closed context, aborted
			// iframe) before the upstream answers.
			if (stream.destroyed || stream.closed) {
				response.resume();
				return;
			}
			const out = { ':status': response.statusCode };
			for (const [key, value] of Object.entries(response.headers)) {
				if (!HOP.has(key)) {
					out[key] = value;
				}
			}
			stream.respond(out);
			response.pipe(stream);
		}
	);
	stream.on('error', () => upstream.destroy());
	stream.on('close', () => upstream.destroy());
	upstream.on('error', () => {
		if (stream.destroyed || stream.closed) {
			return;
		}
		if (!stream.headersSent) {
			stream.respond({ ':status': 502 });
		}
		stream.end();
	});
	stream.pipe(upstream);
});
// Browser contexts close mid-stream; the session error needs no handling.
server.on('sessionError', () => undefined);
server.listen(listenPort, '127.0.0.1', () => {
	console.log(
		`h2 proxy https://127.0.0.1:${listenPort} -> http://127.0.0.1:${upstreamPort}`
	);
});
