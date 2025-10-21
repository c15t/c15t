/**
 * Pages Directory layout template generator
 * Handles updating Next.js Pages Directory _app.tsx files with ConsentManagerProvider
 * and creates separate consent-manager component files
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { Project, type SourceFile, SyntaxKind } from 'ts-morph';
import type { AvailablePackages } from '~/context/framework-detection';
import { generateOptionsText } from '../../shared/options';
import { generateConsentManagerTemplate } from './components';

interface UpdatePagesLayoutOptions {
	projectRoot: string;
	mode: string;
	backendURL?: string;
	useEnvFile?: boolean;
	pkg: AvailablePackages;
	proxyNextjs?: boolean;
}

interface ComponentFilePaths {
	consentManager: string;
}

/**
 * Finds the Pages Directory _app file in the project
 *
 * @param project - ts-morph Project instance
 * @param projectRoot - Root directory of the project
 * @returns The _app source file if found, undefined otherwise
 *
 * @remarks
 * Searches for _app files in the following order:
 * - pages/_app.tsx
 * - pages/_app.ts
 * - src/pages/_app.tsx
 * - src/pages/_app.ts
 */
function findPagesAppFile(
	project: Project,
	projectRoot: string
): SourceFile | undefined {
	const appPatterns = [
		'pages/_app.tsx',
		'pages/_app.ts',
		'src/pages/_app.tsx',
		'src/pages/_app.ts',
	];

	for (const pattern of appPatterns) {
		const files = project.addSourceFilesAtPaths(`${projectRoot}/${pattern}`);
		if (files.length > 0) {
			return files[0];
		}
	}
}

/**
 * Determines the pages directory path based on the _app file location
 *
 * @param appFilePath - Full path to the _app file (can be absolute or relative)
 * @returns The pages directory path relative to project root
 *
 * @remarks
 * Returns either 'pages' or 'src/pages' depending on where the _app file is located.
 * Uses path utilities for cross-platform compatibility (handles both Windows and Unix paths).
 */
function getPagesDirectory(appFilePath: string): string {
	// Normalize the path to handle different path separators and formats
	const normalizedPath = path.normalize(appFilePath);

	// Create platform-specific path segment to check for
	const srcPagesSegment = path.join('src', 'pages');

	// Check if the normalized path contains the 'src/pages' (or 'src\pages' on Windows) segment
	if (normalizedPath.includes(srcPagesSegment)) {
		return path.join('src', 'pages');
	}

	return 'pages';
}

/**
 * Computes a relative module specifier from one file to another
 *
 * @param fromFilePath - The file that will contain the import (e.g., _app file)
 * @param toFilePath - The file being imported (e.g., consent-manager file)
 * @returns A relative module specifier suitable for ES modules (e.g., './consent-manager' or '../consent-manager')
 *
 * @remarks
 * - Computes the relative path between two files
 * - Normalizes path separators to forward slashes for ES modules
 * - Ensures the path starts with './' or '../'
 * - Strips the file extension for bare imports
 */
function computeRelativeModuleSpecifier(
	fromFilePath: string,
	toFilePath: string
): string {
	// Get the directory of the file that will contain the import
	const fromDir = path.dirname(fromFilePath);

	// Compute relative path from the source directory to the target file
	let relativePath = path.relative(fromDir, toFilePath);

	// Normalize path separators to forward slashes (for module specifiers)
	relativePath = relativePath.split(path.sep).join('/');

	// Strip the file extension (.ts, .tsx, .js, .jsx)
	relativePath = relativePath.replace(/\.(tsx?|jsx?)$/, '');

	// Ensure the path starts with './' or '../'
	if (!relativePath.startsWith('.')) {
		relativePath = `./${relativePath}`;
	}

	return relativePath;
}

/**
 * Adds the ConsentManager import to the _app file
 *
 * @param appFile - The _app source file to update
 * @param consentManagerFilePath - The absolute path to the consent-manager file
 *
 * @remarks
 * Computes the correct relative import path from the _app file to the consent-manager file,
 * handling nested directory structures correctly.
 */
