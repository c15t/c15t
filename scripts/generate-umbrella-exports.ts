#!/usr/bin/env bun

/**
 * Generates the `c15t` umbrella package (`packages/c15t`) from the exports
 * maps of the scoped packages it mirrors.
 *
 * The umbrella is a facade: `npm i c15t` installs `@c15t/core`,
 * `@c15t/react`, and `@c15t/nextjs`, and every umbrella subpath re-exports
 * the matching scoped subpath (`c15t/react/hooks` ≡ `@c15t/react/hooks`).
 * The mirrored packages are config-driven (`UMBRELLA_SOURCES`), so mounting
 * another framework package later is a single config entry.
 *
 * What gets generated into `packages/c15t`:
 *
 * - The `exports` map (plus `main`/`module`/`types`), written into
 *   `package.json` in place.
 * - Committed re-export shims under `shims/` — one `.js`/`.cjs`/`.d.ts`
 *   triplet per conditional subpath. They are committed (not built) for the
 *   same reason `packages/react/client/` is: the repo stays reviewable and
 *   installable without a generation step.
 *
 * Design decisions:
 *
 * - **Wildcard subpaths** (`./primitives/*`): the umbrella keeps a single
 *   wildcard exports entry pointing into `shims/`, but the shim files behind
 *   it are enumerated at generation time from the scoped package's `src/`
 *   tree (the packages build bundleless, so `src/primitives/*.ts` is exactly
 *   `dist/primitives/*.js`). `verify-package-artifacts` matches wildcard
 *   manifest targets against files on disk, so the enumerated shims keep it
 *   passing while the manifest stays one entry per wildcard. A primitive
 *   added to the scoped package requires regeneration — the drift test in
 *   `generate-umbrella-exports.test.ts` fails CI until then.
 * - **CSS subpaths**: an exports target cannot point into another package,
 *   so CSS entries become real files under `dist/` that the umbrella's build
 *   step copies from the scoped package's built `dist/`
 *   (`packages/c15t/scripts/copy-distribution-css.ts`, following the
 *   `generate-distribution-css` pattern).
 * - **Default exports**: `export *` does not forward `default`, so shims add
 *   `export { default }` only where the scoped entry module itself declares
 *   a default export. The entry module is resolved from committed sources:
 *   the `client/` shim file when the import condition points at one,
 *   otherwise the `src/` module mapped from the `types` condition.
 * - **'use client' targets**: the scoped client entries are themselves
 *   directive-carrying shims (`packages/react/client/**`), which establish
 *   their own client boundary — a plain re-export would suffice. The
 *   generated shims still mirror the directive, matching the committed
 *   `@c15t/nextjs` client shims, which re-export `@c15t/react` client
 *   entries under their own `'use client'` banner.
 */

import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizePackagePath } from './manifest-utils';

export interface UmbrellaSource {
	/** Workspace directory under `packages/` that holds the scoped package. */
	directory: string;
	/** Published package name the generated shims import from. */
	packageName: string;
	/**
	 * Umbrella subpath prefix. `''` mounts the package at the umbrella root
	 * (`.` and every subpath verbatim); `'react'` mounts `.` at `./react` and
	 * `./hooks` at `./react/hooks`.
	 */
	prefix: string;
}

/**
 * The scoped packages the umbrella mirrors, in emission order.
 *
 * Note the deliberate asymmetry: the umbrella subpath for `@c15t/nextjs` is
 * `next`, while the scoped package name stays `@c15t/nextjs`.
 */
export const UMBRELLA_SOURCES: UmbrellaSource[] = [
	{ directory: 'core', packageName: '@c15t/core', prefix: '' },
	{ directory: 'react', packageName: '@c15t/react', prefix: 'react' },
	{ directory: 'nextjs', packageName: '@c15t/nextjs', prefix: 'next' },
];

export type ConditionalExport = Record<string, string>;
export type ExportsMapValue = string | ConditionalExport;
export type ExportsMap = Record<string, ExportsMapValue>;

export interface EntryModuleInfo {
	/** The entry module declares a default export the shim must forward. */
	hasDefaultExport: boolean;
	/** The entry module opens with a `'use client'` directive. */
	isClientModule: boolean;
}

/**
 * A scoped package prepared for umbrella generation. The analysis callbacks
 * are injected so the mapping logic stays testable with fixture manifests.
 */
export interface SourcePackage {
	config: UmbrellaSource;
	exports: ExportsMap;
	/**
	 * Analyzes the module behind a concrete (wildcard-substituted) subpath.
	 */
	analyzeEntry(subpath: string, entry: ConditionalExport): EntryModuleInfo;
	/**
	 * Enumerates the concrete names a wildcard subpath expands to.
	 */
	expandWildcard(subpath: string, entry: ConditionalExport): string[];
}

