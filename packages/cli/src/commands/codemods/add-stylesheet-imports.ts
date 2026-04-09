import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { Project } from 'ts-morph';

const SUPPORTED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const IGNORED_DIRS = new Set([
	'.git',
	'.next',
	'.turbo',
	'coverage',
	'dist',
	'build',
	'node_modules',
	'out',
]);

/**
 * Import paths that indicate the project uses styled (prebuilt) UI components.
 * Headless-only imports are excluded so the codemod does not add unnecessary
 * stylesheets.
 */
const STYLED_REACT_IMPORT_PATTERNS = [
	'@c15t/react',
	'@c15t/react/components',
] as const;

const STYLED_NEXTJS_IMPORT_PATTERNS = [
	'@c15t/nextjs',
	'@c15t/nextjs/components',
] as const;

const IAB_REACT_IMPORT_PATTERNS = ['@c15t/react/iab'] as const;

const IAB_NEXTJS_IMPORT_PATTERNS = ['@c15t/nextjs/iab'] as const;

/**
 * Import paths that are headless-only and should NOT trigger stylesheet
 * insertion.
 */
const HEADLESS_ONLY_PATTERNS = [
	'@c15t/react/headless',
	'@c15t/nextjs/headless',
	'c15t',
] as const;

/**
 * Root entrypoint candidates in priority order.
 */
const REACT_ENTRYPOINTS = [
	'src/main.tsx',
	'src/main.jsx',
	'src/index.tsx',
	'src/index.jsx',
	'src/App.tsx',
	'src/App.jsx',
] as const;

const NEXTJS_ENTRYPOINTS = [
	'app/layout.tsx',
	'app/layout.jsx',
	'pages/_app.tsx',
	'pages/_app.jsx',
] as const;

export interface CodemodRunOptions {
	/**
	 * Absolute or relative project root to scan for source files.
	 */
	projectRoot: string;
	/**
	 * Whether to skip saving transformed files.
	 */
	dryRun: boolean;
}

/**
 * Result summary for a codemod run.
 */
export interface CodemodRunResult {
	/**
	 * Number of source files scanned.
	 */
	totalFiles: number;
	/**
	 * Per-file transformation summaries.
	 */
	changedFiles: Array<{
		filePath: string;
		operations: number;
		summaries: string[];
	}>;
	/**
	 * Non-fatal per-file transform errors.
	 */
	errors: Array<{ filePath: string; error: string }>;
}

type Framework = 'react' | 'nextjs';

type DetectionResult = {
	framework: Framework | null;
	usesStyledUi: boolean;
	usesIabUi: boolean;
	headlessOnly: boolean;
};

async function detectTailwindVersion(
	projectRoot: string
): Promise<string | null> {
	const packageJsonPath = join(projectRoot, 'package.json');
	if (!existsSync(packageJsonPath)) {
		return null;
	}

	try {
		const content = await readFile(packageJsonPath, 'utf-8');
		const parsed = JSON.parse(content) as {
			dependencies?: Record<string, string>;
			devDependencies?: Record<string, string>;
		};

		return (
			parsed.dependencies?.tailwindcss ??
			parsed.devDependencies?.tailwindcss ??
			null
		);
	} catch {
		return null;
	}
}

function isTailwindV3(version: string | null): boolean {
	return version != null && /^(?:\^|~)?3/.test(version);
}

async function collectSourceFiles(rootDir: string): Promise<string[]> {
	const files: string[] = [];

	async function walk(currentDir: string): Promise<void> {
		const entries = await readdir(currentDir, { withFileTypes: true });

		for (const entry of entries) {
			if (entry.isDirectory()) {
				if (IGNORED_DIRS.has(entry.name)) {
					continue;
				}
				await walk(join(currentDir, entry.name));
				continue;
			}

			if (!entry.isFile()) {
				continue;
			}

			const extension = extname(entry.name).toLowerCase();
			if (!SUPPORTED_EXTENSIONS.has(extension)) {
				continue;
			}

			files.push(join(currentDir, entry.name));
		}
	}

	await walk(rootDir);

	return files;
}

function matchesAnyPattern(
	importPath: string,
	patterns: readonly string[]
): boolean {
	return patterns.some(
		(pattern) => importPath === pattern || importPath.startsWith(`${pattern}/`)
	);
}

/**
 * Scans all project source files to determine:
 * - Which framework is used (react vs nextjs)
 * - Whether styled UI components are imported
 * - Whether IAB UI components are imported
 * - Whether ONLY headless/unstyled APIs are used
 */
