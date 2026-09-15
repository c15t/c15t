// oxlint-disable no-await-in-loop -- Readiness polling must wait between connection attempts.
import { once } from 'node:events';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	startProcess,
	stopProcess as stop,
	waitForServer,
} from '../../../scripts/browser-process';
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

const launch = (args: string[], cwd: string, env: NodeJS.ProcessEnv) =>
	startProcess(['bun', ...args], { cwd, env });

const waitUntilReady = (
	server: ReturnType<typeof launch>,
	baseURL: string,
	target: ExampleTarget
) => waitForServer(`${baseURL}${target.routes[0]}`, server);

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
