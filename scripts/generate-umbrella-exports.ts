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
 * - The `exports` map (plus `main`/`module`/`types`/`sideEffects`), written
 *   into `package.json` in place. `sideEffects` is derived from the mirrored
 *   packages' own declarations: a scoped package that declares none is fully
 *   side-effectful, so its shims are carved out of the umbrella's
 *   side-effect-free claim.
 * - Committed re-export shims under `shims/` — one `.js`/`.d.ts` pair per
 *   conditional subpath. They are committed (not built) for the same reason
 *   `packages/react/client/` is: the repo stays reviewable and installable
 *   without a generation step.
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
 * - **Built-output entry targets** (`@c15t/vue`, `@c15t/svelte`): these
 *   packages build with nuxt-module-build / svelte-package and keep their
 *   declarations inside `dist/` (no `dist-types/`), so their config carries a
 *   {@link SourceRootMapping} that maps built targets back to committed
 *   sources (`dist/module.mjs` → `src/module.ts`,
 *   `dist/headless.js` → `src/lib/headless.ts`) for default-export analysis.
 * - **`.vue` entry targets**: a Vue SFC module always default-exports its
 *   component (the `<script setup>` block carries no textual
 *   `export default`), so `.vue` entries are analyzed as
 *   `hasDefaultExport: true` without reading the file. A plain `.js` shim
 *   re-exporting the `.vue` specifier works for extension-less subpaths like
 *   `c15t/vue/consent-root`: the bundler resolves the re-export target to the
 *   scoped `.vue` file and compiles it there, so execution (and the Vue SFC
 *   pipeline) stays inside `@c15t/vue`. The same locality argument keeps the
 *   Nuxt module working through the umbrella: `c15t/vue` re-exports
 *   `@c15t/vue`'s default, and the module resolves its runtime directory via
 *   `createResolver(import.meta.url)` from `@c15t/vue`'s own files.
 * - **Raw string wildcards** (`./runtime/*` → `./dist/runtime/*` on
 *   `@c15t/vue`): the target is a single string, so `*` captures the full
 *   file name *including its extension*. The umbrella keeps a raw string
 *   wildcard pointing into `shims/`, backed by shim files enumerated from the
 *   scoped package's committed `src/` tree: each built `.js` module gets an
 *   ESM re-export shim plus a sibling `.d.ts` (TypeScript finds declarations
 *   for a resolved `x.js` at `x.d.ts`), and each `.vue` module gets a wrapper
 *   SFC (`import Component from '…'; export default Component;` — the SFC
 *   compiler rewrites the default export, and the wrapped component is the
 *   same object) plus `x.d.vue.ts`/`x.vue.d.ts` declaration siblings,
 *   mirroring what mkdist ships. Any other file kind fails generation loudly.
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

/**
 * Maps built export targets back to the committed sources they compile from,
 * for packages whose declarations live inside `dist/` instead of
 * `dist-types/` (nuxt-module-build, svelte-package).
 */