export interface CssCopy {
	/** Copy target relative to `packages/c15t` (always under `dist/`). */
	target: string;
	/** Scoped package directory under `packages/`. */
	sourceDirectory: string;
	/** Copy source relative to the scoped package root. */
	sourcePath: string;
}

export interface UmbrellaArtifacts {
	exports: ExportsMap;
	/** Generated shim files, relative to `packages/c15t`. */
	shimFiles: Record<string, string>;
	/** CSS files the umbrella build step copies from scoped `dist/`. */
	cssCopies: CssCopy[];
}

const GENERATED_BANNER =
	'// Generated by scripts/generate-umbrella-exports.ts — do not edit.';

const SHIM_EXTENSIONS: Record<string, string> = {
	types: '.d.ts',
	import: '.js',
	require: '.cjs',
};

function mapSubpath(prefix: string, subpath: string): string {
	if (!prefix) {
		return subpath;
	}
	if (subpath === '.') {
		return `./${prefix}`;
	}
	return `./${prefix}/${subpath.slice(2)}`;
}

function toSpecifier(packageName: string, subpath: string): string {
	if (subpath === '.') {
		return packageName;
	}
	return `${packageName}/${subpath.slice(2)}`;
}

function toShimBase(umbrellaSubpath: string): string {
	if (umbrellaSubpath === '.') {
		return 'shims/index';
	}
	return `shims/${umbrellaSubpath.slice(2)}`;
}

function renderEsmShim(specifier: string, info: EntryModuleInfo): string {
	const lines: string[] = [];
	if (info.isClientModule) {
		lines.push("'use client';", '');
	}
	lines.push(GENERATED_BANNER, `export * from '${specifier}';`);
	if (info.hasDefaultExport) {
		lines.push(`export { default } from '${specifier}';`);
	}
	return `${lines.join('\n')}\n`;
}

function renderCjsShim(specifier: string, info: EntryModuleInfo): string {
	const lines: string[] = [];
	if (info.isClientModule) {
		lines.push("'use client';", '');
	}
	lines.push(GENERATED_BANNER, `module.exports = require('${specifier}');`);
	return `${lines.join('\n')}\n`;
}

function renderTypesShim(specifier: string, info: EntryModuleInfo): string {
	const lines: string[] = [GENERATED_BANNER, `export * from '${specifier}';`];
	if (info.hasDefaultExport) {
		lines.push(`export { default } from '${specifier}';`);
	}
	return `${lines.join('\n')}\n`;
}

function renderShimCondition(
	condition: string,
	specifier: string,
	info: EntryModuleInfo
): string {
	if (condition === 'types') {
		return renderTypesShim(specifier, info);
	}
	if (condition === 'require') {
		return renderCjsShim(specifier, info);
	}
	return renderEsmShim(specifier, info);
}

function buildConditionalEntry(
	source: SourcePackage,
	subpath: string,
	entry: ConditionalExport,
	umbrellaSubpath: string,
	shimFiles: Record<string, string>
): ConditionalExport {
	const shimBase = toShimBase(umbrellaSubpath);
	const specifier = toSpecifier(source.config.packageName, subpath);
	const info = source.analyzeEntry(subpath, entry);
	const mapped: ConditionalExport = {};

	for (const condition of Object.keys(entry)) {
		const extension = SHIM_EXTENSIONS[condition];
		if (!extension) {
			throw new Error(
				`Unsupported export condition ${JSON.stringify(condition)} on ${source.config.packageName} ${subpath}. Teach generate-umbrella-exports.ts how to mirror it.`
			);
		}

		const shimPath = `${shimBase}${extension}`;
		shimFiles[shimPath] = renderShimCondition(condition, specifier, info);
		mapped[condition] = `./${shimPath}`;
	}

	return mapped;
}

function buildCssEntry(
	source: SourcePackage,
	subpath: string,
	target: string,
	umbrellaSubpath: string,
	cssCopies: CssCopy[]
): string {
	if (!subpath.endsWith('.css')) {
		throw new Error(
			`Unsupported string export ${subpath} -> ${target} on ${source.config.packageName}. Only CSS subpaths can be mirrored as copied files.`
		);
	}

	const sourcePath = normalizePackagePath(target);
	if (!sourcePath) {
		throw new Error(
			`Export target ${target} on ${source.config.packageName} ${subpath} does not stay inside the package.`
		);
	}

	const copyTarget = `dist/${umbrellaSubpath.slice(2)}`;
	cssCopies.push({
		target: copyTarget,
		sourceDirectory: source.config.directory,
		sourcePath,
	});
	return `./${copyTarget}`;
}