function addConsentManagerImport(
	appFile: SourceFile,
	consentManagerFilePath: string
): void {
	const appFilePath = appFile.getFilePath();

	// Compute the correct relative module specifier
	const moduleSpecifier = computeRelativeModuleSpecifier(
		appFilePath,
		consentManagerFilePath
	);

	// Check if import already exists (check for the computed path or common variations)
	const existingImports = appFile.getImportDeclarations();
	const hasConsentManagerImport = existingImports.some((importDecl) => {
		const existingSpec = importDecl.getModuleSpecifierValue();
		// Check if it matches the computed specifier or ends with 'consent-manager'
		return (
			existingSpec === moduleSpecifier ||
			existingSpec.endsWith('consent-manager') ||
			existingSpec.endsWith('consent-manager.tsx')
		);
	});

	if (!hasConsentManagerImport) {
		appFile.addImportDeclaration({
			namedImports: ['ConsentManager'],
			moduleSpecifier,
		});
	}
}

/**
 * Wraps the JSX content with ConsentManager component
 *
 * @param originalJsx - The original JSX string to wrap
 * @returns The JSX wrapped with ConsentManager component
 *
 * @remarks
 * This function wraps content with <ConsentManager> instead of inline provider components.
 * For Pages Directory, we pass initialData from pageProps.
 */
function wrapPagesJsxContent(originalJsx: string): string {
	const trimmedJsx = originalJsx.trim();
	const hasParentheses = trimmedJsx.startsWith('(') && trimmedJsx.endsWith(')');

	// If original has parentheses, remove them since we'll add our own
	const cleanJsx = hasParentheses
		? trimmedJsx.slice(1, -1).trim()
		: originalJsx;

	const wrappedContent = `
		<ConsentManager initialData={pageProps.initialC15TData}>
			${cleanJsx}
		</ConsentManager>
	`;

	return `(${wrappedContent})`;
}

/**
 * Creates the consent-manager component file in a components directory
 *
 * @param projectRoot - Root directory of the project
 * @param pagesDir - Pages directory path (either 'pages' or 'src/pages')
 * @param optionsText - Stringified options object for ConsentManagerProvider
 * @returns Object containing path to created file
 *
 * @throws {Error} When file cannot be created
 *
 * @remarks
 * Creates the component in a sibling `components` directory to avoid creating
 * an unintended route (files in `pages/` automatically become routes in Next.js).
 *
 * Creates one file:
 * - components/consent-manager.tsx - Component with provider, UI, scripts, and callbacks
 *
 * Unlike App Directory, Pages Directory doesn't need a separate client component
 * because it doesn't use the 'use client' directive pattern.
 */
async function createConsentManagerComponent(
	projectRoot: string,
	pagesDir: string,
	optionsText: string
): Promise<ComponentFilePaths> {
	// Determine the components directory path based on pages directory location
	// If pages is at 'src/pages', components should be at 'src/components'
	// If pages is at 'pages', components should be at 'components'
	let componentsDir: string;
	if (pagesDir.includes('src')) {
		componentsDir = path.join('src', 'components');
	} else {
		componentsDir = 'components';
	}

	const componentsDirPath = path.join(projectRoot, componentsDir);

	// Ensure components directory exists
	await fs.mkdir(componentsDirPath, { recursive: true });

	// Generate component file content
	const consentManagerContent = generateConsentManagerTemplate(optionsText);

	// Define file path in components directory
	const consentManagerPath = path.join(
		componentsDirPath,
		'consent-manager.tsx'
	);

	// Write file
	await fs.writeFile(consentManagerPath, consentManagerContent, 'utf-8');

	return {
		consentManager: consentManagerPath,
	};
}

function addServerSideDataComment(
	appFile: SourceFile,
	backendURL?: string,
	useEnvFile?: boolean,
	proxyNextjs?: boolean
): void {
	const existingComments = appFile.getLeadingCommentRanges();

	// Generate the appropriate URL based on configuration
	let urlExample: string;
	if (proxyNextjs) {
		urlExample = "'/api/c15t'";
	} else if (useEnvFile) {
		urlExample = 'process.env.NEXT_PUBLIC_C15T_URL!';
	} else {
		urlExample = `'${backendURL || 'https://your-instance.c15t.dev'}'`;
	}

	const serverSideComment = `/**
 * Note: To get the initial server-side data on other pages, add this to each page:
 *
 * import { withInitialC15TData } from '@c15t/nextjs/pages';
 *
 * export const getServerSideProps = withInitialC15TData(${urlExample});
 *
 * This will automatically pass initialC15TData to pageProps.initialC15TData
 */`;

	// Check if similar comment already exists
	const hasServerSideComment = existingComments.some((comment) =>
		comment.getText().includes('withInitialC15TData')
	);

	if (!hasServerSideComment) {
		appFile.insertText(0, `${serverSideComment}\n\n`);
	}
}

