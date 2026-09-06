import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import type { TestProject } from 'vitest/node';

import { startFixtureServer } from '../fixture/standalone';
import type { FixtureServer } from '../fixture/standalone';
import { readCellConfig } from './cell-config';
import './provided-context';
import { startStaticServer } from './static-server';

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
	command: string = process.execPath,
	env: Record<string, string> = {}
): Promise<void> {
	const child = spawn(command, args, {
		cwd: appDir,
		env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', ...env },
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

const shouldBuild = function shouldBuild(built: boolean): boolean {
	return (
		process.env.COMPAT_SKIP_BUILD !== '1' &&
		(process.env.COMPAT_FORCE_BUILD === '1' || !built)
	);
};

/**
 * Default mode: `next build` (when needed), then `next start` serves the app
 * together with the stub mounted inside it.
 */
const setupServer = async function setupServer(
	project: TestProject,
	appDir: string
) {
	const nextBin = resolveNextBin(appDir);

	if (shouldBuild(existsSync(join(appDir, '.next', 'BUILD_ID')))) {
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
};

/**
 * Records which backend URL the export was built against. The URL is baked
 * into the bundle through `NEXT_PUBLIC_COMPAT_BACKEND_URL`, so a later run
 * can only reuse `out/` if the stub comes back on the same port.
 */
const STATIC_EXPORT_MARKER = join('.next', 'compat-static-export.json');

interface StaticExportMarker {
	backendURL: string;
}

const readStaticExportMarker = function readStaticExportMarker(
	appDir: string
): StaticExportMarker | undefined {
	const markerPath = join(appDir, STATIC_EXPORT_MARKER);
	if (!existsSync(markerPath)) {
		return undefined;
	}
	try {
		return JSON.parse(readFileSync(markerPath, 'utf8')) as StaticExportMarker;
	} catch {
		return undefined;
	}
};

const portOf = function portOf(url: string | undefined): number {
	if (!url) {
		return 0;
	}
	try {
		return Number(new URL(url).port) || 0;
	} catch {
		return 0;
	}
};

/**
 * Binds the stub to the port the last export was built against when it is
 * still free, so an unchanged `out/` stays valid; otherwise takes any port.
 */
const startStub = async function startStub(
	preferredPort: number
): Promise<FixtureServer> {
	if (preferredPort !== 0) {
		try {
			return await startFixtureServer({ host: HOST, port: preferredPort });
		} catch {
			// Taken by another process; a fresh port forces a rebuild below.
		}
	}
	return startFixtureServer({ host: HOST, port: 0 });
};

/**
 * Static export mode: the stub runs on its own port, `next build` writes
 * `out/` with the stub's absolute URL baked in, and a static file server
 * serves `out/`. Nothing else runs; there is no server to start.
 */
const setupStaticExport = async function setupStaticExport(
	project: TestProject,
	appDir: string
) {
	const marker = readStaticExportMarker(appDir);
	const stub = await startStub(portOf(marker?.backendURL));
	const { backendURL } = stub;

	try {
		const built =
			existsSync(join(appDir, 'out', 'index.html')) &&
			marker?.backendURL === backendURL;
		if (shouldBuild(built)) {
			await run(['run', 'build'], appDir, 'bun run build', 'bun', {
				NEXT_PUBLIC_COMPAT_BACKEND_URL: backendURL,
			});
			writeFileSync(
				join(appDir, STATIC_EXPORT_MARKER),
				JSON.stringify({ backendURL } satisfies StaticExportMarker)
			);
		}
	} catch (error) {
		await stub.close();
		throw error;
	}

	const staticServer = await startStaticServer(join(appDir, 'out'), HOST);

	project.provide('compatBaseURL', staticServer.url);
	project.provide('compatAppDir', appDir);
	project.provide('compatBackendURL', stub.url);

	return async () => {
		await staticServer.close();
		await stub.close();
	};
};

export default async function setup(project: TestProject) {
	const appDir = project.config.root;
	const { mode } = await readCellConfig(appDir);
	return mode === 'static-export'
		? setupStaticExport(project, appDir)
		: setupServer(project, appDir);
}