function detectImports(project: Project, filePaths: string[]): DetectionResult {
	let usesReact = false;
	let usesNextjs = false;
	let usesStyledUi = false;
	let usesIabUi = false;
	let usesHeadless = false;
	let hasAnyC15tImport = false;

	for (const filePath of filePaths) {
		const sourceFile = project.addSourceFileAtPathIfExists(filePath);
		if (!sourceFile) {
			continue;
		}

		const importDeclarations = sourceFile.getImportDeclarations();

		for (const importDecl of importDeclarations) {
			const moduleSpecifier = importDecl.getModuleSpecifierValue();

			// Check headless-only patterns
			if (matchesAnyPattern(moduleSpecifier, HEADLESS_ONLY_PATTERNS)) {
				usesHeadless = true;
				hasAnyC15tImport = true;
				continue;
			}

			// Check IAB imports (React)
			if (matchesAnyPattern(moduleSpecifier, IAB_REACT_IMPORT_PATTERNS)) {
				usesIabUi = true;
				usesReact = true;
				hasAnyC15tImport = true;
				continue;
			}

			// Check IAB imports (Next.js)
			if (matchesAnyPattern(moduleSpecifier, IAB_NEXTJS_IMPORT_PATTERNS)) {
				usesIabUi = true;
				usesNextjs = true;
				hasAnyC15tImport = true;
				continue;
			}

			// Check styled React imports
			if (matchesAnyPattern(moduleSpecifier, STYLED_REACT_IMPORT_PATTERNS)) {
				usesStyledUi = true;
				usesReact = true;
				hasAnyC15tImport = true;
				continue;
			}

			// Check styled Next.js imports
			if (matchesAnyPattern(moduleSpecifier, STYLED_NEXTJS_IMPORT_PATTERNS)) {
				usesStyledUi = true;
				usesNextjs = true;
				hasAnyC15tImport = true;
				continue;
			}

			// Next.js main export re-exports IAB, so detect it as styled + IAB
			if (moduleSpecifier === '@c15t/nextjs') {
				usesStyledUi = true;
				usesNextjs = true;
				hasAnyC15tImport = true;
				continue;
			}
		}
	}

	let framework: Framework | null = null;
	if (usesNextjs) {
		framework = 'nextjs';
	} else if (usesReact) {
		framework = 'react';
	}

	const headlessOnly =
		hasAnyC15tImport && usesHeadless && !usesStyledUi && !usesIabUi;

	return {
		framework,
		usesStyledUi,
		usesIabUi,
		headlessOnly,
	};
}

/**
 * Finds the best root entrypoint file that exists in the project.
 */
function findEntrypoint(
	projectRoot: string,
	framework: Framework
): string | null {
	const candidates =
		framework === 'nextjs' ? NEXTJS_ENTRYPOINTS : REACT_ENTRYPOINTS;

	for (const candidate of candidates) {
		const fullPath = join(projectRoot, candidate);
		if (existsSync(fullPath)) {
			return fullPath;
		}
	}

	return null;
}

/**
 * Checks whether a specific CSS import already exists in a source file.
 */
function hasCssImport(
	project: Project,
	filePath: string,
	cssImportPath: string
): boolean {
	const sourceFile = project.addSourceFileAtPathIfExists(filePath);
	if (!sourceFile) {
		return false;
	}

	const importDeclarations = sourceFile.getImportDeclarations();
	return importDeclarations.some(
		(importDecl) => importDecl.getModuleSpecifierValue() === cssImportPath
	);
}

/**
 * Adds a CSS import statement at the top of the file (after existing imports).
 */
function addCssImport(
	project: Project,
	filePath: string,
	cssImportPath: string
): boolean {
	const sourceFile = project.addSourceFileAtPathIfExists(filePath);
	if (!sourceFile) {
		return false;
	}

	// Check if it already exists
	const importDeclarations = sourceFile.getImportDeclarations();
	const alreadyExists = importDeclarations.some(
		(importDecl) => importDecl.getModuleSpecifierValue() === cssImportPath
	);

	if (alreadyExists) {
		return false;
	}

	// Find the last import declaration to insert after it
	if (importDeclarations.length > 0) {
		const lastImport = importDeclarations[importDeclarations.length - 1];
		if (lastImport) {
			sourceFile.insertStatements(
				lastImport.getChildIndex() + 1,
				`import '${cssImportPath}';`
			);
		}
	} else {
		// No existing imports; add at the top
		sourceFile.insertStatements(0, `import '${cssImportPath}';`);
	}

	return true;
}

function replaceCssImport(
	project: Project,
	filePath: string,
	fromPath: string,
	toPath: string
): boolean {
	const sourceFile = project.addSourceFileAtPathIfExists(filePath);
	if (!sourceFile) {
		return false;
	}

	const importDeclaration = sourceFile
		.getImportDeclarations()
		.find((importDecl) => importDecl.getModuleSpecifierValue() === fromPath);

	if (!importDeclaration) {
		return false;
	}

	importDeclaration.setModuleSpecifier(toPath);
	return true;
}

/**
 * Runs the add-stylesheet-imports codemod across project source files.
 *
 * Detects whether the project uses styled c15t UI components and adds the
 * required CSS import(s) to the appropriate root entrypoint file.
 *
 * @param options Codemod execution options.
 * @returns Summary with changed files and non-fatal per-file errors.
 *
 * @example
 * ```ts
 * const result = await runAddStylesheetImportsCodemod({
 *   projectRoot: process.cwd(),
 *   dryRun: true,
 * });
 * ```
 *
 * @throws Propagates unexpected setup failures such as directory traversal errors.
 */
