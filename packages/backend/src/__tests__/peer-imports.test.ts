/**
 * Peers that a dependency imports at load time.
 *
 * A package can list a module as a peer dependency and import it at the top
 * of its entry point. npm, pnpm and Bun install required peers for you, and
 * npm sometimes installs optional ones by accident when another package pulls
 * them in. Yarn installs neither, and pnpm skips optional peers, so the import
 * fails as soon as the backend loads. `hono-openapi` imports
 * `@hono/standard-validator` (an optional peer) and
 * `@standard-community/standard-json` and
 * `@standard-community/standard-openapi` (required peers) this way, and
 * `standard-json` imports its required peer `quansync`.
 *
 * This reads each runtime dependency's ESM entry, follows its relative static
 * imports, and requires every peer it imports to be a dependency or peer
 * dependency of `@c15t/backend` itself. Type-only peers and peers loaded with
 * dynamic `import()` are not flagged; the second test covers the one dynamic
 * peer the backend needs.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
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

/** Resolves a relative import to a file, trying the bare path and `.js`. */
const resolveRelative = (from: string, specifier: string) =>
	[specifier, `${specifier}.js`, `${specifier}/index.js`]
		.map((candidate) => join(dirname(from), candidate))
		.find((path) => existsSync(path) && statSync(path).isFile());

/** Packages a module and its relative static imports load. */
const staticallyImportedPackages = (entry: string): Set<string> => {
	const packages = new Set<string>();
	const pending = [entry];
	const seen = new Set<string>();
	for (let file = pending.pop(); file; file = pending.pop()) {
		if (seen.has(file)) {
			continue;
		}
		seen.add(file);
		const source = readFileSync(file, 'utf8');
		for (const match of [
			...source.matchAll(staticImport),
			...source.matchAll(bareImport),
		]) {
			const specifier = match.groups?.specifier;
			if (!specifier) {
				continue;
			}
			if (specifier.startsWith('.')) {
				const resolved = resolveRelative(file, specifier);
				if (resolved) {
					pending.push(resolved);
				}
			} else if (!specifier.startsWith('node:')) {
				packages.add(packageName(specifier));
			}
		}
	}
	return packages;
};

describe('runtime dependencies', () => {
	it('declares every peer a dependency imports when it loads', () => {
		const missing: string[] = [];
		for (const name of Object.keys(backend.dependencies ?? {})) {
			const dir = findPackageDir(name);
			if (!dir) {
				missing.push(`${name} is not installed, so it cannot be checked`);
				continue;
			}
			const manifest = readManifest(join(dir, 'package.json'));
			const peers = Object.keys(manifest.peerDependencies ?? {});
			const entry = importEntry(manifest);
			if (peers.length === 0) {
				continue;
			}
			if (!entry) {
				missing.push(`${name} has peers but no entry to check`);
				continue;
			}
			const imported = staticallyImportedPackages(join(dir, entry));
			for (const peer of peers) {
				if (imported.has(peer) && !declared.has(peer)) {
					missing.push(`${name} imports peer ${peer}`);
				}
			}
		}
		assert.deepStrictEqual(missing, []);
	});

	it('declares the converter the OpenAPI spec loads for Valibot schemas', () => {
		// The spec route converts the Valibot schemas passed to hono-openapi's
		// validator(). standard-json loads @valibot/to-json-schema for that with
		// a dynamic import, and lists it only as an optional peer, so no package
		// manager installs it and /spec.json fails with MissingDependencyError.
		assert.isTrue(declared.has('@valibot/to-json-schema'));
	});
});
