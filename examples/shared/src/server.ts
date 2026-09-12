// oxlint-disable no-await-in-loop -- Readiness polling must wait between connection attempts.
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import { startExampleFixture } from './fixture';
import type { ExampleTarget } from './targets';
import { exampleEnvironment } from './targets';

const examplesDirectory = fileURLToPath(new URL('../..', import.meta.url));

const availablePort = async function availablePort(): Promise<number> {
	const server = createServer();
	server.listen(0, '127.0.0.1');
	await once(server, 'listening');
	const address = server.address();
	if (!address || typeof address === 'string') {
		throw new Error('No example port');
	}
	const { port } = address;
	server.close();
	await once(server, 'close');
	return port;
};

const launch = function launch(
	args: string[],
	cwd: string,
	env: NodeJS.ProcessEnv
) {
	const child = spawn('bun', args, {
		cwd,
		detached: process.platform !== 'win32',
		env,
		stdio: ['ignore', 'pipe', 'pipe'],
	});
	let log = '';
	const capture = (chunk: Buffer) => {
		log = `${log}${String(chunk)}`.slice(-30_000);
	};
	child.stdout.on('data', capture);
	child.stderr.on('data', capture);
	return { child, logs: () => log };
};

const stop = async function stop(child: ChildProcess): Promise<void> {
	if (child.exitCode !== null || !child.pid) {
		return;
	}
	const exited = once(child, 'exit');
	try {
		if (process.platform === 'win32') {
			child.kill('SIGTERM');
		} else {
			process.kill(-child.pid, 'SIGTERM');
		}
	} catch {
		return;
	}
	await Promise.race([exited, delay(5000)]);
	if (child.exitCode === null) {
		try {
			if (process.platform === 'win32') {
				child.kill('SIGKILL');
			} else {
				process.kill(-child.pid, 'SIGKILL');
			}
		} catch {
			/* Process already exited. */
		}
	}
};

const waitUntilReady = async function waitUntilReady(
	server: ReturnType<typeof launch>,
	baseURL: string,
	target: ExampleTarget
): Promise<void> {
	const deadline = Date.now() + 60_000;
	let ready = false;
	while (Date.now() < deadline) {
		if (server.child.exitCode !== null) {
			throw new Error(`${target.id} server exited\n${server.logs()}`);
		}
		try {
			const response = await fetch(`${baseURL}${target.routes[0]}`, {
				signal: AbortSignal.timeout(2000),
			});
			if (response.ok) {
				ready = true;
				break;
			}
		} catch {
			/* Wait for the production server to listen. */
		}
		await delay(200);
	}
	if (!ready) {
		throw new Error(
			`${target.id} server did not become ready\n${server.logs()}`
		);
	}
};

export const startExample = async function startExample(target: ExampleTarget) {
	const fixture = await startExampleFixture();
	const port = await availablePort();
	const env = exampleEnvironment(fixture.backendURL, port);
	const cwd = join(examplesDirectory, target.directory);
	let running: ReturnType<typeof launch> | undefined;
	try {
		// Public environment values are build inputs. Never reuse a build carrying
		// an earlier fixture port, and never substitute a development server.
		const build = launch(['run', 'build'], cwd, env);
		running = build;
		const [code] = await once(build.child, 'exit');
		if (code !== 0) {
			throw new Error(`${target.id} production build failed\n${build.logs()}`);
		}
		running = launch(target.start(port), cwd, env);
		const baseURL = `http://127.0.0.1:${port}`;
		await waitUntilReady(running, baseURL, target);
		let server = running;
		return {
			backendURL: fixture.backendURL,
			baseURL,
			async close() {
				await stop(server.child);
				await fixture.close();
			},
			logs: () => server.logs(),
			async restart() {
				await stop(server.child);
				server = launch(target.start(port), cwd, env);
				running = server;
				await waitUntilReady(server, baseURL, target);
			},
			setFailure: fixture.setFailure,
		};
	} catch (error) {
		if (running) {
			await stop(running.child);
		}
		await fixture.close();
		throw error;
	}
};
