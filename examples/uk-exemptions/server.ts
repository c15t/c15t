import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = dirname(fileURLToPath(import.meta.url));
const build = await Bun.build({
	entrypoints: [join(directory, 'app.ts')],
	plugins: [
		{
			name: 'workspace-runtime-exports',
			setup(builder) {
				// Workspace tsconfig paths target declaration files. Browser bundles
				// need the runtime exports of the packages built from this checkout.
				builder.onResolve(
					{ filter: /^@c15t\/(?:core|schema|translations)(?:\/.*)?$/u },
					async ({ path }) => {
						const [scope, name, ...subpath] = path.split('/');
						const packageDirectory = join(
							directory,
							'../../packages',
							name ?? ''
						);
						const manifest = (await Bun.file(
							join(packageDirectory, 'package.json')
						).json()) as { exports: Record<string, { import: string }> };
						const key = subpath.length ? `./${subpath.join('/')}` : '.';
						const entry = manifest.exports[key];
						if (scope !== '@c15t' || !entry) {
							throw new Error(`Unknown runtime export ${path}`);
						}
						return { path: join(packageDirectory, entry.import) };
					}
				);
			},
		},
	],
	target: 'browser',
	tsconfig: join(directory, 'tsconfig.json'),
});
if (!build.success || !build.outputs[0]) {
	throw new Error(`Demo build failed: ${build.logs.join('\n')}`);
}
const javascript = await build.outputs[0].text();
const files = new Map([
	['/', 'index.html'],
	['/index.html', 'index.html'],
	['/styles.css', 'styles.css'],
]);

const server = Bun.serve({
	fetch(request) {
		const path = new URL(request.url).pathname;
		const headers = { 'Cache-Control': 'no-store' };
		if (path === '/app.js') {
			return new Response(javascript, {
				headers: { ...headers, 'Content-Type': 'text/javascript' },
			});
		}
		const file = files.get(path);
		return file
			? new Response(Bun.file(join(directory, file)), { headers })
			: new Response('Not found', { status: 404 });
	},
	hostname: '0.0.0.0',
	port: 5173,
});
console.log(`UK exemptions demo: http://localhost:${server.port}`);