export interface SourceRootMapping {
	/** Prefix of built export targets, e.g. `'dist/'`. */
	distPrefix: string;
	/**
	 * Committed source prefix the dist prefix maps back to, e.g. `'src/'`
	 * (`@c15t/vue`) or `'src/lib/'` (`@c15t/svelte`).
	 */
	srcPrefix: string;
}

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
	/**
	 * How to locate committed sources for built export targets. Required for
	 * packages without a `dist-types/` types condition, and for raw string
	 * wildcard exports (which are enumerated from `src/`).
	 */
	sourceRoot?: SourceRootMapping;
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
	{
		directory: 'tanstack-start',
		packageName: '@c15t/tanstack-start',
		prefix: 'tanstack-start',
	},
	{
		directory: 'vue',
		packageName: '@c15t/vue',
		prefix: 'vue',
		sourceRoot: { distPrefix: 'dist/', srcPrefix: 'src/' },
	},
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
	 * The scoped package's `sideEffects` manifest field, verbatim. Absent
	 * (`undefined`) means bundlers treat every module in the package as
	 * side-effectful, and the umbrella must claim the mirrored shims the same
	 * way.
	 */
	sideEffects?: unknown;
	/**
	 * Analyzes the module behind a concrete (wildcard-substituted) subpath.
	 */
	analyzeEntry: (subpath: string, entry: ConditionalExport) => EntryModuleInfo;
	/**
	 * Enumerates the concrete names a wildcard subpath expands to.
	 */
	expandWildcard: (subpath: string, entry: ConditionalExport) => string[];
	/**
	 * Enumerates the concrete file names a raw string wildcard target expands
	 * to. Unlike {@link expandWildcard}, `*` in a string export captures the
	 * full file name including its extension, so the returned names carry the
	 * built extensions (`components/consent-banner.vue`,
	 * `composables/consent.js`).
	 */
	expandStringWildcard: (subpath: string, target: string) => string[];
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
	/**
	 * The umbrella's `sideEffects` manifest field, derived from the mirrored
	 * packages' own declarations (see {@link deriveSideEffects}).
	 */
	sideEffects: string[];
}

const GENERATED_BANNER =
	'// Generated by scripts/generate-umbrella-exports.ts — do not edit.';

/**
 * Shim file extension per supported export condition. Every package is
 * ESM-only, so the `svelte` and `default` conditions target the same ESM
 * files as `import` in the mirrored packages and all three share the `.js`
 * shim.
 */
const SHIM_EXTENSIONS: Record<string, string> = {
	default: '.js',
	import: '.js',
	svelte: '.js',
	types: '.d.ts',
};

const mapSubpath = function mapSubpath(
	prefix: string,
	subpath: string
): string {
	if (!prefix) {
		return subpath;
	}
	if (subpath === '.') {
		return `./${prefix}`;
	}
	return `./${prefix}/${subpath.slice(2)}`;
};

const toSpecifier = function toSpecifier(
	packageName: string,
	subpath: string
): string {
	if (subpath === '.') {
		return packageName;
	}
	return `${packageName}/${subpath.slice(2)}`;
};

const toShimBase = function toShimBase(umbrellaSubpath: string): string {
	if (umbrellaSubpath === '.') {
		return 'shims/index';
	}
	return `shims/${umbrellaSubpath.slice(2)}`;
};

const renderEsmShim = function renderEsmShim(
	specifier: string,
	info: EntryModuleInfo
): string {
	const lines: string[] = [];
	if (info.isClientModule) {
		lines.push("'use client';", '');
	}
	lines.push(GENERATED_BANNER, `export * from '${specifier}';`);
	if (info.hasDefaultExport) {
		lines.push(`export { default } from '${specifier}';`);
	}
	return `${lines.join('\n')}\n`;
};

const renderTypesShim = function renderTypesShim(
	specifier: string,
	info: EntryModuleInfo
): string {
	const lines: string[] = [GENERATED_BANNER, `export * from '${specifier}';`];
	if (info.hasDefaultExport) {
		lines.push(`export { default } from '${specifier}';`);
	}
	return `${lines.join('\n')}\n`;
};

const renderShimCondition = function renderShimCondition(
	condition: string,
	specifier: string,
	info: EntryModuleInfo
): string {
	if (condition === 'types') {
		return renderTypesShim(specifier, info);
	}
	return renderEsmShim(specifier, info);
};

const buildConditionalEntry = function buildConditionalEntry(
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
};

/**
 * Renders a wrapper SFC shim for a `.vue` module reached through a raw string
 * wildcard. The SFC compiler rewrites the plain-script default export, and
 * the wrapped component is the same object as the scoped one, so props,
 * emits, and provide/inject behavior are identical.
 */
const renderVueSfcShim = function renderVueSfcShim(specifier: string): string {
	return `<script>\n${GENERATED_BANNER}\nimport Component from '${specifier}';\nexport default Component;\n</script>\n`;
};

