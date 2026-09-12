import { execFile, spawn } from 'node:child_process';
import type { ChildProcess, SpawnOptions } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const startProcess = function startProcess(
	command: string[],
	options: SpawnOptions = {}
) {
	const [executable] = command;
	if (!executable) {
		throw new Error('A server command is required.');
	}
	const child = spawn(executable, command.slice(1), {
		...options,
		detached: process.platform !== 'win32',
		stdio: ['ignore', 'pipe', 'pipe'],
	});
	let log = '';
	const capture = (chunk: Buffer) => {
		log = `${log}${String(chunk)}`.slice(-30_000);
	};
	child.stdout?.on('data', capture);
	child.stderr?.on('data', capture);
	// Keep launch errors available to readiness checks as well as command callers.
	child.on('error', (error) => {
		log += error.message;
	});
	return { child, logs: () => log };
};

const processGroupAlive = async (pid: number): Promise<boolean> => {
	try {
		process.kill(-pid, 0);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ESRCH') {
			return false;
		}
		throw error;
	}
	// Zombies retain a process-group ID but have already released their resources.
	const { stdout } = await execFileAsync('ps', ['-A', '-o', 'pgid=,stat=']);
	return stdout.split('\n').some((line) => {
		const [group, state] = line.trim().split(/\s+/u);
		return (
			Number(group) === pid && state !== undefined && !state.startsWith('Z')
		);
	});
};

export const stopProcess = async function stopProcess(
	child: ChildProcess
): Promise<void> {
	if (!child.pid) {
		return;
	}
	const { pid } = child;
	let stopped =
		(child.exitCode !== null || child.signalCode !== null) &&
		[child.stdout, child.stderr].every((stream) => !stream || stream.destroyed);
	child.once('close', () => {
		stopped = true;
	});
	const done = async () =>
		stopped &&
		(process.platform === 'win32' || !(await processGroupAlive(pid)));
	if (await done()) {
		return;
	}
	const kill = async (signal: NodeJS.Signals) => {
		try {
			if (process.platform === 'win32') {
				await execFileAsync('taskkill', ['/PID', String(pid), '/T', '/F']);
			} else {
				process.kill(-pid, signal);
			}
		} catch (error) {
			if (
				(error as NodeJS.ErrnoException).code !== 'ESRCH' &&
				!(await done())
			) {
				throw error;
			}
		}
	};
	const wait = async () => {
		const deadline = Date.now() + 5000;
		while (Date.now() < deadline) {
			// oxlint-disable-next-line no-await-in-loop -- Wait for the complete group to release resources.
			if (await done()) {
				return true;
			}
			// oxlint-disable-next-line no-await-in-loop -- Bound process-table polling.
			await delay(50);
		}
		return false;
	};
	await kill('SIGTERM');
	if (await wait()) {
		return;
	}
	await kill('SIGKILL');
	if (!(await wait())) {
		throw new Error(`Process group ${pid} did not stop after SIGKILL`);
	}
};

export const runCommand = async function runCommand(
	command: string[],
	options: SpawnOptions = {}
): Promise<void> {
	const running = startProcess(command, options);
	running.child.stdout?.pipe(process.stdout, { end: false });
	running.child.stderr?.pipe(process.stderr, { end: false });
	const [code, signal] = await once(running.child, 'close');
	if (code !== 0) {
		throw new Error(
			`${command.join(' ')} failed (${code ?? signal})\n${running.logs()}`
		);
	}
};

export const waitForServer = async function waitForServer(
	url: string,
	server: ReturnType<typeof startProcess>,
	timeout = 60_000
): Promise<void> {
	const deadline = Date.now() + timeout;
	while (Date.now() < deadline) {
		if (
			!server.child.pid ||
			server.child.exitCode !== null ||
			server.child.signalCode !== null
		) {
			throw new Error(
				`Server exited before ${url} was ready\n${server.logs()}`
			);
		}
		try {
			// oxlint-disable-next-line no-await-in-loop -- Poll readiness in sequence.
			const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
			if (response.ok) {
				return;
			}
		} catch {
			/* Retry until the server is ready or the deadline expires. */
		}
		// oxlint-disable-next-line no-await-in-loop -- Bound polling frequency.
		await delay(200);
	}
	throw new Error(`Server did not become ready at ${url}\n${server.logs()}`);
};
