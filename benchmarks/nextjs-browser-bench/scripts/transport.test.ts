import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

import { chromium } from 'playwright';
import type { Browser } from 'playwright';
import { afterAll, beforeAll, expect, test, vi } from 'vitest';

let server: ChildProcess;
let browser: Browser;
let baseURL: string;
let serverLogs = '';

beforeAll(async () => {
	// Build first with `bun run build`; these checks always use next start.
	const socket = createServer();
	socket.listen(0, '127.0.0.1');
	await once(socket, 'listening');
	const address = socket.address();
	if (!address || typeof address === 'string') {
		throw new Error('No test port');
	}
	const { port } = address;
	socket.close();
	await once(socket, 'close');
	baseURL = `http://127.0.0.1:${port}`;
	server = spawn(
		process.execPath,
		['node_modules/next/dist/bin/next', 'start', '--port', String(port)],
		{
			env: {
				...process.env,
				NEXT_TELEMETRY_DISABLED: '1',
				NODE_ENV: 'production',
			},
			stdio: ['ignore', 'pipe', 'pipe'],
		}
	);
	server.stderr?.on('data', (chunk) => {
		serverLogs += String(chunk);
	});
	await vi.waitFor(
		async () => {
			if (server.exitCode !== null) {
				throw new Error(serverLogs);
			}
			const response = await fetch(`${baseURL}/api/bench-consent/stats`);
			if (!response.ok) {
				throw new Error('Production server is not ready');
			}
		},
		{ timeout: 20_000 }
	);
	browser = await chromium.launch({ headless: true });
});

afterAll(async () => {
	await browser?.close();
	if (server && server.exitCode === null) {
		const exited = once(server, 'exit');
		server.kill('SIGTERM');
		await Promise.race([exited, delay(5000)]);
		if (server.exitCode === null) {
			server.kill('SIGKILL');
		}
	}
});

test.each([
	['/ssr', 1],
	['/manifest-ssr', 0],
	['/rsc-ssr', 0],
] as const)(
	'%s submits its recorded choice to the backend',
	async (path, expectedInit) => {
		await fetch(`${baseURL}/api/bench-consent/stats`, { method: 'POST' });
		const context = await browser.newContext();
		try {
			const page = await context.newPage();
			await page.goto(`${baseURL}${path}`);
			await page.getByTestId('consent-banner-accept-button').click();
			await expect
				.poll(async () => {
					const response = await fetch(`${baseURL}/api/bench-consent/stats`);
					return (await response.json()) as { init: number; subjects: number };
				})
				.toMatchObject({ init: expectedInit, subjects: 1 });
		} finally {
			await context.close();
		}
	}
);