/**
 * Renders the declaration sibling for a wrapped `.vue` SFC shim. Scoped SFC
 * declarations export named types alongside the component (e.g.
 * `IabProcessedPurpose` from `iab-purpose-item.vue`), so the shim forwards
 * both: `export *` picks up the named exports through the scoped package's
 * own `.d.vue.ts`/`.vue.d.ts` layout, and the explicit default re-export
 * carries the component (`export *` never forwards `default`).
 */
const renderVueDeclarationShim = function renderVueDeclarationShim(
	specifier: string
): string {
	return `${GENERATED_BANNER}\nexport * from '${specifier}';\nexport { default } from '${specifier}';\n`;
};

/**
 * Mirrors a raw string wildcard export (`./runtime/*` → `./dist/runtime/*`).
 * `*` captures the full file name including its extension, so the shim files
 * carry the built names verbatim: `.js` modules get an ESM shim plus a
 * sibling `.d.ts`, `.vue` modules get a wrapper SFC plus the
 * `.d.vue.ts`/`.vue.d.ts` declaration siblings mkdist ships.
 */
const buildStringWildcardEntry = function buildStringWildcardEntry(
	source: SourcePackage,
	subpath: string,
	target: string,
	umbrellaSubpath: string,
	shimFiles: Record<string, string>
): string {
	if (!(subpath.endsWith('/*') && target.endsWith('/*'))) {
		throw new Error(
			`Unsupported string wildcard export ${subpath} -> ${target} on ${source.config.packageName}. Only trailing /* wildcards are supported.`
		);
	}

	const names = source.expandStringWildcard(subpath, target);
	if (names.length === 0) {
		throw new Error(
			`Wildcard export ${subpath} on ${source.config.packageName} matched no modules.`
		);
	}

	const shimRoot = `shims/${umbrellaSubpath.slice(2, -2)}`;
	for (const name of names) {
		const concreteSubpath = subpath.replace('*', name);
		const specifier = toSpecifier(source.config.packageName, concreteSubpath);
		const shimPath = `${shimRoot}/${name}`;

		if (name.endsWith('.vue')) {
			const base = shimPath.slice(0, -'.vue'.length);
			shimFiles[shimPath] = renderVueSfcShim(specifier);
			shimFiles[`${base}.d.vue.ts`] = renderVueDeclarationShim(specifier);
			shimFiles[`${base}.vue.d.ts`] = renderVueDeclarationShim(specifier);
		} else if (name.endsWith('.js')) {
			const info = source.analyzeEntry(concreteSubpath, {
				import: target.replace('*', name),
			});
			shimFiles[shimPath] = renderEsmShim(specifier, info);
			shimFiles[`${shimPath.slice(0, -'.js'.length)}.d.ts`] = renderTypesShim(
				specifier,
				info
			);
		} else {
			throw new Error(
				`Unsupported string wildcard module ${name} behind ${subpath} on ${source.config.packageName}. Teach generate-umbrella-exports.ts how to mirror it.`
			);
		}
	}

	return `./${shimRoot}/*`;
};

const buildCssEntry = function buildCssEntry(
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
		sourceDirectory: source.config.directory,
		sourcePath,
		target: copyTarget,
	});
	return `./${copyTarget}`;
};

const buildWildcardEntry = function buildWildcardEntry(
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
};

/**
 * Derives the umbrella's `sideEffects` claim from the mirrored packages' own
 * declarations. The umbrella defaults to claiming only CSS as side-effectful
 * (matching the CSS-only claims of `@c15t/react` and friends, and safely
 * stricter than `sideEffects: false`), but a scoped package that declares
 * **no** `sideEffects` field is treated by bundlers as fully side-effectful —
 * so its mirrored shims must be carved out of the umbrella's side-effect-free
 * claim, or a bare `import 'c15t/<prefix>/…'` could be pruned where the
 * scoped import survives. Any declaration shape this mapping cannot mirror
 * fails generation loudly.
 */