export async function runAddStylesheetImportsCodemod(
	options: CodemodRunOptions
): Promise<CodemodRunResult> {
	const project = new Project({
		skipAddingFilesFromTsConfig: true,
		compilerOptions: {
			allowJs: true,
		},
	});

	const filePaths = await collectSourceFiles(options.projectRoot);
	const changedFiles: Array<{
		filePath: string;
		operations: number;
		summaries: string[];
	}> = [];
	const errors: Array<{ filePath: string; error: string }> = [];

	// Phase 1: Detect imports across all source files
	const detection = detectImports(project, filePaths);

	// If no framework detected, nothing to do
	if (!detection.framework) {
		return {
			totalFiles: filePaths.length,
			changedFiles,
			errors,
		};
	}

	// If the project only uses headless/unstyled APIs, skip
	if (detection.headlessOnly) {
		return {
			totalFiles: filePaths.length,
			changedFiles,
			errors,
		};
	}

	// If no styled UI and no IAB UI detected, nothing to do
	if (!detection.usesStyledUi && !detection.usesIabUi) {
		return {
			totalFiles: filePaths.length,
			changedFiles,
			errors,
		};
	}

	// Phase 2: Find the best root entrypoint
	const entrypoint = findEntrypoint(options.projectRoot, detection.framework);

	if (!entrypoint) {
		const candidateList =
			detection.framework === 'nextjs'
				? NEXTJS_ENTRYPOINTS.join(', ')
				: REACT_ENTRYPOINTS.join(', ');
		errors.push({
			filePath: options.projectRoot,
			error: `No root entrypoint found. Looked for: ${candidateList}`,
		});
		return {
			totalFiles: filePaths.length,
			changedFiles,
			errors,
		};
	}

	// Phase 3: Add CSS imports
	const pkg = detection.framework === 'nextjs' ? '@c15t/nextjs' : '@c15t/react';
	const tailwindVersion = await detectTailwindVersion(options.projectRoot);
	const baseStylesheet = isTailwindV3(tailwindVersion)
		? `${pkg}/styles.tw3.css`
		: `${pkg}/styles.css`;
	const iabStylesheet = isTailwindV3(tailwindVersion)
		? `${pkg}/iab/styles.tw3.css`
		: `${pkg}/iab/styles.css`;
	const operations: number[] = [];
	const summaries: string[] = [];

	try {
		// Add base stylesheet if styled UI is used (not just IAB)
		if (detection.usesStyledUi) {
			const baseCss = baseStylesheet;
			const fallbackBaseCss = baseCss.endsWith('.tw3.css')
				? `${pkg}/styles.css`
				: `${pkg}/styles.tw3.css`;
			if (
				!hasCssImport(project, entrypoint, baseCss) &&
				hasCssImport(project, entrypoint, fallbackBaseCss)
			) {
				const replaced = replaceCssImport(
					project,
					entrypoint,
					fallbackBaseCss,
					baseCss
				);
				if (replaced) {
					operations.push(1);
					summaries.push(
						`replaced import '${fallbackBaseCss}' with '${baseCss}'`
					);
				}
			} else if (!hasCssImport(project, entrypoint, baseCss)) {
				const added = addCssImport(project, entrypoint, baseCss);
				if (added) {
					operations.push(1);
					summaries.push(`added import '${baseCss}'`);
				}
			}
		}

		// Add IAB stylesheet if IAB UI is used
		if (detection.usesIabUi) {
			const iabCss = iabStylesheet;
			const fallbackIabCss = iabCss.endsWith('.tw3.css')
				? `${pkg}/iab/styles.css`
				: `${pkg}/iab/styles.tw3.css`;
			if (
				!hasCssImport(project, entrypoint, iabCss) &&
				hasCssImport(project, entrypoint, fallbackIabCss)
			) {
				const replaced = replaceCssImport(
					project,
					entrypoint,
					fallbackIabCss,
					iabCss
				);
				if (replaced) {
					operations.push(1);
					summaries.push(
						`replaced import '${fallbackIabCss}' with '${iabCss}'`
					);
				}
			} else if (!hasCssImport(project, entrypoint, iabCss)) {
				const added = addCssImport(project, entrypoint, iabCss);
				if (added) {
					operations.push(1);
					summaries.push(`added import '${iabCss}'`);
				}
			}
		}

		if (operations.length > 0) {
			changedFiles.push({
				filePath: entrypoint,
				operations: operations.length,
				summaries,
			});

			if (!options.dryRun) {
				const sourceFile = project.getSourceFile(entrypoint);
				if (sourceFile) {
					await sourceFile.save();
				}
			}
		}
	} catch (error) {
		errors.push({
			filePath: entrypoint,
			error: error instanceof Error ? error.message : String(error),
		});
	}

	return {
		totalFiles: filePaths.length,
		changedFiles,
		errors,
	};
}
