// oxlint-disable no-await-in-loop -- Readiness polling must wait between connection attempts.
import { once } from 'node:events';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	startProcess,
	stopProcess as stop,
	waitForServer,
} from '../../../../scripts/browser-process';
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

/** One production app to build and serve against a fresh protocol fixture. */
export interface AppLaunch {
	id: string;
	/** Absolute app directory. */
	cwd: string;
	/** Build command arguments for `bun`. */
	build: string[];
	/** Start command arguments for `bun`. */
	start: (port: number) => string[];
	/** Build and start environment for the fixture's backend URL. */
	env: (backendURL: string, port: number) => NodeJS.ProcessEnv;
	/** Path polled until the server answers. */
	readyPath: string;
	/** Host in the base URL. Defaults to `127.0.0.1`. */
	host?: string;
}

export const startApp = async function startApp(app: AppLaunch) {
	const fixture = await startExampleFixture();
	const port = await availablePort();
	const env = app.env(fixture.backendURL, port);
	const { cwd } = app;
	const baseURL = `http://${app.host ?? '127.0.0.1'}:${port}`;
	const waitUntilReady = (server: ReturnType<typeof launch>) =>
		waitForServer(`${baseURL}${app.readyPath}`, server);
	let running: ReturnType<typeof launch> | undefined;
	try {
		// Public environment values are build inputs. Never reuse a build carrying
		// an earlier fixture port, and never substitute a development server.
		const build = launch(app.build, cwd, env);
		running = build;
		const [code] = await once(build.child, 'exit');
		if (code !== 0) {
			throw new Error(`${app.id} production build failed\n${build.logs()}`);
		}
		running = launch(app.start(port), cwd, env);
		await waitUntilReady(running);
		let server = running;
		return {
			backendURL: fixture.backendURL,
			baseURL,
			async close() {
				await stop(server.child);
				await fixture.close();
			},
			logs: () => server.logs(),
			/**
			 * Starts the same build again. `overrides` are added to the start
			 * environment only, as a deployment sets runtime variables.
			 */
			async restart(overrides: NodeJS.ProcessEnv = {}) {
				await stop(server.child);
				server = launch(app.start(port), cwd, { ...env, ...overrides });
				running = server;
				await waitUntilReady(server);
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

export const startExample = (target: ExampleTarget) =>
	startApp({
		build: target.build ?? ['run', 'build'],
		cwd: join(examplesDirectory, target.directory),
		env: (backendURL, port) => ({
			...exampleEnvironment(backendURL, port),
			...target.env,
		}),
		id: target.id,
		readyPath: target.routes[0] ?? '/',
		start: target.start,
	});
