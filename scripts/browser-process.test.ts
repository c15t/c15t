import { expect, it } from 'vitest';

import {
	runCommand,
	startProcess,
	stopProcess,
	waitForServer,
} from './browser-process';

it('reports command failures with diagnostic output', async () => {
	await expect(
		runCommand([
			'node',
			'-e',
			'console.error("fixture failed"); process.exit(3)',
		])
	).rejects.toThrow('fixture failed');
});

it('fails promptly when a server exits and allows repeated cleanup', async () => {
	const server = startProcess(['node', '-e', 'process.exit(2)']);
	await expect(waitForServer('http://127.0.0.1:1', server)).rejects.toThrow(
		'Server exited'
	);
	await stopProcess(server.child);
	await stopProcess(server.child);
});

it('terminates a running server', async () => {
	const server = startProcess(['node', '-e', 'setInterval(() => {}, 1000)']);
	await stopProcess(server.child);
	expect(server.child.signalCode).toBe('SIGTERM');
});
