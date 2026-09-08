/**
 * Serves the playground on http://localhost:4173 against the built `dist/`.
 *
 * ```sh
 * bun run --cwd packages/browser build
 * bun packages/browser/playground/serve.ts
 * ```
 *
 * Cookies need an http origin, so `file://` is not enough to try a full
 * accept/reload cycle.
 */
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const port = Number(process.env.PORT ?? 4173);

Bun.serve({
	fetch(request) {
		const { pathname } = new URL(request.url);
		const file = pathname === '/' ? '/playground/index.html' : pathname;
		return new Response(Bun.file(`${root}${file}`));
	},
	port,
});

console.log(`@c15t/browser playground: http://localhost:${port}/`);
