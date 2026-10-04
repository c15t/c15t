/**
 * How Vite 8 (Rolldown), TanStack Start's bundler, splits the published
 * packages for a route that mounts the provider. Each first-load file is
 * one more request before the banner can show, and on HTTP/1.1 each costs
 * a phone about 13–15 ms.
 *
 * Rolldown keeps a module that lazy chunks share with the route in the
 * route's chunk only while its chunk graph has no static cycle, and its
 * cycle check counts every import record, used or not. One unused
 * re-export (`@c15t/ui/utils/dom` re-exporting `setupColorScheme`) was
 * enough to split every shared module into its own file: when it was
 * dropped, this fixture's provider route went from 15 first-load files to
 * 10, and its root route from 16 to 11.
 *
 * `ConsentRoot` brings the code that applies a streamed state with it, so
 * the banner doesn't wait for one more request after hydration. Here the
 * provider route loads that code on demand, so Rolldown gives it a chunk
 * of its own (and one for its runtime helpers) that the root route loads
 * first: 10 files there. An app whose routes all use `ConsentRoot` keeps it
 * in the root's chunk.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'vite';
import { describe, expect, test } from 'vitest';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

/** Two lazy routes, each mounting the provider, banner and dialog. */
const fixture: Record<string, string> = {
	entry:
		"globalThis.routes = [() => import('fixture:root-route'), () => import('fixture:provider-route')];",
	'provider-route': `import { createElement as h } from 'react';
import { ConsentBanner, ConsentDialog, ConsentProvider } from '@c15t/tanstack-start';
export default () => h(ConsentProvider, { options: { backendURL: '/api/c15t' } }, h(ConsentBanner), h(ConsentDialog));`,
	'root-route': `import { createElement as h } from 'react';
import { ConsentBanner, ConsentDialog, ConsentRoot } from '@c15t/tanstack-start';
export default () => h(ConsentRoot, { options: { backendURL: '/api/c15t' } }, h(ConsentBanner), h(ConsentDialog));`,
};

interface FirstLoad {
	files: string[];
	modules: string[];
}

/**
 * Builds the fixture against `dist/` and lists the files a route loads
 * first, with the modules in them.
 */
const routeFirstLoad = async function routeFirstLoad(
	route: string
): Promise<FirstLoad> {
	const result = await build({
		build: {
			minify: false,
			rolldownOptions: {
				external: [/^react(?:$|\/)/u, /^react-dom(?:$|\/)/u],
				input: 'fixture:entry',
			},
			write: false,
		},
		configFile: false,
		logLevel: 'silent',
		plugins: [
			{
				load: (id) =>
					id.startsWith('\0fixture:')
						? fixture[id.slice('\0fixture:'.length)]
						: undefined,
				name: 'fixture',
				resolveId: (id) => (id.startsWith('fixture:') ? `\0${id}` : undefined),
			},
		],
		publicDir: false,
		resolve: {
			alias: [
				{
					find: /^@c15t\/tanstack-start$/u,
					replacement: join(packageRoot, 'dist/index.js'),
				},
			],
		},
		root: packageRoot,
	});
	if (!('output' in result)) {
		throw new Error('expected a single build output');
	}
	const chunks = new Map(
		result.output.flatMap((item) =>
			item.type === 'chunk' ? [[item.fileName, item] as const] : []
		)
	);
	const routeChunk = [...chunks.values()].find(
		(chunk) => chunk.facadeModuleId === `\0fixture:${route}`
	);
	if (!routeChunk) {
		throw new Error(`no chunk for ${route}`);
	}
	const firstLoad = new Set<string>();
	const pending = [routeChunk.fileName];
	for (let file = pending.pop(); file; file = pending.pop()) {
		if (!firstLoad.has(file)) {
			firstLoad.add(file);
			pending.push(
				...(chunks.get(file)?.imports ?? []).filter((dep) => chunks.has(dep))
			);
		}
	}
	return {
		files: [...firstLoad].sort(),
		modules: [...firstLoad].flatMap((file) =>
			Object.keys(chunks.get(file)?.modules ?? {})
		),
	};
};

const streamedInitModule = /core\/dist\/runtime\/streamed-init\.js$/u;

describe('TanStack Start client chunks', () => {
	test.each([
		['root-route', 10],
		['provider-route', 8],
	])(
		'a %s loads at most %i files first',
		async (route, bound) => {
			// The route, the app entry, the provider chunk and five chunks of
			// helpers Rolldown still keeps apart: it checks each helper before
			// the shared module that imports it, and never revisits it. The
			// root route adds the streamed-state resolver and its helpers.
			const { files } = await routeFirstLoad(route);
			expect(files.length, files.join('\n')).toBeLessThanOrEqual(bound);
		},
		60_000
	);

	test('a root route applies a streamed state with code it loads first', async () => {
		const { modules } = await routeFirstLoad('root-route');
		expect(modules.some((id) => streamedInitModule.test(id))).toBe(true);
	}, 60_000);

	test('a provider route leaves that code to load on demand', async () => {
		const { modules } = await routeFirstLoad('provider-route');
		expect(modules.some((id) => streamedInitModule.test(id))).toBe(false);
	}, 60_000);
});
