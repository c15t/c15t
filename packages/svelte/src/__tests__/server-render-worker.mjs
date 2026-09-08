import { resolve } from 'node:path';
/**
 * Long-lived server-render worker for the Svelte test suite.
 *
 * Booting a Vite server and compiling the fixtures costs most of a second
 * even on an idle machine and several seconds on a loaded CI runner, so the
 * process stays up for the whole test file and answers one render request
 * per stdin line: `{ id, fixture, props }` in, `{ id, result }` or
 * `{ id, error }` out. Passing a single JSON argument instead keeps the old
 * one-shot behaviour for ad hoc use.
 */
import { createInterface } from 'node:readline';

import { svelte } from '@sveltejs/vite-plugin-svelte';
import { createServer } from 'vite';

const server = await createServer({
	configFile: false,
	logLevel: 'silent',
	plugins: [svelte()],
	root: process.cwd(),
	server: { hmr: false, middlewareMode: true },
	ssr: {
		noExternal: ['@c15t/svelte'],
		resolve: { conditions: ['node', 'svelte'] },
	},
});

const module = await server.ssrLoadModule(
	resolve('src/__tests__/server-entry.ts')
);

const render = ({ fixture, props }) => module.renderFixture(props, fixture);

if (process.argv[2]) {
	try {
		process.stdout.write(JSON.stringify(render(JSON.parse(process.argv[2]))));
	} finally {
		await server.close();
	}
} else {
	const lines = createInterface({ input: process.stdin });
	for await (const line of lines) {
		if (!line.trim()) {
			continue;
		}
		const request = JSON.parse(line);
		let reply;
		try {
			// A warm request only proves the server is up and the entry loaded.
			reply = {
				id: request.id,
				result: request.warm ? { ready: true } : render(request),
			};
		} catch (error) {
			reply = {
				error: error instanceof Error ? error.message : String(error),
				id: request.id,
			};
		}
		process.stdout.write(`${JSON.stringify(reply)}\n`);
	}
	await server.close();
}
