/**
 * The JavaScript an app actually carries because c15t is installed.
 *
 * `measure/bundle.ts` counts the bytes `packages/react-native/dist` ships, which is
 * the right number for the tarball and the wrong one for "bundle-size impact". The
 * built barrel re-exports `lib/deny-all-snapshot.js`, that file imports
 * `@c15t/core/consent-categories`, and an app's bundler follows every edge: each
 * module reachable from the entry is in the bundle, whatever package it lives in,
 * and no amount of `import type` keeps one out.
 *
 * So this walks the built module graph from the entry and hands back the files the
 * c15t packages contribute. It reads import statements rather than loading modules,
 * which keeps it honest about files a bundler includes but a cold launch might skip,
 * and it names what it could not resolve instead of dropping it, because a silent
 * skip here would understate the number it exists to measure.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/** What a walk found. */
export interface ModuleClosure {
	/** Files contributed by the packages under `@c15t`, absolute. */
	files: string[];
	/** Specifiers that looked like a workspace package but did not resolve. */
	unresolved: string[];
	/** Bare specifiers outside `@c15t`, which an app carries anyway. */
	external: string[];
}

/** `from "./x.js"`, `from 'x'`, in an import or a re-export. */
const FROM_SPECIFIER = /(?:\bfrom|\bimport)\s*\(?\s*["'](?<spec>[^"']+)["']/gu;

/** A side-effect import: `import "./x.js";`. */
const BARE_IMPORT = /\bimport\s+["'](?<spec>[^"']+)["']/gu;

const specifiers = function specifiers(text: string): string[] {
	const found: string[] = [];
	for (const pattern of [FROM_SPECIFIER, BARE_IMPORT]) {
		for (const match of text.matchAll(pattern)) {
			const spec = match.groups?.spec;
			if (spec !== undefined) {
				found.push(spec);
			}
		}
	}
	return found;
};

/**
 * Split a bare specifier into its package and subpath.
 *
 * `@c15t/core` is a package, `@c15t/schema/types` is a subpath, and the second one
 * is what the built core imports. Treating the tail as the package name looked for
 * a `packages/types` that has never existed, which dropped a whole package out of
 * the closure and understated the number this file exists to get right.
 *
 * @param spec - Bare specifier, without a leading `.`.
 * @returns The package name and the export subpath, `.` when there is none.
 */
const splitSpecifier = function splitSpecifier(spec: string): {
	packageName: string;
	subpath: string;
} {
	const parts = spec.split('/');
	const scoped = spec.startsWith('@') && parts.length >= 2;
	const name = scoped ? `${parts[0]}/${parts[1]}` : (parts[0] ?? spec);
	const rest = parts.slice(scoped ? 2 : 1);
	return {
		packageName: name,
		subpath: rest.length > 0 ? `./${rest.join('/')}` : '.',
	};
};

/**
 * Resolve a workspace package's entry the way a bundler would.
 *
 * @param packageName - Bare package name, for example `@c15t/core`.
 * @param subpath - Export subpath, `.` for the package entry.
 * @param workspaceRoot - Repository root, where the workspace packages live.
 * @returns Absolute path, or `undefined` when nothing on disk answers the specifier.
 */
const resolveWorkspaceEntry = function resolveWorkspaceEntry(
	packageName: string,
	subpath: string,
	workspaceRoot: string
): string | undefined {
	const shortName = packageName.split('/').at(-1) ?? packageName;
	const packageDir = resolve(workspaceRoot, 'packages', shortName);
	const manifestPath = resolve(packageDir, 'package.json');

	if (!existsSync(manifestPath)) {
		return undefined;
	}

	const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
		exports?: Record<string, unknown> | string;
		main?: string;
	};

	/** First condition a bundler in this harness would take. */
	const pick = function pick(candidate: unknown): string | undefined {
		if (typeof candidate === 'string') {
			return candidate;
		}
		if (candidate === null || typeof candidate !== 'object') {
			return undefined;
		}
		const conditions = candidate as Record<string, unknown>;
		const chosen =
			conditions['react-native'] ??
			conditions.import ??
			conditions.default ??
			conditions.require;
		return typeof chosen === 'string' ? chosen : undefined;
	};

	const { exports } = manifest;
	let entry: string | undefined;

	if (typeof exports === 'string') {
		entry = subpath === '.' ? exports : undefined;
	} else if (exports !== undefined && exports !== null) {
		const map = exports as Record<string, unknown>;
		// A map that names subpaths says nothing about `.`, and one that names only
		// `.` says nothing about a subpath, so each is asked its own question.
		entry =
			subpath === '.'
				? pick(map['.'])
				: (pick(map[subpath]) ?? pick(map[`${subpath}.js`]));
	}

	if (entry === undefined && subpath === '.') {
		entry = manifest.main;
	}

	// A manifest with no entry for a subpath usually still has the file: the
	// workspace packages emit `dist/<subpath>.js` for every export they declare.
	const relative =
		entry ?? (subpath === '.' ? undefined : `dist/${subpath.slice(2)}.js`);

	if (relative === undefined) {
		return undefined;
	}

	const target = resolve(
		packageDir,
		relative.replace(/^\/+/u, '').replace(/^\.\//u, '')
	);

	return existsSync(target) ? target : undefined;
};

/**
 * Walk the built module graph from one entry.
 *
 * @param entryFile - Absolute path of the entry a consumer imports.
 * @param workspaceRoot - Repository root, used to resolve workspace packages.
 * @returns The files reached, plus anything that did not resolve.
 */
export const walkModuleClosure = function walkModuleClosure(
	entryFile: string,
	workspaceRoot: string
): ModuleClosure {
	const closure: ModuleClosure = { external: [], files: [], unresolved: [] };
	const seen = new Set<string>();
	const external = new Set<string>();
	const unresolved = new Set<string>();
	const queue = [entryFile];

	// The queue grows while it is walked, which is what an array iterator is fine
	// with: it reads the live length rather than a snapshot taken at the start.
	for (const file of queue) {
		if (file === undefined || seen.has(file) || !existsSync(file)) {
			continue;
		}
		if (!statSync(file).isFile()) {
			continue;
		}
		seen.add(file);

		for (const spec of specifiers(readFileSync(file, 'utf8'))) {
			if (spec.startsWith('.')) {
				const target = resolve(dirname(file), spec);
				if (existsSync(target)) {
					queue.push(target);
					continue;
				}
				// Bundlers require an extension in this output; a relative edge that
				// points at nothing is a broken artifact, not a skipped file.
				unresolved.add(`${file} -> ${spec}`);
				continue;
			}

			if (!spec.startsWith('@c15t/')) {
				external.add(spec);
				continue;
			}

			const { packageName, subpath } = splitSpecifier(spec);
			const target = resolveWorkspaceEntry(packageName, subpath, workspaceRoot);
			if (target === undefined) {
				unresolved.add(`${file} -> ${spec}`);
				continue;
			}
			queue.push(target);
		}
	}

	closure.files = [...seen].sort();
	closure.external = [...external].sort();
	closure.unresolved = [...unresolved].sort();
	return closure;
};