function updateAppComponentTyping(appFile: SourceFile): void {
	const exportAssignment = appFile.getExportAssignment(() => true);
	if (!exportAssignment) {
		return;
	}

	const declaration = exportAssignment.getExpression();
	if (!declaration) {
		return;
	}

	// Check if it's a function declaration that needs typing
	const text = declaration.getText();
	if (text.includes('pageProps') && !text.includes('AppProps')) {
		// Add AppProps import if not present
		const hasAppPropsImport = appFile
			.getImportDeclarations()
			.some(
				(importDecl) =>
					importDecl.getModuleSpecifierValue() === 'next/app' &&
					importDecl
						.getNamedImports()
						.some((namedImport) => namedImport.getName() === 'AppProps')
			);

		if (!hasAppPropsImport) {
			appFile.addImportDeclaration({
				namedImports: ['AppProps'],
				moduleSpecifier: 'next/app',
			});
		}
	}
}

/**
 * Updates Next.js Pages Directory _app with consent management component
 *
 * @param options - Configuration options for the update
 * @returns Information about the update operation including file paths
 *
 * @throws {Error} When component file cannot be created or _app cannot be updated
 *
 * @remarks
 * This function performs the following steps:
 * 1. Locates the Pages Directory _app file
 * 2. Checks if consent management is already configured
 * 3. Creates consent-manager.tsx file
 * 4. Adds ConsentManager import to _app
 * 5. Wraps _app content with ConsentManager component
 * 6. Adds helpful comment about withInitialC15TData
 *
 * Unlike App Directory, Pages Directory only needs one component file because
 * it doesn't use the 'use client' directive pattern.
 */
export async function updatePagesLayout({
	projectRoot,
	mode,
	backendURL,
	useEnvFile,
	proxyNextjs,
}: UpdatePagesLayoutOptions): Promise<{
	updated: boolean;
	filePath: string | null;
	alreadyModified: boolean;
	componentFiles?: ComponentFilePaths;
}> {
	const project = new Project();
	const appFile = findPagesAppFile(project, projectRoot);

	if (!appFile) {
		return { updated: false, filePath: null, alreadyModified: false };
	}

	const appFilePath = appFile.getFilePath();
	const pagesDir = getPagesDirectory(appFilePath);

	// Check if ConsentManager is already imported
	const existingImports = appFile.getImportDeclarations();
	const hasConsentManagerImport = existingImports.some((importDecl) => {
		const specifier = importDecl.getModuleSpecifierValue();
		// Check for any import ending with 'consent-manager' (handles various paths)
		return (
			specifier.endsWith('/consent-manager') ||
			specifier.endsWith('/consent-manager.tsx') ||
			specifier === './consent-manager' ||
			specifier === './consent-manager.tsx'
		);
	});

	if (hasConsentManagerImport) {
		return {
			updated: false,
			filePath: appFilePath,
			alreadyModified: true,
		};
	}

	// Generate options text for the component
	const optionsText = generateOptionsText(
		mode,
		backendURL,
		useEnvFile,
		proxyNextjs
	);

	// Create consent manager component file
	const componentFiles = await createConsentManagerComponent(
		projectRoot,
		pagesDir,
		optionsText
	);

	// Add import for ConsentManager with correct relative path
	addConsentManagerImport(appFile, componentFiles.consentManager);
	updateAppComponentTyping(appFile);
	addServerSideDataComment(appFile, backendURL, useEnvFile, proxyNextjs);

	// Update the _app JSX
	const returnStatement = appFile.getDescendantsOfKind(
		SyntaxKind.ReturnStatement
	)[0];
	if (!returnStatement) {
		return {
			updated: false,
			filePath: appFilePath,
			alreadyModified: false,
		};
	}

	const expression = returnStatement.getExpression();
	if (!expression) {
		return {
			updated: false,
			filePath: appFilePath,
			alreadyModified: false,
		};
	}

	const originalJsx = expression.getText();
	const newJsx = wrapPagesJsxContent(originalJsx);
	returnStatement.replaceWithText(`return ${newJsx}`);

	await appFile.save();
	return {
		updated: true,
		filePath: appFilePath,
		alreadyModified: false,
		componentFiles,
	};
}