const deriveSideEffects = function deriveSideEffects(
	sources: SourcePackage[]
): string[] {
	const sideEffects: string[] = ['**/*.css'];

	for (const source of sources) {
		const declared = source.sideEffects;
		if (declared === false) {
			continue;
		}
		if (
			Array.isArray(declared) &&
			declared.every(
				(pattern) => typeof pattern === 'string' && pattern.endsWith('.css')
			)
		) {
			// CSS-only claims are covered by the umbrella's own `**/*.css`:
			// the mirrored CSS subpaths are real files under `dist/`.
			continue;
		}
		if (declared === undefined || declared === true) {
			// The whole scoped package is side-effectful, so every shim that
			// re-exports it must stay side-effectful too.
			const { prefix } = source.config;
			if (prefix) {
				sideEffects.push(`shims/${prefix}.*`, `shims/${prefix}/**`);
			} else {
				sideEffects.push('shims/**');
			}
			continue;
		}
		throw new Error(
			`Unsupported sideEffects declaration ${JSON.stringify(declared)} on ${source.config.packageName}. Teach generate-umbrella-exports.ts how to mirror it.`
		);
	}

	return sideEffects;
};

/**
 * Derives the umbrella exports map, shim files, CSS copy list, and
 * `sideEffects` claim from the prepared scoped packages. Pure with respect to
 * the file system — all file access goes through the injected
 * {@link SourcePackage} callbacks.
 */
