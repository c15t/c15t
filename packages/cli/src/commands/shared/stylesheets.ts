import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

import { Project } from 'ts-morph';

import {
	readFile,
	resolvePlannedPath,
	writeFile,
} from '../generate/templates/shared/file-plan';
import { isTailwindV3 } from './postcss-config';
import { layerStarterReset } from './starter-reset';

const CSS_ENTRYPOINT_CANDIDATES = [
	'app/globals.css',
	'src/app/globals.css',
	'app/global.css',
	'src/app/global.css',
	'styles/globals.css',
	'src/styles/globals.css',
	'styles/global.css',
	'src/styles/global.css',
	'src/index.css',
	'src/styles.css',
	'src/style.css',
	'styles.css',
	'app.css',
	'src/App.css',
] as const;

const CSS_IMPORT_RE = /^\s*@import\b.+;\s*(?:(?:\/\*.*\*\/|\/\/.*)\s*)?$/u;
const TAILWIND_V4_IMPORT_RE = /^\s*@import\s+['"]tailwindcss['"];\s*$/u;
const TAILWIND_COMPONENTS_RE = /^\s*@tailwind\s+components\s*;\s*$/u;
const TAILWIND_UTILITIES_RE = /^\s*@tailwind\s+utilities\s*;\s*$/u;

export type StyledPackageName =
	| 'c15t/react'
	| 'c15t/next'
	| '@c15t/react'
	| '@c15t/nextjs'
	| '@c15t/ui';

export interface EnsureGlobalCssStylesheetImportsOptions {
	projectRoot: string;
	packageName: StyledPackageName;
	/**
	 * Set only by the v1 to v2 codemod. With Tailwind 3 it imports v2's
	 * `styles.tw3.css` between `@tailwind components` and
	 * `@tailwind utilities`, because v2 has no `postcss-tailwind3` plugin.
	 * v3 setup leaves it unset and imports `styles.css`.
	 */
	legacyTailwindVersion?: string | null;
	entrypointPath?: string | null;
	includeBase: boolean;
	includeIab: boolean;
	/** Move the stock universal reset below v3's layered component styles. */
	layerStarterReset?: boolean;
	dryRun?: boolean;
}

export interface EnsureGlobalCssStylesheetImportsResult {
	updated: boolean;
	filePath: string | null;
	searchedPaths: string[];
	changes: string[];
}

type StylesheetKind = 'base' | 'iab';

const normalizePath = function normalizePath(
	projectRoot: string,
	filePath: string
): string {
	if (filePath.startsWith(projectRoot)) {
		return filePath;
	}

	return resolve(projectRoot, filePath);
};

const dedupePaths = function dedupePaths(paths: string[]): string[] {
	return [...new Set(paths)];
};

const isNonModuleLocalCssImport = function isNonModuleLocalCssImport(
	moduleSpecifier: string
): boolean {
	return (
		moduleSpecifier.endsWith('.css') && !moduleSpecifier.endsWith('.module.css')
	);
};

const getManagedPackages = function getManagedPackages(
	packageName: StyledPackageName
): StyledPackageName[] {
	if (packageName === '@c15t/ui') {
		return ['@c15t/ui'];
	}

	// Umbrella (c15t/react, c15t/next) and scoped (@c15t/react, @c15t/nextjs)
	// stylesheet imports are interchangeable — manage all variants so re-runs
	// normalize an existing import to the requested package.
	return ['c15t/react', 'c15t/next', '@c15t/react', '@c15t/nextjs'];
};

const getStylesheetKind = function getStylesheetKind(
	importPath: string
): StylesheetKind {
	return importPath.includes('/iab/') ? 'iab' : 'base';
};

/**
 * v3 setup imports `styles.css`; Tailwind 3 apps run c15t's
 * `postcss-tailwind3` plugin to flatten its layers (see
 * `postcss-config.ts`), and an existing `styles.tw3.css` import is
 * replaced. The v1 to v2 codemod keeps v2's `styles.tw3.css` for Tailwind 3.
 */
const getDesiredImportPath = function getDesiredImportPath(
	packageName: StyledPackageName,
	kind: StylesheetKind,
	legacyTailwind3: boolean
): string {
	const file = legacyTailwind3 ? 'styles.tw3.css' : 'styles.css';
	return kind === 'base'
		? `${packageName}/${file}`
		: `${packageName}/iab/${file}`;
};

const getDesiredImports = function getDesiredImports(
	packageName: StyledPackageName,
	includeBase: boolean,
	includeIab: boolean,
	legacyTailwind3: boolean
): string[] {
	const imports: string[] = [];

	if (includeBase) {
		imports.push(getDesiredImportPath(packageName, 'base', legacyTailwind3));
	}

	if (includeIab) {
		imports.push(getDesiredImportPath(packageName, 'iab', legacyTailwind3));
	}

	return imports;
};

const getFrameworkImportPattern = function getFrameworkImportPattern(
	packageNames: StyledPackageName[]
): string {
	const escapedPackages = packageNames
		.map((packageName) => packageName.replace('/', '\\/'))
		.join('|');

	return `^\\s*@import\\s+['"]((?:${escapedPackages})(?:\\/iab)?\\/styles(?:\\.tw3)?\\.css)['"];\\s*$`;
};

const getFrameworkImportRegex = function getFrameworkImportRegex(
	packageNames: StyledPackageName[]
): RegExp {
	return new RegExp(getFrameworkImportPattern(packageNames), 'u');
};

const getManagedImportPaths = function getManagedImportPaths(
	content: string,
	managedPackages: StyledPackageName[]
): string[] {
	const importRegex = new RegExp(
		getFrameworkImportPattern(managedPackages),
		'gmu'
	);

	return dedupePaths(
		[...content.matchAll(importRegex)].flatMap((match) =>
			match[1] ? [match[1]] : []
		)
	);
};

const findTopInsertionLineIndex = function findTopInsertionLineIndex(
	lines: string[]
): number {
	let index = 0;

	if (lines[index]?.trim().startsWith('/*')) {
		while (index < lines.length) {
			const line = lines[index];
			index += 1;
			if (line?.includes('*/')) {
				break;
			}
		}

		while (index < lines.length && lines[index]?.trim() === '') {
			index += 1;
		}
	}

	return index;
};

const findTailwindV4InsertionLineIndex =
	function findTailwindV4InsertionLineIndex(
		lines: string[],
		tailwindImportIndex: number
	): number {
		let lastImportIndex = tailwindImportIndex;

		for (
			let index = tailwindImportIndex + 1;
			index < lines.length;
			index += 1
		) {
			const line = lines[index];
			const trimmed = line?.trim() ?? '';
			const isStandaloneCommentLine =
				/^\/\*.*\*\/\s*$/u.test(trimmed) ||
				/^\/\/.*\s*$/u.test(trimmed) ||
				/^\/\*.*\s*$/u.test(trimmed) ||
				/^\*(?:\/|$|\s(?!\{).*)$/u.test(trimmed);

			if (trimmed === '' || isStandaloneCommentLine) {
				continue;
			}

			if (CSS_IMPORT_RE.test(line ?? '')) {
				lastImportIndex = index;
				continue;
			}

			break;
		}

		return lastImportIndex + 1;
	};

const insertImportsIntoCssContent = function insertImportsIntoCssContent(
	content: string,
	desiredImports: string[],
	managedPackages: StyledPackageName[],
	legacyTailwind3: boolean
): string {
	const normalizedContent = content.replace(/\r\n/gu, '\n');
	const hadTrailingNewline = normalizedContent.endsWith('\n');
	const body = hadTrailingNewline
		? normalizedContent.slice(0, -1)
		: normalizedContent;
	const lines = body.length > 0 ? body.split('\n') : [];
	const importRegex = getFrameworkImportRegex(managedPackages);
	const filteredLines = lines.filter((line) => !importRegex.test(line));
	const importLines = desiredImports.map(
		(importPath) => `@import "${importPath}";`
	);

	// Top of the file, or after Tailwind 4's import. With Tailwind 3 the
	// import also goes above the `@tailwind` directives: postcss-import (and
	// Vite, which inlines imports with it) drops an `@import` that follows
	// other statements.
	let insertionIndex = findTopInsertionLineIndex(filteredLines);
	const tailwindImportIndex = filteredLines.findIndex((line) =>
		TAILWIND_V4_IMPORT_RE.test(line)
	);
	if (legacyTailwind3) {
		// v2's documented Tailwind 3 position.
		const componentsIndex = filteredLines.findIndex((line) =>
			TAILWIND_COMPONENTS_RE.test(line)
		);
		const utilitiesIndex = filteredLines.findIndex((line) =>
			TAILWIND_UTILITIES_RE.test(line)
		);
		if (componentsIndex >= 0) {
			insertionIndex = componentsIndex + 1;
		} else if (utilitiesIndex >= 0) {
			insertionIndex = utilitiesIndex;
		}
	} else if (tailwindImportIndex >= 0) {
		insertionIndex = findTailwindV4InsertionLineIndex(
			filteredLines,
			tailwindImportIndex
		);
	}

	const nextLines = [
		...filteredLines.slice(0, insertionIndex),
		...importLines,
		...filteredLines.slice(insertionIndex),
	];
	let nextContent = nextLines.join('\n');

	if (hadTrailingNewline) {
		nextContent += '\n';
	}

	if (content.includes('\r\n')) {
		nextContent = nextContent.replace(/\n/gu, '\r\n');
	}

	return nextContent;
};

const describeImportChange = function describeImportChange(
	content: string,
	managedPackages: StyledPackageName[],
	desiredImportPath: string
): string {
	const kind = getStylesheetKind(desiredImportPath);
	const existingImportPaths = getManagedImportPaths(
		content,
		managedPackages
	).filter((importPath) => getStylesheetKind(importPath) === kind);

	if (existingImportPaths.includes(desiredImportPath)) {
		return `normalized @import "${desiredImportPath}";`;
	}

	// oxlint-disable-next-line prefer-destructuring -- Preserve declaration order, interface shape, and public compatibility.
	const replacedImportPath = existingImportPaths[0];
	if (replacedImportPath) {
		return `replaced @import "${replacedImportPath}"; with @import "${desiredImportPath}";`;
	}

	return `added @import "${desiredImportPath}";`;
};

/** Resolve CSS aliases from the same tsconfig/jsconfig paths Next.js uses. */
const resolveCssAlias = async (
	projectRoot: string,
	specifier: string
): Promise<string[]> => {
	const configPath = ['tsconfig.json', 'jsconfig.json']
		.map((name) => join(projectRoot, name))
		.find((file) => existsSync(file));
	if (!configPath) {
		return [];
	}
	await resolvePlannedPath(configPath);
	let options;
	try {
		options = new Project({
			skipAddingFilesFromTsConfig: true,
			tsConfigFilePath: configPath,
		}).getCompilerOptions();
	} catch {
		// A missing/invalid config must not prevent conventional CSS discovery.
		return [];
	}
	// TypeScript records the defining config's directory for inherited paths.
	const pathsBase =
		'pathsBasePath' in options && typeof options.pathsBasePath === 'string'
			? options.pathsBasePath
			: dirname(configPath);
	const base = options.baseUrl ?? pathsBase;
	const mappings = Object.entries(options.paths ?? {}).sort(
		([left], [right]) => {
			if (left === specifier) {
				return -1;
			}
			if (right === specifier) {
				return 1;
			}
			return (
				(right.split('*')[0] ?? '').length - (left.split('*')[0] ?? '').length
			);
		}
	);
	for (const [pattern, targets] of mappings) {
		const star = pattern.indexOf('*');
		const prefix = star < 0 ? pattern : pattern.slice(0, star);
		const suffix = star < 0 ? '' : pattern.slice(star + 1);
		if (
			star < 0
				? pattern !== specifier
				: !specifier.startsWith(prefix) || !specifier.endsWith(suffix)
		) {
			continue;
		}
		const matched = specifier.slice(
			prefix.length,
			specifier.length - suffix.length
		);
		return targets.map((target) => resolve(base, target.replace('*', matched)));
	}
	return options.baseUrl ? [resolve(options.baseUrl, specifier)] : [];
};

const resolveCssEntrypoint = async function resolveCssEntrypoint({
	projectRoot,
	entrypointPath,
}: Pick<
	EnsureGlobalCssStylesheetImportsOptions,
	'projectRoot' | 'entrypointPath'
>): Promise<{ filePath: string | null; searchedPaths: string[] }> {
	const searchedPaths: string[] = [];

	if (entrypointPath) {
		const resolvedEntrypointPath = normalizePath(projectRoot, entrypointPath);
		await resolvePlannedPath(resolvedEntrypointPath);
		if (existsSync(resolvedEntrypointPath)) {
			const entrypointContent = await readFile(resolvedEntrypointPath, 'utf-8');
			const project = new Project({ useInMemoryFileSystem: true });
			const source = project.createSourceFile(
				resolvedEntrypointPath,
				entrypointContent
			);
			for (const declaration of source.getImportDeclarations()) {
				const moduleSpecifier = declaration.getModuleSpecifierValue();
				if (!isNonModuleLocalCssImport(moduleSpecifier)) {
					continue;
				}
				const candidates = moduleSpecifier.startsWith('.')
					? [resolve(dirname(resolvedEntrypointPath), moduleSpecifier)]
					: // oxlint-disable-next-line no-await-in-loop -- Resolve each imported stylesheet before trying the next.
						await resolveCssAlias(projectRoot, moduleSpecifier);
				for (const candidatePath of candidates) {
					searchedPaths.push(candidatePath);
					// oxlint-disable-next-line no-await-in-loop -- Check each candidate before following it.
					await resolvePlannedPath(candidatePath);
					if (existsSync(candidatePath)) {
						return {
							filePath: candidatePath,
							searchedPaths: dedupePaths(searchedPaths),
						};
					}
				}
			}
		}
	}

	for (const candidate of CSS_ENTRYPOINT_CANDIDATES) {
		const candidatePath = join(projectRoot, candidate);
		searchedPaths.push(candidatePath);
		// oxlint-disable-next-line no-await-in-loop -- Check each candidate before following it.
		await resolvePlannedPath(candidatePath);
		if (existsSync(candidatePath)) {
			return {
				filePath: candidatePath,
				searchedPaths: dedupePaths(searchedPaths),
			};
		}
	}

	return {
		filePath: null,
		searchedPaths: dedupePaths(searchedPaths),
	};
};

export const formatSearchedCssPaths = function formatSearchedCssPaths(
	projectRoot: string,
	searchedPaths: string[]
): string {
	return searchedPaths
		.map((filePath) => relative(projectRoot, filePath) || '.')
		.join(', ');
};

export const ensureGlobalCssStylesheetImports =
	async function ensureGlobalCssStylesheetImports(
		options: EnsureGlobalCssStylesheetImportsOptions
	): Promise<EnsureGlobalCssStylesheetImportsResult> {
		const legacyTailwind3 = isTailwindV3(options.legacyTailwindVersion ?? null);
		const desiredImports = getDesiredImports(
			options.packageName,
			options.includeBase,
			options.includeIab,
			legacyTailwind3
		);

		if (desiredImports.length === 0) {
			return {
				changes: [],
				filePath: null,
				searchedPaths: [],
				updated: false,
			};
		}

		const { filePath, searchedPaths } = await resolveCssEntrypoint(options);
		if (!filePath) {
			return {
				changes: [],
				filePath: null,
				searchedPaths,
				updated: false,
			};
		}

		const content = await readFile(filePath, 'utf-8');
		const managedPackages = getManagedPackages(options.packageName);
		const importedContent = insertImportsIntoCssContent(
			content,
			desiredImports,
			managedPackages,
			legacyTailwind3
		);
		const nextContent = options.layerStarterReset
			? layerStarterReset(importedContent)
			: importedContent;

		if (nextContent === content) {
			return {
				changes: [],
				filePath,
				searchedPaths,
				updated: false,
			};
		}

		if (!options.dryRun) {
			await writeFile(filePath, nextContent, 'utf-8');
		}

		const changes = desiredImports.map((importPath) =>
			describeImportChange(content, managedPackages, importPath)
		);
		if (nextContent !== importedContent) {
			changes.push('moved the universal spacing reset into @layer base');
		}

		return {
			changes,
			filePath,
			searchedPaths,
			updated: true,
		};
	};
