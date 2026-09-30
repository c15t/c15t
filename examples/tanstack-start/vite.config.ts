import { fileURLToPath } from 'node:url';

import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

import { regionPreviewHeaders } from './scripts/region-preview.mjs';

/**
 * Rendering variant under test. Each swaps only the root route, so the
 * pages stay the same:
 *
 * - unset: `src/routes/__root.tsx`, the server resolves consent and the
 *   loader awaits it.
 * - `streamed`: the loader streams the pending consent state.
 * - `same-origin`: the browser talks to the `/api/c15t` server route.
 * - `static`: every page is prerendered and the browser resolves consent.
 */
const rendering = process.env.C15T_TANSTACK_RENDERING;
const variants = new Set(['same-origin', 'static', 'streamed']);
if (rendering && !variants.has(rendering)) {
	throw new Error(`Unknown C15T_TANSTACK_RENDERING ${rendering}`);
}

/**
 * `C15T_EXPERIMENT=1` swaps in `src/experiment-root.tsx`: the default root
 * plus the banner-shape experiment, run per request with `?experiment=1`.
 */
const experiment = process.env.C15T_EXPERIMENT === '1';
if (experiment && rendering) {
	throw new Error(
		'C15T_EXPERIMENT runs on the default root; unset C15T_TANSTACK_RENDERING'
	);
}
const rootFile = experiment
	? 'src/experiment-root.tsx'
	: rendering && `src/rendering/${rendering}-root.tsx`;

const rootVariant = (): Plugin => ({
	enforce: 'pre',
	name: 'example-root-variant',
	resolveId(source, importer) {
		if (
			!rootFile ||
			!importer?.endsWith('routeTree.gen.ts') ||
			source !== './routes/__root'
		) {
			return null;
		}
		return fileURLToPath(new URL(rootFile, import.meta.url));
	},
});

/** Development counterpart of the region preview in `scripts/serve.mjs`. */
const regionPreview = (): Plugin => ({
	configureServer(server) {
		server.middlewares.use((request, _response, next) => {
			const host = request.headers.host ?? 'localhost';
			const headers = regionPreviewHeaders(
				`http://${host}${request.url ?? '/'}`,
				request.headers.referer
			);
			Object.assign(request.headers, headers);
			next();
		});
	},
	name: 'example-region-preview',
});

export default defineConfig(({ command }) => {
	// Development uses the self-hosted backend in
	// `src/routes/api/self-host/$.ts`, so `bun run dev` needs no setup.
	// `src/test-backend.ts` applies `VITE_C15T_BACKEND_URL` over the
	// placeholder URL in the root routes; the acceptance suite sets it for
	// production builds.
	if (command === 'serve' && !process.env.VITE_C15T_BACKEND_URL) {
		process.env.VITE_C15T_BACKEND_URL = '/api/self-host';
	}
	return {
		// Only the default `VITE_` prefix reaches `import.meta.env`. Server-only
		// `C15T_*` secrets stay in `process.env` and never enter a bundle.
		plugins: [
			regionPreview(),
			rootVariant(),
			tanstackStart(
				rendering === 'static' ? { prerender: { enabled: true } } : {}
			),
			viteReact(),
		],
	};
});
