/**
 * Optional peers that a dependency imports anyway.
 *
 * A package can list a module as an optional peer dependency and still import
 * it at the top of its entry point. npm installs it by accident when another
 * package pulls it in; pnpm and Yarn do not, so the import fails as soon as
 * the backend loads. `hono-openapi` does this with `@hono/standard-validator`.
 *
 * This reads each runtime dependency's ESM entry and requires every optional
 * peer it imports statically to be a dependency or peer dependency of
 * `@c15t/backend` itself.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assert, describe, it } from '@effect/vitest';

interface PackageManifest {
	name: string;
	main?: string;
	module?: string;
	exports?: unknown;
	dependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	peerDependenciesMeta?: Record<string, { optional?: boolean }>;
}

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const readManifest = (path: string): PackageManifest =>
	JSON.parse(readFileSync(path, 'utf8')) as PackageManifest;
const backend = readManifest(join(packageRoot, 'package.json'));
const declared = new Set([
	...Object.keys(backend.dependencies ?? {}),
	...Object.keys(backend.peerDependencies ?? {}),
]);

/** Finds an installed package directory the way Node walks `node_modules`. */
const findPackageDir = (name: string): string | undefined => {
	let dir = packageRoot;
	while (true) {
		const candidate = join(dir, 'node_modules', name);
		if (existsSync(join(candidate, 'package.json'))) {
			return candidate;
		}
		const parent = dirname(dir);
		if (parent === dir) {
			return undefined;
		}
		dir = parent;
	}
};

/** Resolves the file an `import` of the package's root loads. */
const importEntry = (manifest: PackageManifest): string | undefined => {
	let target: unknown = manifest.exports;
	if (target && typeof target === 'object' && '.' in target) {
		target = (target as Record<string, unknown>)['.'];
	}
	while (target && typeof target === 'object') {
		const conditions = target as Record<string, unknown>;
		target = conditions.import ?? conditions.default ?? conditions.node;
	}
	return typeof target === 'string'
		? target
		: (manifest.module ?? manifest.main);
};

const staticImport =
	/(?:^|[\s;])(?:import|export)[^'"]*?from\s*['"](?<specifier>[^'"]+)['"]/gu;
const bareImport = /(?:^|[\s;])import\s*['"](?<specifier>[^'"]+)['"]/gu;

const packageName = (specifier: string): string =>
	specifier.startsWith('@')
		? specifier.split('/').slice(0, 2).join('/')
		: (specifier.split('/')[0] ?? specifier);

describe('runtime dependencies', () => {
	it('declares every optional peer a dependency imports unconditionally', () => {
		const missing: string[] = [];
		for (const name of Object.keys(backend.dependencies ?? {})) {
			const dir = findPackageDir(name);
			if (!dir) {
				continue;
			}
			const manifest = readManifest(join(dir, 'package.json'));
			const optionalPeers = Object.entries(manifest.peerDependenciesMeta ?? {})
				.filter(([, meta]) => meta.optional)
				.map(([peer]) => peer);
			const entry = importEntry(manifest);
			if (optionalPeers.length === 0 || !entry) {
				continue;
			}
			const source = readFileSync(join(dir, entry), 'utf8');
			const imported = new Set(
				[...source.matchAll(staticImport), ...source.matchAll(bareImport)]
					.map((match) => match.groups?.specifier)
					.filter((specifier): specifier is string => Boolean(specifier))
					.map(packageName)
			);
			for (const peer of optionalPeers) {
				if (imported.has(peer) && !declared.has(peer)) {
					missing.push(`${name} imports optional peer ${peer}`);
				}
			}
		}
		assert.deepStrictEqual(missing, []);
	});
});
