import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import { afterAll, beforeAll, describe, expect, inject, test } from 'vitest';

const HOST = '127.0.0.1';
const PRERENDER_ERROR =
	/unstable value|blocking-prerender|synchronous (?:I\/O|IO)|sync IO/iu;

const getFreePort = async () => {
	const listener = createServer();
	listener.listen(0, HOST);
	await once(listener, 'listening');
	const address = listener.address();
	listener.close();
	await once(listener, 'close');
	if (!address || typeof address === 'string') {
		throw new Error('Could not allocate a port for next dev');
	}
	return address.port;
};

const waitForDevServer = async (
	baseURL: string,
	server: ChildProcess,
	getLogs: () => string,
	deadline = Date.now() + 60_000
): Promise<void> => {
	if (
		server.exitCode !== null ||
		server.signalCode !== null ||
		Date.now() >= deadline
	) {
		throw new Error(`next dev did not become ready\n${getLogs()}`);
	}
	try {
		const response = await fetch(`${baseURL}/api/c15t/__compat/requests`, {
			signal: AbortSignal.timeout(5_000),
		});
		if (response.ok) {
			return;
		}
	} catch {
		// The port is not listening yet, or the route is still compiling.
	}
	await sleep(250);
	return waitForDevServer(baseURL, server, getLogs, deadline);
};

describe('Next 16 / Cache Components / partial prefetching / dev prerender', () => {
	let server: ChildProcess;
	let baseURL: string;
	let logs = '';

	const stopServer = async () => {
		if (server && server.exitCode === null && server.signalCode === null) {
			const closed = once(server, 'close');
			const timeout = setTimeout(() => server.kill('SIGKILL'), 5_000);
			server.kill('SIGTERM');
			try {
				await closed;
			} finally {
				clearTimeout(timeout);
			}
		}
	};

	beforeAll(async () => {
		const appDir = inject('compatAppDir');
		const require = createRequire(join(appDir, 'package.json'));
		const port = await getFreePort();
		baseURL = `http://${HOST}:${port}`;
		// Global setup installs the packed packages and builds the production
		// app. Next 16 keeps this dev server's output separately in .next/dev.
		server = spawn(
			process.execPath,
			[
				require.resolve('next/dist/bin/next'),
				'dev',
				'--hostname',
				HOST,
				'--port',
				String(port),
			],
			{
				cwd: appDir,
				env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
				stdio: ['ignore', 'pipe', 'pipe'],
			}
		);
		server.stdout?.on('data', (chunk) => {
			logs += String(chunk);
		});
		server.stderr?.on('data', (chunk) => {
			logs += String(chunk);
		});

		await waitForDevServer(baseURL, server, () => logs);
	});

	afterAll(stopServer);

	test('renders awaited, streaming and fallback consent without sync IO errors', async () => {
		const routes = [
			['/ssr', 'resolveConsent on a dynamic route.'],
			['/ssr-stream', 'resolveConsent passed as a promise on a dynamic route.'],
			['/ssr-fallback', 'Fallback consent: DE, manifest failed: true'],
		] as const;
		await Promise.all(
			routes.map(async ([path, marker]) => {
				const response = await fetch(`${baseURL}${path}`, {
					headers: { 'x-vercel-ip-country': 'DE' },
					signal: AbortSignal.timeout(60_000),
				});
				const html = await response.text();

				expect(response.status, html).toBe(200);
				expect(html).toContain(marker);
				expect(html).not.toMatch(PRERENDER_ERROR);
			})
		);
		// Dev prerender diagnostics can arrive after the HTTP response. Read
		// all output through shutdown before asserting that the server is clean.
		await stopServer();
		expect(logs).not.toMatch(PRERENDER_ERROR);
	});
});
