/// <reference types="node" />
/**
 * What `clientMode()` puts in a page's first-load JavaScript.
 *
 * A server-framework root resolves the visitor's state on the server, so for
 * `manifest()` (resolved on the server) and `hosted()` the browser needs the
 * record transport and the init-request builder, nothing more. These tests
 * bundle an entry for the browser with every `import()` left external, which
 * is exactly the code a page loads before any lazy chunk, and look for
 * marker strings in it: the manifest resolver, the recommended offline
 * policy pack, English and German base copy. Each lazy target is bundled
 * the same way, recursively, and every marker must turn up there, so a
 * renamed string can't make a test pass vacuously.
 *
 * Dynamic imports stay external rather than split into chunks: esbuild
 * places shared code by file, so its shared chunks can carry code a
 * tree-shaken page never runs.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';
import type { Plugin } from 'esbuild';
import { describe, expect, test } from 'vitest';

const SOURCE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Strings that only appear in one piece of code each. */
const MARKERS = {
	// English base copy (`@c15t/translations`).
	englishCopy: 'Customize your privacy settings here.',
	// German base copy (`@c15t/translations/de`).
	germanCopy: 'Anbieter ({count})',
	// A rule id in `recommendedPolicyRules()`, the offline default pack.
	offlinePolicy: 'quebec_opt_in',
	// An error the manifest resolver throws (`@c15t/schema`).
	resolver: 'Unsupported pack field',
} as const;

type Marker = keyof typeof MARKERS;

interface StaticBundle {
	/** The bundled static graph. */
	text: string;
	/** Resolved paths of the modules it loads with `import()`. */
	lazy: string[];
}

/** Bundles the static graph of an entry, leaving every `import()` out. */
const bundleStatic = async function bundleStatic(
	entry: { contents: string } | { path: string }
): Promise<StaticBundle> {
	const lazy = new Set<string>();
	const lazyExternal: Plugin = {
		name: 'lazy-external',
		setup(pluginBuild) {
			// esbuild filters are Go regular expressions, which take no flags.
			// oxlint-disable-next-line require-unicode-regexp
			pluginBuild.onResolve({ filter: /.*/ }, async (args) => {
				if (args.kind !== 'dynamic-import') {
					return undefined;
				}
				const resolved = await pluginBuild.resolve(args.path, {
					kind: 'import-statement',
					resolveDir: args.resolveDir,
				});
				lazy.add(resolved.path);
				return { external: true, path: args.path };
			});
		},
	};
	const result = await build({
		bundle: true,
		format: 'esm',
		logLevel: 'silent',
		platform: 'browser',
		plugins: [lazyExternal],
		write: false,
		...('contents' in entry
			? {
					stdin: {
						contents: entry.contents,
						loader: 'ts' as const,
						resolveDir: SOURCE_DIR,
					},
				}
			: { entryPoints: [entry.path] }),
	});
	return { lazy: [...lazy], text: result.outputFiles[0]?.text ?? '' };
};

/**
 * First-load text of an entry, and the text of everything it can load
 * later through `import()`, however deep.
 */
const bundleWithLazy = async function bundleWithLazy(
	contents: string
): Promise<{ firstLoad: string; lazy: string }> {
	const first = await bundleStatic({ contents });
	const seen = new Set<string>();
	const pending = [...first.lazy];
	const lazyTexts: string[] = [];
	while (pending.length > 0) {
		const path = pending.pop() as string;
		if (seen.has(path)) {
			continue;
		}
		seen.add(path);
		// One at a time: each bundle names the next modules to visit.
		// oxlint-disable-next-line no-await-in-loop
		const next = await bundleStatic({ path });
		lazyTexts.push(next.text);
		pending.push(...next.lazy);
	}
	return { firstLoad: first.text, lazy: lazyTexts.join('\n') };
};

const markersIn = (text: string): Marker[] =>
	(Object.keys(MARKERS) as Marker[])
		.filter((marker) => text.includes(MARKERS[marker]))
		.sort();

const ALL_MARKERS = (Object.keys(MARKERS) as Marker[]).sort();

const clientModeEntry = (mode: string): string => `
import { hosted, manifest, offline } from './modes';
import { clientMode } from './runtime/client-mode';

export const mode = clientMode(${mode}, {
	backendURL: 'https://your-project.inth.app',
	routePrefix: '/api/c15t',
});
`;

describe('clientMode() first-load JavaScript', () => {
	test.each([
		['manifest()', 'manifest()'],
		["manifest({ resolve: 'browser' })", "manifest({ resolve: 'browser' })"],
		['hosted()', "hosted({ backendURL: 'https://other.example' })"],
		['offline()', 'offline()'],
	])(
		'%s ships no resolver, policy pack or copy',
		async (_name, mode) => {
			const { firstLoad, lazy } = await bundleWithLazy(clientModeEntry(mode));

			expect(markersIn(firstLoad)).toEqual([]);
			// Behind `import()`: the browser resolver, one chunk per language,
			// and offline mode with its pack.
			expect(markersIn(lazy)).toEqual(ALL_MARKERS);
		},
		60_000
	);
});

describe('manifest-browser first-load JavaScript', () => {
	test('bundles the resolver with English only; other languages are lazy', async () => {
		const { firstLoad, lazy } = await bundleWithLazy(`
import { manifest } from './transports/manifest-browser';

export const mode = manifest({ backendURL: '' });
`);

		expect(markersIn(firstLoad)).toEqual(['englishCopy', 'resolver']);
		expect(markersIn(lazy)).toContain('germanCopy');
	}, 60_000);
});
