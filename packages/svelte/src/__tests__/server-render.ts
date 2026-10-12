import { spawn } from 'node:child_process';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { resolve as resolvePath } from 'node:path';
import { createInterface } from 'node:readline';

import type { ConsentSnapshot } from '@c15t/core';

export interface SsrRenderResult {
	html: string;
	prompt: ConsentSnapshot['promptRequirement'];
	now: number;
}

interface WorkerReply {
	id: number;
	result?: unknown;
	error?: string;
}

interface PendingRequest {
	reject: (reason: Error) => void;
	resolve: (value: unknown) => void;
}

/**
 * One render worker per test file. The worker boots Vite and compiles the
 * fixtures once; every request after that reuses the warm server. Requests
 * sent before the worker is ready queue in its stdin pipe, so there is no
 * per-call fallback spawn on any path. Call `warmSsrWorker` from a
 * `beforeAll` with a generous timeout so the boot never lands inside a
 * per-test budget, and `closeSsrWorker` from `afterAll`.
 */
let worker: ChildProcessWithoutNullStreams | undefined;
let exited: Promise<void> | undefined;
const pending = new Map<number, PendingRequest>();
let nextId = 0;

const failPending = (reason: Error) => {
	for (const request of pending.values()) {
		request.reject(reason);
	}
	pending.clear();
};

const startWorker = () => {
	const child = spawn(
		process.execPath,
		[resolvePath('src/__tests__/server-render-worker.mjs')],
		{ stdio: ['pipe', 'pipe', 'pipe'] }
	);
	let stderr = '';
	child.stderr.on('data', (chunk: Buffer) => {
		stderr += chunk.toString();
	});
	const lines = createInterface({ input: child.stdout });
	lines.on('line', (line) => {
		if (!line.trim()) {
			return;
		}
		const reply = JSON.parse(line) as WorkerReply;
		const request = pending.get(reply.id);
		if (!request) {
			return;
		}
		pending.delete(reply.id);
		if (reply.error === undefined) {
			request.resolve(reply.result);
		} else {
			request.reject(new Error(reply.error));
		}
	});
	// oxlint-disable-next-line promise/avoid-new -- Resolves when the child process ends.
	exited = new Promise<void>((resolve) => {
		child.once('exit', (code) => {
			if (worker === child) {
				worker = undefined;
			}
			failPending(
				new Error(
					`Server render worker exited with code ${code ?? 'null'}${stderr ? `\n${stderr}` : ''}`
				)
			);
			resolve();
		});
	});
	// Never keep the test process alive because of the worker.
	child.unref();
	child.stdout.unref();
	child.stderr.unref();
	child.stdin.unref();
	process.once('exit', () => {
		child.kill();
	});
	return child;
};

const send = (request: Record<string, unknown>): Promise<unknown> => {
	worker ??= startWorker();
	const child = worker;
	const id = nextId;
	nextId += 1;
	// oxlint-disable-next-line promise/avoid-new -- Correlates one stdout line with one request.
	return new Promise<unknown>((resolve, reject) => {
		pending.set(id, { reject, resolve });
		child.stdin.write(`${JSON.stringify({ ...request, id })}\n`);
	});
};

/** Render in Node so the compiler and its typed arrays share a realm. */
export const renderSsr = (
	props: Record<string, unknown>,
	fixture: string
): Promise<SsrRenderResult> =>
	send({ fixture, props }) as Promise<SsrRenderResult>;

/** Boot the worker and load the fixtures so no test pays for it. */
export const warmSsrWorker = async (): Promise<void> => {
	await send({ warm: true });
};

/** Close the worker's stdin and wait for it to exit. */
export const closeSsrWorker = async (): Promise<void> => {
	const child = worker;
	if (!child) {
		return;
	}
	worker = undefined;
	child.stdin.end();
	await exited;
};
