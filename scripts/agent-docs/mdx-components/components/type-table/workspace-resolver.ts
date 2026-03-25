import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import * as ts from 'typescript';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PackageExportEntry = {
	/** Subpath key from the exports map, e.g. "." or "./types" */
	subpath: string;
	/** Resolved absolute path to the *source* file (not dist) */
	srcPath: string;
};

type WorkspacePackage = {
	name: string;
	dir: string;
	exports: PackageExportEntry[];
};

type WorkspaceInfo = {
	root: string;
	packages: WorkspacePackage[];
};

// ---------------------------------------------------------------------------
// Caches (process-lifetime)
// ---------------------------------------------------------------------------

const workspaceRootCache = new Map<string, string | null>();
const workspaceInfoCache = new Map<string, WorkspaceInfo>();
const pathMappingsCache = new Map<string, Record<string, string[]>>();

// ---------------------------------------------------------------------------
// findWorkspaceRoot
// ---------------------------------------------------------------------------

/**
 * Walk up from `filePath` looking for a package.json that has a `workspaces`
 * array – the standard npm/yarn/bun workspace root marker.
 */
export function findWorkspaceRoot(filePath: string): string | null {
	let dir = dirname(resolve(filePath));

	while (dir !== dirname(dir)) {
		if (workspaceRootCache.has(dir)) {
			return workspaceRootCache.get(dir)!;
		}

		const pkgPath = join(dir, 'package.json');
		if (existsSync(pkgPath)) {
			try {
				const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
				if (Array.isArray(pkg.workspaces)) {
					// Cache every directory we've traversed so far pointing to this root
					let cacheDir = dirname(resolve(filePath));
					while (cacheDir !== dirname(cacheDir)) {
						workspaceRootCache.set(cacheDir, dir);
						if (cacheDir === dir) break;
						cacheDir = dirname(cacheDir);
					}
					return dir;
				}
			} catch {
				// Ignore malformed package.json
			}
		}

		dir = dirname(dir);
	}

	// Negative cache for every traversed dir
	let cacheDir = dirname(resolve(filePath));
	while (cacheDir !== dirname(cacheDir)) {
		workspaceRootCache.set(cacheDir, null);
		cacheDir = dirname(cacheDir);
	}

	return null;
}

// ---------------------------------------------------------------------------
// discoverWorkspacePackages
// ---------------------------------------------------------------------------

/**
 * Convert a dist output path to the corresponding source path.
 *
 * Examples:
 *   ./dist/index.d.ts  → ./src/index.ts
 *   ./dist/types.js    → ./src/types.ts
 *   ./dist/types.cjs   → ./src/types.ts
 */
