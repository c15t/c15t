import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import type { TestProject } from 'vitest/node';

import './provided-context';

const HOST = '127.0.0.1';

const getFreePort = async function getFreePort(): Promise<number> {
	const server = createServer();
	server.listen(0, HOST);
	await once(server, 'listening');
	const address = server.address();
	const port = typeof address === 'object' && address ? address.port : 0;
	server.close();
	await once(server, 'close');
	return port;
};

const resolveNextBin = function resolveNextBin(appDir: string): string {
	const require = createRequire(join(appDir, 'package.json'));
	return require.resolve('next/dist/bin/next');
};

const run = async function run(
	args: string[],
	appDir: string,
	label: string,
	command: string = process.execPath
): Promise<void> {
	const child = spawn(command, args, {
		cwd: appDir,
		env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
		stdio: ['ignore', 'pipe', 'pipe'],
	});
	let logs = '';
	child.stdout.on('data', (chunk) => {
		logs += String(chunk);
	});
	child.stderr.on('data', (chunk) => {
		logs += String(chunk);
	});
	// `once` rejects if the child emits `error` before it exits.
	const [code] = (await once(child, 'exit')) as [number | null];
	if (code !== 0) {
		throw new Error(`${label} failed (exit ${code})\n${logs}`);
	}
};

const isServerReady = async function isServerReady(
	url: string
): Promise<boolean> {
	try {
		const response = await fetch(url);
		return response.ok;
	} catch {
		return false;
	}
};

const MAX_WAIT_ATTEMPTS = 240;

const waitForServer = async function waitForServer(
	baseURL: string,
	child: ChildProcess,
	attempt = 0
): Promise<void> {
	if (attempt >= MAX_WAIT_ATTEMPTS) {
		throw new Error(`Timed out waiting for ${baseURL}`);
	}
	if (child.exitCode !== null) {
		throw new Error(`next start exited early with code ${child.exitCode}`);
	}
	if (await isServerReady(`${baseURL}/api/c15t/__compat/requests`)) {
		return;
	}
	await sleep(250);
	return waitForServer(baseURL, child, attempt + 1);
};

export default async function setup(project: TestProject) {
	const appDir = project.config.root;
	const nextBin = resolveNextBin(appDir);

	if (
		process.env.COMPAT_SKIP_BUILD !== '1' &&
		(process.env.COMPAT_FORCE_BUILD === '1' ||
			!existsSync(join(appDir, '.next', 'BUILD_ID')))
	) {
		// The cell's build script installs the packed packages before `next build`.
		await run(['run', 'build'], appDir, 'bun run build', 'bun');
	}

	const port = await getFreePort();
	const baseURL = `http://${HOST}:${port}`;
	const server = spawn(
		process.execPath,
		[nextBin, 'start', '--hostname', HOST, '--port', String(port)],
		{
			cwd: appDir,
			env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
			stdio: ['ignore', 'pipe', 'pipe'],
		}
	);
	let serverLogs = '';
	server.stdout?.on('data', (chunk) => {
		serverLogs += String(chunk);
	});
	server.stderr?.on('data', (chunk) => {
		serverLogs += String(chunk);
	});

	try {
		await waitForServer(baseURL, server);
	} catch (error) {
		server.kill('SIGTERM');
		throw new Error(`${(error as Error).message}\n${serverLogs}`, {
			cause: error,
		});
	}

	project.provide('compatBaseURL', baseURL);
	project.provide('compatAppDir', appDir);

	return async () => {
		if (server.exitCode === null) {
			server.kill('SIGTERM');
			await Promise.race([
				once(server, 'exit'),
				sleep(5_000).then(() => server.kill('SIGKILL')),
			]);
		}
		if (process.env.COMPAT_PRINT_SERVER_LOGS === '1') {
			console.log(serverLogs);
		}
	};
}
