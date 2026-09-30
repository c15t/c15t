import { once } from 'node:events';
import { createServer } from 'node:net';

import { expect, it, vi } from 'vitest';

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
	expect(
		server.child.exitCode !== null || server.child.signalCode !== null
	).toBe(true);
});

it('rejects a missing executable instead of waiting indefinitely', async () => {
	await expect(
		runCommand(['c15t-nonexistent-executable-fixture'])
	).rejects.toThrow();
});

it('terminates descendants and releases their listening port', async () => {
	const reservation = createServer();
	reservation.listen(0, '127.0.0.1');
	await once(reservation, 'listening');
	const address = reservation.address();
	if (!address || typeof address === 'string') {
		throw new Error('Expected a TCP port');
	}
	const { port } = address;
	const closed = once(reservation, 'close');
	reservation.close();
	await closed;
	const child = `const server = require('node:http').createServer((request, response) => response.end('ok')).listen(${port}, '127.0.0.1'); process.on('SIGTERM', () => setTimeout(() => { server.close(); process.exit(0); }, 250));`;
	const server = startProcess([
		'node',
		'-e',
		`require('node:child_process').spawn(process.execPath, ['-e', ${JSON.stringify(child)}], { stdio: 'ignore' }); setInterval(() => {}, 1000);`,
	]);
	try {
		await waitForServer(`http://127.0.0.1:${port}`, server);
	} finally {
		await stopProcess(server.child);
	}
	const rebound = createServer();
	try {
		rebound.listen(port, '127.0.0.1');
		await once(rebound, 'listening');
		expect(rebound.listening).toBe(true);
	} finally {
		rebound.close();
	}
});

it('checks the process table when the OS will not signal a finished group', async () => {
	const server = startProcess(['node', '-e', '']);
	await once(server.child, 'close');
	// macOS answers EPERM rather than ESRCH while the group's last member is
	// a zombie waiting to be reaped.
	const kill = vi.spyOn(process, 'kill').mockImplementation(() => {
		throw Object.assign(new Error('kill EPERM'), { code: 'EPERM' });
	});
	try {
		await expect(stopProcess(server.child)).resolves.toBeUndefined();
	} finally {
		kill.mockRestore();
	}
});
