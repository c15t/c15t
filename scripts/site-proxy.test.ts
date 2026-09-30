import { once } from 'node:events';
import { request } from 'node:http';
import type { Server } from 'node:http';

import { afterEach, expect, it, vi } from 'vitest';

import { createSiteProxy } from '../benchmarks/reports/cold-start-decomposition-2026-09-25/harness/site-proxy.mjs';

const servers: Server[] = [];

afterEach(async () => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	for (const server of servers.splice(0)) {
		// oxlint-disable-next-line no-await-in-loop -- Close each server owned by this test.
		await new Promise<void>((resolve, reject) => {
			server.close((error) => (error ? reject(error) : resolve()));
		});
	}
});

const get = async (path: string) => {
	const server = createSiteProxy();
	servers.push(server);
	server.listen(0, '127.0.0.1');
	await once(server, 'listening');
	const address = server.address();
	if (!address || typeof address === 'string') {
		throw new Error('Site proxy has no TCP address');
	}
	return new Promise<{
		body: string;
		status: number | undefined;
		contentType: string | undefined;
	}>((resolve, reject) => {
		const pending = request(
			{ hostname: '127.0.0.1', path, port: address.port },
			(response) => {
				let body = '';
				response.setEncoding('utf8');
				response.on('data', (chunk: string) => {
					body += chunk;
				});
				response.on('end', () =>
					resolve({
						body,
						contentType: response.headers['content-type'],
						status: response.statusCode,
					})
				);
			}
		);
		pending.on('error', reject);
		pending.end();
	});
};

it.each([
	'/init?next=https://attacker.example',
	'//attacker.example/init',
	'https://attacker.example/init',
])('keeps upstream requests on the local gateway for %s', async (path) => {
	const fetchUpstream = vi.fn().mockResolvedValue(new Response('{}'));
	vi.stubGlobal('fetch', fetchUpstream);
	expect((await get(path)).status).toBe(200);
	expect(fetchUpstream).toHaveBeenCalledOnce();
	const [target, options] = fetchUpstream.mock.calls[0] ?? [];
	expect(target).toBeInstanceOf(URL);
	expect(target.origin).toBe('http://127.0.0.1:4130');
	expect(target.pathname).toBe('/local/london/gateway-alpha/init');
	expect(options.redirect).toBe('error');
});

it('returns a plain upstream error without exception details or HTML', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn().mockRejectedValue(new Error('<script>private stack trace</script>'))
	);
	vi.spyOn(console, 'error').mockImplementation(() => undefined);
	expect(await get('/init')).toEqual({
		body: 'Upstream request failed',
		contentType: 'text/plain; charset=utf-8',
		status: 502,
	});
});