function buildWildcardEntry(
	source: SourcePackage,
	subpath: string,
	entry: ConditionalExport,
	umbrellaSubpath: string,
	shimFiles: Record<string, string>
): ConditionalExport {
	const names = source.expandWildcard(subpath, entry);
	if (names.length === 0) {
		throw new Error(
			`Wildcard export ${subpath} on ${source.config.packageName} matched no modules.`
		);
	}

	for (const name of names) {
		const concreteSubpath = subpath.replace('*', name);
		const concreteEntry: ConditionalExport = {};
		for (const [condition, target] of Object.entries(entry)) {
			concreteEntry[condition] = target.replace('*', name);
		}
		buildConditionalEntry(
			source,
			concreteSubpath,
			concreteEntry,
			umbrellaSubpath.replace('*', name),
			shimFiles
		);
	}

	const shimBase = toShimBase(umbrellaSubpath);
	const mapped: ConditionalExport = {};
	for (const condition of Object.keys(entry)) {
		const extension = SHIM_EXTENSIONS[condition];
		if (!extension) {
			throw new Error(
				`Unsupported export condition ${JSON.stringify(condition)} on ${source.config.packageName} ${subpath}. Teach generate-umbrella-exports.ts how to mirror it.`
			);
		}
		mapped[condition] = `./${shimBase}${extension}`;
	}
	return mapped;
}

/**
 * Derives the umbrella exports map, shim files, and CSS copy list from the
 * prepared scoped packages. Pure with respect to the file system — all file
 * access goes through the injected {@link SourcePackage} callbacks.
 */
export function deriveUmbrellaArtifacts(
	sources: SourcePackage[]
): UmbrellaArtifacts {
	const exports: ExportsMap = {};
	const shimFiles: Record<string, string> = {};
	const cssCopies: CssCopy[] = [];

	for (const source of sources) {
		for (const [subpath, value] of Object.entries(source.exports)) {
			const umbrellaSubpath = mapSubpath(source.config.prefix, subpath);
			if (umbrellaSubpath in exports) {
				throw new Error(
					`Umbrella subpath ${umbrellaSubpath} is claimed twice (last by ${source.config.packageName} ${subpath}).`
				);
			}

			if (typeof value === 'string') {
				exports[umbrellaSubpath] = buildCssEntry(
					source,
					subpath,
					value,
					umbrellaSubpath,
					cssCopies
				);
			} else if (subpath.includes('*')) {
				exports[umbrellaSubpath] = buildWildcardEntry(
					source,
					subpath,
					value,
					umbrellaSubpath,
					shimFiles
				);
			} else {
				exports[umbrellaSubpath] = buildConditionalEntry(
					source,
					subpath,
					value,
					umbrellaSubpath,
					shimFiles
				);
			}
		}
	}

	return { cssCopies, exports, shimFiles };
}

function stripComments(source: string): string {
	return source
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/^[ \t]*\/\/.*$/gm, '');
}

/**
 * Detects whether a module declares a runtime default export —
 * `export default …`, `export { default }`, `export { default } from …`, or
 * `export { name as default }`. Re-exports such as
 * `export { default as Name } from …` do not create a default export and are
 * not matched. Type-only export groups are ignored.
 */
export function detectDefaultExport(source: string): boolean {
	const stripped = stripComments(source);
	if (/^\s*export\s+default\b/m.test(stripped)) {
		return true;
	}

	const groupPattern = /export\s*(type\s+)?\{([^}]*)\}/g;
	let match = groupPattern.exec(stripped);
	while (match !== null) {
		const [, typeOnly, group] = match;
		if (!typeOnly) {
			const items = group.split(',').map((item) => item.trim());
			for (const item of items) {
				if (item === 'default' || /\bas\s+default$/.test(item)) {
					return true;
				}
			}
		}
		match = groupPattern.exec(stripped);
	}

	return false;
}

/**
 * Detects whether a module opens with a `'use client'` directive (leading
 * comments allowed, matching how bundlers treat directive prologues).
 */
export function detectUseClient(source: string): boolean {
	return /^\s*(?:'use client'|"use client")/.test(stripComments(source));
}

function resolveEntryModulePath(
	packageDir: string,
	packageName: string,
	subpath: string,
	entry: ConditionalExport
): string {
	const importTarget = entry.import ? normalizePackagePath(entry.import) : null;
	if (importTarget?.startsWith('client/')) {
		const clientPath = join(packageDir, importTarget);
		if (!existsSync(clientPath)) {
			throw new Error(
				`${packageName} ${subpath}: committed client shim ${importTarget} not found.`
			);
		}
		return clientPath;
	}

	const typesTarget = entry.types ? normalizePackagePath(entry.types) : null;
	if (!typesTarget?.startsWith('dist-types/')) {
		throw new Error(
			`${packageName} ${subpath}: cannot locate the entry module — expected a dist-types/ types condition, got ${JSON.stringify(entry.types)}.`
		);
	}

	const relative = typesTarget
		.slice('dist-types/'.length)
		.replace(/\.d\.ts$/, '');
	for (const extension of ['.ts', '.tsx']) {
		const candidate = join(packageDir, 'src', `${relative}${extension}`);
		if (existsSync(candidate)) {
			return candidate;
		}
	}

	throw new Error(
		`${packageName} ${subpath}: no src module found for ${typesTarget} (tried src/${relative}.ts and .tsx).`
	);
}

