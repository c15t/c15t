/**
 * Serves this site on http://localhost:4173. The page loads c15t from
 * jsDelivr, so there is nothing to build. Cookies need an http origin, so
 * opening `index.html` from disk is not enough to try accept and reload.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const files: Record<string, string> = {
	'/': 'index.html',
	'/index.html': 'index.html',
	'/posthog.js': 'posthog.js',
};
const here = (file: string) => fileURLToPath(new URL(file, import.meta.url));

if (process.argv.includes('--check')) {
	// `build` only checks that every served file is in place.
	const missing = Object.values(files).filter(
		(file) => !existsSync(here(file))
	);
	if (missing.length > 0) {
		console.error(`Missing ${missing.join(', ')}.`);
		process.exit(1);
	}
	process.exit(0);
}

const port = Number(process.env.PORT ?? 4173);

Bun.serve({
	fetch(request) {
		const file = files[new URL(request.url).pathname];
		if (!file) {
			return new Response('Not found', { status: 404 });
		}
		return new Response(Bun.file(here(file)));
	},
	port,
});

console.log(`http://localhost:${port}/`);
