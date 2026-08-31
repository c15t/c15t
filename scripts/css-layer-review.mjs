import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import net from 'node:net';
import { resolve } from 'node:path';

const createDeferredPromise = function createDeferredPromise(run) {
	const deferred = Promise.withResolvers();
	run(deferred.resolve, deferred.reject);
	return deferred.promise;
};

const routes = [
	'/matrix/banner/baseline',
	'/matrix/banner/relay',
	'/matrix/dialog/relay',
	'/v3-matrix/banner',
	'/v3-matrix/dialog',
	'/v3-matrix/widget',
];

const apps = [
	{
		dir: 'benchmarks/css-layer-preview',
		label: 'Preview shell',
		port: 3120,
		url: 'http://localhost:3120',
	},
	{
		dir: 'benchmarks/tw3-test',
		label: 'Tailwind 3',
		port: 3121,
		url: 'http://localhost:3121',
	},
	{
		dir: 'benchmarks/tw4-test',
		label: 'Tailwind 4',
		port: 3122,
		url: 'http://localhost:3122',
	},
	{
		dir: 'benchmarks/no-tw-test',
		label: 'Plain CSS',
		port: 3123,
		url: 'http://localhost:3123',
	},
];

const assertPortAvailable = function assertPortAvailable(port) {
	// oxlint-disable-next-line no-shadow -- Local fixture name matches the framework callback contract.
	return createDeferredPromise((resolve, reject) => {
		const server = net.createServer();

		server.once('error', (error) => {
			reject(error);
		});

		server.listen(port, () => {
			server.close(() => resolve());
		});
	});
};

console.log('c15t CSS layer review');
console.log('');

for (const { label, url } of apps) {
	console.log(`${label}: ${url}`);
}

console.log('');
console.log('Preview routes:');

for (const route of routes) {
	console.log(`- http://localhost:3120${route}`);
}

console.log('');
console.log(
	'If this is the first run after dependency changes, run `bun run compat:styles:build` in another shell first.'
);
console.log('');

const requiredPorts = apps.map((app) => app.port);

try {
	await Promise.all(requiredPorts.map((port) => assertPortAvailable(port)));
} catch (error) {
	if (error && typeof error === 'object' && 'port' in error) {
		console.error(
			`Port ${error.port} is already in use. Stop the existing process and try again.`
		);
		process.exit(1);
	}

	throw error;
}

for (const { dir } of apps) {
	rmSync(resolve(process.cwd(), dir, '.next'), {
		force: true,
		recursive: true,
	});
}

const child = spawn(
	'bunx',
	[
		'turbo',
		'run',
		'dev',
		'--only',
		'--filter=@c15t/css-layer-preview',
		'--filter=@c15t/tw3-css-test',
		'--filter=@c15t/tw4-css-test',
		'--filter=@c15t/no-tw-css-test',
	],
	{
		stdio: 'inherit',
	}
);

child.on('exit', (code, signal) => {
	if (signal) {
		process.kill(process.pid, signal);
		return;
	}

	process.exit(code ?? 0);
});