function listWildcardModules(
	packageDir: string,
	packageName: string,
	subpath: string,
	entry: ConditionalExport
): string[] {
	const typesTarget = entry.types ? normalizePackagePath(entry.types) : null;
	if (!typesTarget?.startsWith('dist-types/')) {
		throw new Error(
			`${packageName} ${subpath}: wildcard entries need a dist-types/ types condition, got ${JSON.stringify(entry.types)}.`
		);
	}

	const pattern = typesTarget
		.slice('dist-types/'.length)
		.replace(/\.d\.ts$/, '');
	if (!pattern.endsWith('/*')) {
		throw new Error(
			`${packageName} ${subpath}: only trailing /* wildcards are supported, got ${typesTarget}.`
		);
	}

	const sourceDir = join(packageDir, 'src', pattern.slice(0, -2));
	if (!existsSync(sourceDir)) {
		throw new Error(
			`${packageName} ${subpath}: wildcard source directory ${sourceDir} not found.`
		);
	}

	const names = new Set<string>();
	for (const fileName of readdirSync(sourceDir)) {
		const moduleMatch = fileName.match(/^(.+?)\.tsx?$/);
		if (
			!moduleMatch ||
			fileName.endsWith('.d.ts') ||
			fileName.includes('.test.')
		) {
			continue;
		}
		names.add(moduleMatch[1]);
	}
	return [...names].sort();
}

/**
 * Prepares {@link SourcePackage} instances backed by the real workspace —
 * manifests, committed client shims, and `src/` trees under `packagesRoot`.
 */
export function createSourcePackages(
	packagesRoot: string,
	configs: UmbrellaSource[] = UMBRELLA_SOURCES
): SourcePackage[] {
	return configs.map((config) => {
		const packageDir = join(packagesRoot, config.directory);
		const manifest = JSON.parse(
			readFileSync(join(packageDir, 'package.json'), 'utf8')
		) as { name?: string; exports?: ExportsMap };

		if (manifest.name !== config.packageName) {
			console.warn(
				`generate-umbrella-exports: packages/${config.directory} is named ${JSON.stringify(manifest.name)}, generating against the configured name ${config.packageName}.`
			);
		}
		if (!manifest.exports) {
			throw new Error(
				`packages/${config.directory} has no exports map to mirror.`
			);
		}

		return {
			analyzeEntry: (subpath, entry) => {
				const modulePath = resolveEntryModulePath(
					packageDir,
					config.packageName,
					subpath,
					entry
				);
				const moduleSource = readFileSync(modulePath, 'utf8');
				return {
					hasDefaultExport: detectDefaultExport(moduleSource),
					isClientModule: detectUseClient(moduleSource),
				};
			},
			config,
			expandWildcard: (subpath, entry) =>
				listWildcardModules(packageDir, config.packageName, subpath, entry),
			exports: manifest.exports,
		};
	});
}

function writeUmbrellaPackage(
	umbrellaDir: string,
	artifacts: UmbrellaArtifacts
) {
	const shimsDir = join(umbrellaDir, 'shims');
	rmSync(shimsDir, { force: true, recursive: true });

	for (const [relativePath, content] of Object.entries(artifacts.shimFiles)) {
		const filePath = join(umbrellaDir, relativePath);
		mkdirSync(dirname(filePath), { recursive: true });
		writeFileSync(filePath, content);
	}

	const manifestPath = join(umbrellaDir, 'package.json');
	const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<
		string,
		unknown
	>;
	manifest.exports = artifacts.exports;

	const rootEntry = artifacts.exports['.'];
	if (rootEntry && typeof rootEntry !== 'string') {
		manifest.main = rootEntry.require;
		manifest.module = rootEntry.import;
		manifest.types = rootEntry.types;
	}

	writeFileSync(manifestPath, `${JSON.stringify(manifest, null, '\t')}\n`);
}

if (import.meta.main) {
	const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
	const sources = createSourcePackages(join(repoRoot, 'packages'));
	const artifacts = deriveUmbrellaArtifacts(sources);
	writeUmbrellaPackage(join(repoRoot, 'packages', 'c15t'), artifacts);

	console.log(
		`Generated ${Object.keys(artifacts.exports).length} umbrella exports, ` +
			`${Object.keys(artifacts.shimFiles).length} shim files, and ` +
			`${artifacts.cssCopies.length} CSS copy targets in packages/c15t.`
	);
}
