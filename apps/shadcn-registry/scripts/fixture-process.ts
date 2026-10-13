/**
 * Child processes for the fixtures. Output goes to the fixture's log file,
 * so the console only shows one line per fixture.
 */
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { createServer } from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';

// shadcn picks a package manager from the user agent when the folder has
// no lockfile yet, and npm isn't always installed.
const env = {
	...process.env,
	NEXT_TELEMETRY_DISABLED: '1',
	npm_config_user_agent: 'bun/1.3.11',
};

/** Runs a command to completion. Resolves with whether it exited cleanly. */
export const run = (
	command: string,
	commandArgs: string[],
	cwd: string,
	log: string
): Promise<boolean> =>
	new Promise((resolve) => {
		const out = createWriteStream(log, { flags: 'a' });
		out.write(`\n$ ${command} ${commandArgs.join(' ')}\n`);
		const child = spawn(command, commandArgs, {
			cwd,
			env,
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		child.stdout.pipe(out, { end: false });
		child.stderr.pipe(out, { end: false });
		child.on('error', (error) => {
			out.end(`${error.message}\n`);
			resolve(false);
		});
		child.on('close', (code) => {
			out.end();
			resolve(code === 0);
		});
	});

/** A port nothing listens on right now. */
export const freePort = (): Promise<number> =>
	new Promise((resolve, reject) => {
		const server = createServer();
		server.on('error', reject);
		server.listen(0, '127.0.0.1', () => {
			const address = server.address();
			server.close(() => {
				if (address && typeof address === 'object') {
					resolve(address.port);
				} else {
					reject(new Error('The OS gave no port.'));
				}
			});
		});
	});

/**
 * Starts a server and waits until `url` answers.
 *
 * @returns A function that stops the server and everything it spawned.
 * @throws {Error} When the server exits or doesn't answer within a minute.
 */
export const start = async (
	command: string,
	commandArgs: string[],
	cwd: string,
	log: string,
	url: string
): Promise<() => Promise<void>> => {
	const out = createWriteStream(log, { flags: 'a' });
	out.write(`\n$ ${command} ${commandArgs.join(' ')}\n`);
	// Detached, so the server gets its own process group and stop() can end
	// the workers it forks too.
	const child = spawn(command, commandArgs, {
		cwd,
		detached: true,
		env,
		stdio: ['ignore', 'pipe', 'pipe'],
	});
	child.stdout.pipe(out, { end: false });
	child.stderr.pipe(out, { end: false });
	const exited = new Promise<void>((resolve) => {
		child.on('close', () => resolve());
		child.on('error', () => resolve());
	});
	const running = () => child.exitCode === null && child.signalCode === null;

	const stop = async () => {
		if (running() && child.pid) {
			process.kill(-child.pid, 'SIGTERM');
		}
		await exited;
		out.end();
	};

	const deadline = Date.now() + 60_000;
	while (running() && Date.now() < deadline) {
		try {
			// oxlint-disable-next-line no-await-in-loop -- Polls until the server is up.
			const response = await fetch(url);
			if (response.status < 500) {
				return stop;
			}
		} catch {
			// Not listening yet.
		}
		// oxlint-disable-next-line no-await-in-loop -- Polls until the server is up.
		await sleep(250);
	}
	await stop();
	throw new Error(`${command} ${commandArgs[0]} didn't answer at ${url}`);
};
