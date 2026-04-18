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
	/^\s*import(?:\s+[^'"]+\s+from\s+)?['"]([^'"]+\.css)['"];\s*$/gm;

const CSS_IMPORT_RE = /^\s*@import\b.+;\s*$/;
const TAILWIND_V4_IMPORT_RE = /^\s*@import\s+['"]tailwindcss['"];\s*$/;
const TAILWIND_COMPONENTS_RE = /^\s*@tailwind\s+components\s*;\s*$/;
const TAILWIND_UTILITIES_RE = /^\s*@tailwind\s+utilities\s*;\s*$/;

export type StyledPackageName = '@c15t/react' | '@c15t/nextjs' | '@c15t/ui';

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

function normalizePath(projectRoot: string, filePath: string): string {
	if (filePath.startsWith(projectRoot)) {
		return filePath;
	}

	return resolve(projectRoot, filePath);
}

function dedupePaths(paths: string[]): string[] {
	return [...new Set(paths)];
}

function isNonModuleLocalCssImport(moduleSpecifier: string): boolean {
	return (
		moduleSpecifier.startsWith('.') &&
		moduleSpecifier.endsWith('.css') &&
		!moduleSpecifier.endsWith('.module.css')
	);
}

function getManagedPackages(
	packageName: StyledPackageName
): StyledPackageName[] {
	if (packageName === '@c15t/react' || packageName === '@c15t/nextjs') {
		return ['@c15t/react', '@c15t/nextjs'];
	}

	return ['@c15t/ui'];
}

function getImportVariants(
	packageName: StyledPackageName,
	kind: StylesheetKind
): string[] {
	if (kind === 'base') {
		return [`${packageName}/styles.css`, `${packageName}/styles.tw3.css`];
	}

	return [`${packageName}/iab/styles.css`, `${packageName}/iab/styles.tw3.css`];
}

function getDesiredImportPath(
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
}

function getDesiredImports(
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
}

function getFrameworkImportRegex(packageNames: StyledPackageName[]): RegExp {
	const escapedPackages = packageNames
		.map((packageName) => packageName.replace('/', '\\/'))
		.join('|');

	return new RegExp(
		`^\\s*@import\\s+['"](?:${escapedPackages})(?:\\/iab)?\\/styles(?:\\.tw3)?\\.css['"];\\s*$`
	);
}

function findTopInsertionLineIndex(lines: string[]): number {
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
}

function findTailwindV4InsertionLineIndex(
	lines: string[],
	tailwindImportIndex: number
): number {
	let lastImportIndex = tailwindImportIndex;

	for (let index = tailwindImportIndex + 1; index < lines.length; index += 1) {
		const line = lines[index];
		const trimmed = line?.trim() ?? '';

		if (trimmed === '') {
			continue;
		}

		if (CSS_IMPORT_RE.test(line ?? '')) {
			lastImportIndex = index;
			continue;
		}

		break;
	}

	return lastImportIndex + 1;
}

function insertImportsIntoCssContent(
	content: string,
	desiredImports: string[],
	tailwindVersion: string | null,
	managedPackages: StyledPackageName[]
): string {
	const normalizedContent = content.replace(/\r\n/g, '\n');
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
		nextContent = nextContent.replace(/\n/g, '\r\n');
	}

	return nextContent;
}

function describeImportChange(
	content: string,
	packageName: StyledPackageName,
	desiredImportPath: string
): string {
	const kind: StylesheetKind = desiredImportPath.includes('/iab/')
		? 'iab'
		: 'base';
	const variants = getImportVariants(packageName, kind);
	const alternateVariant = variants.find(
		(variant) => variant !== desiredImportPath && content.includes(variant)
	);

	if (alternateVariant) {
		return `replaced @import "${alternateVariant}"; with @import "${desiredImportPath}";`;
	}

	if (content.includes(desiredImportPath)) {
		return `normalized @import "${desiredImportPath}";`;
	}

	return `added @import "${desiredImportPath}";`;
}

async function resolveCssEntrypoint({
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
}

export function formatSearchedCssPaths(
	projectRoot: string,
	searchedPaths: string[]
): string {
	return searchedPaths
		.map((filePath) => relative(projectRoot, filePath) || '.')
		.join(', ');
}

export function isTailwindV3(version: string | null): boolean {
	return version != null && /^(?:\^|~)?3/.test(version);
}

export async function ensureGlobalCssStylesheetImports(
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
			updated: false,
			filePath: null,
			searchedPaths: [],
			changes: [],
		};
	}

	const { filePath, searchedPaths } = await resolveCssEntrypoint(options);
	if (!filePath) {
		return {
			updated: false,
			filePath: null,
			searchedPaths,
			changes: [],
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
			updated: false,
			filePath,
			searchedPaths,
			changes: [],
		};
	}

	if (!options.dryRun) {
		await writeFile(filePath, nextContent, 'utf-8');
	}

	const changes = desiredImports.map((importPath) =>
		describeImportChange(content, options.packageName, importPath)
	);

	return {
		updated: true,
		filePath,
		searchedPaths,
		changes,
	};
}
