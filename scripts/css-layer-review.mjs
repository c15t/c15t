import { spawn } from 'node:child_process';
import net from 'node:net';

const routes = [
	'/matrix/banner/baseline',
	'/matrix/banner/relay',
	'/matrix/dialog/relay',
];

const apps = [
	['Preview shell', 'http://localhost:3120'],
	['Tailwind 3', 'http://localhost:3121'],
	['Tailwind 4', 'http://localhost:3122'],
	['Plain CSS', 'http://localhost:3123'],
];

function assertPortAvailable(port) {
	return new Promise((resolve, reject) => {
		const server = net.createServer();

		server.once('error', (error) => {
			reject(error);
		});

		server.listen(port, () => {
			server.close(() => resolve());
		});
	});
}

console.log('c15t CSS layer review');
console.log('');

for (const [label, url] of apps) {
	console.log(`${label}: ${url}`);
}

console.log('');
console.log('Preview routes:');

for (const route of routes) {
	console.log(`- http://localhost:3120${route}`);
}

console.log('');
console.log(
	'If this is the first run after dependency changes, run `bun run css-layer:build` in another shell first.'
);
console.log('');

const requiredPorts = [3120, 3121, 3122, 3123];

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