export const deriveUmbrellaArtifacts = function deriveUmbrellaArtifacts(
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

			if (typeof value === 'string' && subpath.includes('*')) {
				exports[umbrellaSubpath] = buildStringWildcardEntry(
					source,
					subpath,
					value,
					umbrellaSubpath,
					shimFiles
				);
			} else if (typeof value === 'string') {
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

	return {
		cssCopies,
		exports,
		shimFiles,
		sideEffects: deriveSideEffects(sources),
	};
};

const stripComments = function stripComments(source: string): string {
	return source
		.replace(/\/\*[\s\S]*?\*\//gu, '')
		.replace(/^[ \t]*\/\/.*$/gmu, '');
};

/**
 * Detects whether a module declares a runtime default export —
 * `export default …`, `export { default }`, `export { default } from …`, or
 * `export { name as default }`. Re-exports such as
 * `export { default as Name } from …` do not create a default export and are
 * not matched. Type-only export groups are ignored.
 */
export const detectDefaultExport = function detectDefaultExport(
	source: string
): boolean {
	const stripped = stripComments(source);
	if (/^\s*export\s+default\b/mu.test(stripped)) {
		return true;
	}

	// oxlint-disable-next-line prefer-named-capture-group -- Preserve declaration order, interface shape, and public compatibility.
	const groupPattern = /export\s*(type\s+)?\{([^}]*)\}/gu;
	let match = groupPattern.exec(stripped);
	while (match !== null) {
		const [, typeOnly, group] = match;
		if (!typeOnly) {
			const items = group.split(',').map((item) => item.trim());
			for (const item of items) {
				if (item === 'default' || /\bas\s+default$/u.test(item)) {
					return true;
				}
			}
		}
		match = groupPattern.exec(stripped);
	}

	return false;
};

/**
 * Detects whether a module opens with a `'use client'` directive (leading
 * comments allowed, matching how bundlers treat directive prologues).
 */
export const detectUseClient = function detectUseClient(
	source: string
): boolean {
	return /^\s*(?:'use client'|"use client")/u.test(stripComments(source));
};

/**
 * The export conditions that point at a runnable entry module, in the order
 * they are consulted when mapping built targets back to committed sources.
 */
const JS_ENTRY_CONDITIONS = ['import', 'svelte', 'default'] as const;

/**
 * Locates the committed source behind a built entry target using the
 * source's {@link SourceRootMapping} (`dist/module.mjs` → `src/module.ts`,
 * `dist/headless.js` → `src/lib/headless.ts`, `dist/x.vue` → `src/x.vue`).
 */
const resolveViaSourceRoot = function resolveViaSourceRoot(
	packageDir: string,
	config: UmbrellaSource,
	entry: ConditionalExport
): string | null {
	const { sourceRoot } = config;
	if (!sourceRoot) {
		return null;
	}

	for (const condition of JS_ENTRY_CONDITIONS) {
		const value = entry[condition];
		const target = value ? normalizePackagePath(value) : null;
		if (!target?.startsWith(sourceRoot.distPrefix)) {
			continue;
		}

		const relative = target.slice(sourceRoot.distPrefix.length);
		const candidates = relative.endsWith('.vue')
			? [relative]
			: [
					// oxlint-disable-next-line prefer-named-capture-group -- Preserve declaration order, interface shape, and public compatibility.
					relative.replace(/\.(mjs|cjs|js)$/u, '.ts'),
					relative.replace(/\.(?<capture1>mjs|cjs|js)$/u, '.tsx'),
				];
		for (const candidate of candidates) {
			const candidatePath = join(packageDir, sourceRoot.srcPrefix, candidate);
			if (existsSync(candidatePath)) {
				return candidatePath;
			}
		}
	}

	return null;
};

const resolveEntryModulePath = function resolveEntryModulePath(
	packageDir: string,
	config: UmbrellaSource,
	subpath: string,
	entry: ConditionalExport
): string {
	const { packageName } = config;
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

	const viaSourceRoot = resolveViaSourceRoot(packageDir, config, entry);
	if (viaSourceRoot) {
		return viaSourceRoot;
	}

	const typesTarget = entry.types ? normalizePackagePath(entry.types) : null;
	if (!typesTarget?.startsWith('dist-types/')) {
		throw new Error(
			`${packageName} ${subpath}: cannot locate the entry module — expected a dist-types/ types condition or a sourceRoot mapping, got ${JSON.stringify(entry)}.`
		);
	}

	const relative = typesTarget
		.slice('dist-types/'.length)
		.replace(/\.d\.ts$/u, '');
	for (const extension of ['.ts', '.tsx']) {
		const candidate = join(packageDir, 'src', `${relative}${extension}`);
		if (existsSync(candidate)) {
			return candidate;
		}
	}

	throw new Error(
		`${packageName} ${subpath}: no src module found for ${typesTarget} (tried src/${relative}.ts and .tsx).`
	);
};

const listWildcardModules = function listWildcardModules(
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
		.replace(/\.d\.ts$/u, '');
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

	// Node's `*` in an exports wildcard matches across `/`, so nested source
	// directories must be enumerated too — a flat listing would silently drop
	// their shims and the umbrella subpath would 404 where the scoped one
	// resolves.
	const names = new Set<string>();
	const walk = (directory: string, prefix: string) => {
		for (const dirent of readdirSync(directory, { withFileTypes: true })) {
			const relativePath = prefix ? `${prefix}/${dirent.name}` : dirent.name;
			if (dirent.isDirectory()) {
				if (dirent.name === '__tests__') {
					continue;
				}
				walk(join(directory, dirent.name), relativePath);
				continue;
			}
			// oxlint-disable-next-line prefer-named-capture-group -- Preserve declaration order, interface shape, and public compatibility.
			const moduleMatch = dirent.name.match(/^(.+?)\.tsx?$/u);
			if (
				!moduleMatch ||
				dirent.name.endsWith('.d.ts') ||
				dirent.name.includes('.test.') ||
				dirent.name.includes('.spec.')
			) {
				continue;
			}
			names.add(prefix ? `${prefix}/${moduleMatch[1]}` : moduleMatch[1]);
		}
	};
	walk(sourceDir, '');
	return [...names].sort();
};

/**
 * Enumerates the built file names behind a raw string wildcard target by
 * walking the committed `src/` tree the target directory compiles from.
 * Source `.ts`/`.tsx` modules build to `.js` (mkdist, svelte-package keep
 * base names — `context.svelte.ts` → `context.svelte.js`), `.vue` files ship
 * verbatim. Declaration sources and tests are skipped; anything else fails
 * loudly.
 */
const listStringWildcardModules = function listStringWildcardModules(
	packageDir: string,
	config: UmbrellaSource,
	subpath: string,
	target: string
): string[] {
	const normalized = normalizePackagePath(target);
	if (!normalized?.endsWith('/*')) {
		throw new Error(
			`${config.packageName} ${subpath}: only trailing /* string wildcards are supported, got ${target}.`
		);
	}

	const { sourceRoot } = config;
	if (!sourceRoot || !normalized.startsWith(sourceRoot.distPrefix)) {
		throw new Error(
			`${config.packageName} ${subpath}: string wildcard target ${target} needs a sourceRoot mapping into committed sources.`
		);
	}

	const relativeDir = normalized.slice(sourceRoot.distPrefix.length, -2);
	const sourceDir = join(packageDir, sourceRoot.srcPrefix, relativeDir);
	if (!existsSync(sourceDir)) {
		throw new Error(
			`${config.packageName} ${subpath}: wildcard source directory ${sourceDir} not found.`
		);
	}

	const names: string[] = [];
	const walk = (directory: string, prefix: string) => {
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
			if (entry.isDirectory()) {
				if (entry.name === '__tests__') {
					continue;
				}
				walk(join(directory, entry.name), relativePath);
				continue;
			}
			if (
				entry.name.endsWith('.d.ts') ||
				entry.name.includes('.test.') ||
				entry.name.includes('.spec.')
			) {
				continue;
			}
			if (entry.name.endsWith('.vue')) {
				names.push(relativePath);
				continue;
			}
			if (/\.tsx?$/u.test(entry.name)) {
				names.push(relativePath.replace(/\.tsx?$/u, '.js'));
				continue;
			}
			throw new Error(
				`${config.packageName} ${subpath}: unsupported source file ${relativePath} behind string wildcard ${target}. Teach generate-umbrella-exports.ts how to mirror it.`
			);
		}
	};
	walk(sourceDir, '');

	return names.sort();
};

