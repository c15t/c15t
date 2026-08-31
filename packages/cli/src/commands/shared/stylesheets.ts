import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';

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

const LOCAL_CSS_IMPORT_RE =
	/^\s*import(?:\s+[^'"]+\s+from\s+)?['"](?<capture1>[^'"]+\.css)['"];\s*$/gmu;

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
	tailwindVersion: string | null;
	entrypointPath?: string | null;
	includeBase: boolean;
	includeIab: boolean;
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
		moduleSpecifier.startsWith('.') &&
		moduleSpecifier.endsWith('.css') &&
		!moduleSpecifier.endsWith('.module.css')
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

export const isTailwindV3 = function isTailwindV3(
	version: string | null
): boolean {
	return (
		version !== null && version !== undefined && /^(?:\^|~)?3/u.test(version)
	);
};

const getDesiredImportPath = function getDesiredImportPath(
	packageName: StyledPackageName,
	kind: StylesheetKind,
	tailwindVersion: string | null
): string {
	const suffix = isTailwindV3(tailwindVersion)
		? 'styles.tw3.css'
		: 'styles.css';
	return kind === 'base'
		? `${packageName}/${suffix}`
		: `${packageName}/iab/${suffix}`;
};

const getDesiredImports = function getDesiredImports(
	packageName: StyledPackageName,
	tailwindVersion: string | null,
	includeBase: boolean,
	includeIab: boolean
): string[] {
	const imports: string[] = [];

	if (includeBase) {
		imports.push(getDesiredImportPath(packageName, 'base', tailwindVersion));
	}

	if (includeIab) {
		imports.push(getDesiredImportPath(packageName, 'iab', tailwindVersion));
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
	tailwindVersion: string | null,
	managedPackages: StyledPackageName[]
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

	let insertionIndex = findTopInsertionLineIndex(filteredLines);

	if (isTailwindV3(tailwindVersion)) {
		const componentsIndex = filteredLines.findIndex((line) =>
			TAILWIND_COMPONENTS_RE.test(line)
		);
		if (componentsIndex >= 0) {
			insertionIndex = componentsIndex + 1;
		} else {
			const utilitiesIndex = filteredLines.findIndex((line) =>
				TAILWIND_UTILITIES_RE.test(line)
			);
			if (utilitiesIndex >= 0) {
				insertionIndex = utilitiesIndex;
			}
		}
	} else {
		const tailwindImportIndex = filteredLines.findIndex((line) =>
			TAILWIND_V4_IMPORT_RE.test(line)
		);
		if (tailwindImportIndex >= 0) {
			insertionIndex = findTailwindV4InsertionLineIndex(
				filteredLines,
				tailwindImportIndex
			);
		}
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
		if (existsSync(resolvedEntrypointPath)) {
			const entrypointContent = await readFile(resolvedEntrypointPath, 'utf-8');
			for (const match of entrypointContent.matchAll(LOCAL_CSS_IMPORT_RE)) {
				// oxlint-disable-next-line prefer-destructuring -- Preserve declaration order, interface shape, and public compatibility.
				const moduleSpecifier = match[1];
				if (!moduleSpecifier || !isNonModuleLocalCssImport(moduleSpecifier)) {
					continue;
				}

				const candidatePath = resolve(
					dirname(resolvedEntrypointPath),
					moduleSpecifier
				);
				searchedPaths.push(candidatePath);
				if (existsSync(candidatePath)) {
					return {
						filePath: candidatePath,
						searchedPaths: dedupePaths(searchedPaths),
					};
				}
			}
		}
	}

	for (const candidate of CSS_ENTRYPOINT_CANDIDATES) {
		const candidatePath = join(projectRoot, candidate);
		searchedPaths.push(candidatePath);
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
		const desiredImports = getDesiredImports(
			options.packageName,
			options.tailwindVersion,
			options.includeBase,
			options.includeIab
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
		const nextContent = insertImportsIntoCssContent(
			content,
			desiredImports,
			options.tailwindVersion,
			managedPackages
		);

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

		return {
			changes,
			filePath,
			searchedPaths,
			updated: true,
		};
	};
