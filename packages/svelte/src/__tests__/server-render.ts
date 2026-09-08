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

interface PendingRender {
	reject: (reason: Error) => void;
	resolve: (value: SsrRenderResult) => void;
}

/**
 * One render worker per test file. The first call pays for the Vite boot
 * and fixture compilation; later calls reuse the warm server, which keeps
 * each SSR scenario well inside the default test timeout on a loaded
 * runner.
 */
let worker: ChildProcessWithoutNullStreams | undefined;
const pending = new Map<number, PendingRender>();
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
		const reply = JSON.parse(line) as {
			id: number;
			result?: SsrRenderResult;
			error?: string;
		};
		const request = pending.get(reply.id);
		if (!request) {
			return;
		}
		pending.delete(reply.id);
		if (reply.result) {
			request.resolve(reply.result);
		} else {
			request.reject(new Error(reply.error ?? 'Server render failed'));
		}
	});
	child.once('exit', (code) => {
		if (worker === child) {
			worker = undefined;
		}
		failPending(
			new Error(
				`Server render worker exited with code ${code ?? 'null'}${stderr ? `\n${stderr}` : ''}`
			)
		);
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

/** Render in Node so the compiler and its typed arrays share a realm. */
export const renderSsr = (
	props: Record<string, unknown>,
	fixture: string
): Promise<SsrRenderResult> => {
	worker ??= startWorker();
	const child = worker;
	const id = nextId;
	nextId += 1;
	// oxlint-disable-next-line promise/avoid-new -- Correlates one stdout line with one request.
	return new Promise<SsrRenderResult>((resolve, reject) => {
		pending.set(id, { reject, resolve });
		child.stdin.write(`${JSON.stringify({ fixture, id, props })}\n`);
	});
};