/**
 * Prepares {@link SourcePackage} instances backed by the real workspace —
 * manifests, committed client shims, and `src/` trees under `packagesRoot`.
 */
export const createSourcePackages = function createSourcePackages(
	packagesRoot: string,
	configs: UmbrellaSource[] = UMBRELLA_SOURCES
): SourcePackage[] {
	return configs.map((config) => {
		const packageDir = join(packagesRoot, config.directory);
		const manifest = JSON.parse(
			readFileSync(join(packageDir, 'package.json'), 'utf8')
		) as { name?: string; exports?: ExportsMap; sideEffects?: unknown };

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
					config,
					subpath,
					entry
				);
				if (modulePath.endsWith('.vue')) {
					// An SFC module always default-exports its component; the
					// `<script setup>` block carries no textual `export default`.
					return { hasDefaultExport: true, isClientModule: false };
				}
				const moduleSource = readFileSync(modulePath, 'utf8');
				return {
					hasDefaultExport: detectDefaultExport(moduleSource),
					isClientModule: detectUseClient(moduleSource),
				};
			},
			config,
			expandStringWildcard: (subpath, target) =>
				listStringWildcardModules(packageDir, config, subpath, target),
			expandWildcard: (subpath, entry) =>
				listWildcardModules(packageDir, config.packageName, subpath, entry),
			exports: manifest.exports,
			sideEffects: manifest.sideEffects,
		};
	});
};

const writeUmbrellaPackage = function writeUmbrellaPackage(
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
	manifest.sideEffects = artifacts.sideEffects;
	manifest.exports = artifacts.exports;

	const rootEntry = artifacts.exports['.'];
	if (rootEntry && typeof rootEntry !== 'string') {
		manifest.main = rootEntry.import;
		manifest.types = rootEntry.types;
		delete manifest.module;
	}

	writeFileSync(manifestPath, `${JSON.stringify(manifest, null, '\t')}\n`);
};

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
