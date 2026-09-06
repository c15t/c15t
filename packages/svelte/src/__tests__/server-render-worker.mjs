import { resolve } from 'node:path';

import { svelte } from '@sveltejs/vite-plugin-svelte';
import { createServer } from 'vite';

const { props, fixture } = JSON.parse(process.argv[2]);
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
try {
	const module = await server.ssrLoadModule(
		resolve('src/__tests__/server-entry.ts')
	);
	process.stdout.write(JSON.stringify(module.renderFixture(props, fixture)));
} finally {
	await server.close();
}