function distPathToSrc(distPath: string): string {
	return distPath
		.replace(/^\.\/dist\//, './src/')
		.replace(/\.d\.ts$/, '.ts')
		.replace(/\.d\.cts$/, '.ts')
		.replace(/\.d\.mts$/, '.ts')
		.replace(/\.cjs$/, '.ts')
		.replace(/\.mjs$/, '.ts')
		.replace(/\.js$/, '.ts');
}

/**
 * Extract the best source-pointing path from a package.json `exports`
 * condition object like `{ "types": "...", "import": "...", "require": "..." }`.
 */
function resolveExportCondition(condition: unknown): string | null {
	if (typeof condition === 'string') {
		return condition;
	}
	if (typeof condition === 'object' && condition !== null) {
		const obj = condition as Record<string, unknown>;
		// Prefer the "types" condition – it always points to the .d.ts which maps
		// cleanly to the source .ts file.
		if (typeof obj.types === 'string') return obj.types;
		if (typeof obj.import === 'string') return obj.import;
		if (typeof obj.require === 'string') return obj.require;
		if (typeof obj.default === 'string') return obj.default;
	}
	return null;
}

/**
 * Expand simple glob patterns used in the `workspaces` field.
 * Handles: `packages/*`, `packages/**`, `configs/*`, etc.
 */
function expandWorkspaceGlob(root: string, pattern: string): string[] {
	const dirs: string[] = [];

	// Strip trailing /** or /* to get the base
	const isDoubleGlob = pattern.endsWith('/**');
	const base = pattern.replace(/\/\*\*?$/, '');
	const baseDir = join(root, base);

	if (!existsSync(baseDir)) return dirs;

	function scan(dir: string) {
		let entries: string[];
		try {
			entries = readdirSync(dir, { withFileTypes: true })
				.filter((e) => e.isDirectory())
				.map((e) => e.name);
		} catch {
			return;
		}

		for (const entry of entries) {
			const full = join(dir, entry);
			const pkgJson = join(full, 'package.json');
			if (existsSync(pkgJson)) {
				dirs.push(full);
			}
			if (isDoubleGlob) {
				scan(full);
			}
		}
	}

	scan(baseDir);
	return dirs;
}

/**
 * Discover all workspace packages from the root package.json.
 */
export function discoverWorkspacePackages(
	workspaceRoot: string
): WorkspaceInfo {
	const cached = workspaceInfoCache.get(workspaceRoot);
	if (cached) return cached;

	const rootPkgPath = join(workspaceRoot, 'package.json');
	const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf-8'));
	const globs: string[] = rootPkg.workspaces ?? [];

	const packages: WorkspacePackage[] = [];

	for (const pattern of globs) {
		const dirs = expandWorkspaceGlob(workspaceRoot, pattern);

		for (const pkgDir of dirs) {
			const pkgJsonPath = join(pkgDir, 'package.json');
			try {
				const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
				const name: string | undefined = pkg.name;
				if (!name) continue;

				const exportEntries: PackageExportEntry[] = [];

				if (pkg.exports && typeof pkg.exports === 'object') {
					for (const [subpath, condition] of Object.entries(pkg.exports)) {
						// Skip wildcard patterns (e.g. "./styles/*": "./src/styles/*")
						// — they are handled by the fallback wildcard entry below
						if (subpath.includes('*')) continue;

						const resolved = resolveExportCondition(condition);
						if (!resolved) continue;

						const srcRelative = distPathToSrc(resolved);
						const srcAbsolute = resolve(pkgDir, srcRelative);

						if (existsSync(srcAbsolute)) {
							exportEntries.push({ subpath, srcPath: srcAbsolute });
						}
					}
				}

				// Fallback: if no exports or no "." export, map "." → src/index.ts
				if (!exportEntries.some((e) => e.subpath === '.')) {
					const fallback = resolve(pkgDir, 'src/index.ts');
					if (existsSync(fallback)) {
						exportEntries.push({ subpath: '.', srcPath: fallback });
					}
				}

				packages.push({ name, dir: pkgDir, exports: exportEntries });
			} catch {
				// Skip packages with unreadable package.json
			}
		}
	}

	const info: WorkspaceInfo = { root: workspaceRoot, packages };
	workspaceInfoCache.set(workspaceRoot, info);
	return info;
}

// ---------------------------------------------------------------------------
// buildWorkspacePathMappings
// ---------------------------------------------------------------------------

/**
 * Build TypeScript `paths` entries for all workspace packages so that
 * `ts.createProgram` can resolve cross-package imports to their source files.
 */
export function buildWorkspacePathMappings(
	workspaceRoot: string
): Record<string, string[]> {
	const cached = pathMappingsCache.get(workspaceRoot);
	if (cached) return cached;

	const { packages } = discoverWorkspacePackages(workspaceRoot);
	const paths: Record<string, string[]> = {};

	for (const pkg of packages) {
		for (const entry of pkg.exports) {
			// Map the subpath export to a TS paths entry.
			// "."        → package name        (e.g. "@c15t/schema")
			// "./types"  → package name/types   (e.g. "@c15t/schema/types")
			const importPath =
				entry.subpath === '.'
					? pkg.name
					: `${pkg.name}/${entry.subpath.replace(/^\.\//, '')}`;

			paths[importPath] = [entry.srcPath];
		}

		// Wildcard fallback: `@c15t/schema/*` → `.../packages/schema/src/*`
		const srcDir = join(pkg.dir, 'src');
		if (existsSync(srcDir)) {
			paths[`${pkg.name}/*`] = [join(srcDir, '*')];
		}
	}

	pathMappingsCache.set(workspaceRoot, paths);
	return paths;
}

// ---------------------------------------------------------------------------
// createWorkspaceCompilerHost
// ---------------------------------------------------------------------------

/**
 * Creates a TS compiler host that intercepts module resolution to handle
 * `~/*` tilde-alias imports by mapping them to the containing package's `src/`
 * directory.
 */
export function createWorkspaceCompilerHost(
	options: ts.CompilerOptions,
	workspaceRoot: string
): ts.CompilerHost {
	const host = ts.createCompilerHost(options, true);
	const { packages } = discoverWorkspacePackages(workspaceRoot);

	// Sort packages by directory length descending so the most specific match wins
	const sortedPkgDirs = packages
		.map((p) => p.dir)
		.sort((a, b) => b.length - a.length);

	const originalResolveModuleNames = host.resolveModuleNames;

	host.resolveModuleNames = (
		moduleNames: string[],
		containingFile: string,
		_reusedNames: string[] | undefined,
		redirectedReference: ts.ResolvedProjectReference | undefined,
		compilerOptions: ts.CompilerOptions
	): (ts.ResolvedModule | undefined)[] => {
		return moduleNames.map((moduleName) => {
			// Handle ~/* tilde alias: resolve to containing package's src/ dir
			if (moduleName.startsWith('~/')) {
				const pkgDir = sortedPkgDirs.find((d) =>
					containingFile.startsWith(d + '/')
				);
				if (pkgDir) {
					const relativePath = moduleName.slice(2); // strip "~/"
					const candidates = [
						join(pkgDir, 'src', `${relativePath}.ts`),
						join(pkgDir, 'src', `${relativePath}.tsx`),
						join(pkgDir, 'src', relativePath, 'index.ts'),
						join(pkgDir, 'src', relativePath, 'index.tsx'),
					];
					for (const candidate of candidates) {
						if (existsSync(candidate)) {
							return {
								resolvedFileName: candidate,
								isExternalLibraryImport: false,
							};
						}
					}
				}
			}

			// Default resolution (handles paths mappings, node_modules, etc.)
			const result = ts.resolveModuleName(
				moduleName,
				containingFile,
				compilerOptions,
				host
			);
			return result.resolvedModule;
		});
	};

	return host;
}
