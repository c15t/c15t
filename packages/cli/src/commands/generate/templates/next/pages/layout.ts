/* oxlint-disable func-style -- These declarations mirror the generated layout's function-oriented structure. */
/**
 * Pages Directory layout template generator
 * Handles updating Next.js Pages Router _app.tsx files with ConsentProvider.
 * and creates separate consent-manager component files
 */

import type { SourceFile } from 'ts-morph';

import type { AvailablePackages } from '~/context/framework-detection';

import type { StorageMode } from '../../../../../constants';
import type { UIStyle, ExpandedTheme } from '../../../prompts';
import { createConsentManagerComponent } from '../../shared/create-component-files';
import { NEXTJS_CONFIG } from '../../shared/framework-config';
import { runLayoutUpdatePipeline } from '../../shared/layout-pipeline';

interface UpdatePagesLayoutOptions {
	projectRoot: string;
	mode: string;
	backendURL?: string;
	useEnvFile?: boolean;
	pkg: AvailablePackages;
	proxyNextjs?: boolean;
	enableDevTools?: boolean;
	selectedScripts?: string[];
	uiStyle?: UIStyle;
	expandedTheme?: ExpandedTheme;
	layoutFilePath?: string;
}

interface ComponentFilePaths {
	consentManager: string;
}

/**
 * Wraps the JSX content with ConsentManager component
 *
 * @param originalJsx - The original JSX string to wrap
 * @returns The JSX wrapped with ConsentManager component
 *
 * @remarks
 * This function wraps content with <ConsentManager> instead of inline provider components.
 * The v3 Pages Router setup initializes on the client.
 */
function wrapPagesJsxContent(originalJsx: string): string {
	const trimmedJsx = originalJsx.trim();
	const hasParentheses = trimmedJsx.startsWith('(') && trimmedJsx.endsWith(')');

	// If original has parentheses, remove them since we'll add our own
	const cleanJsx = hasParentheses
		? trimmedJsx.slice(1, -1).trim()
		: originalJsx;

	const wrappedContent = `
		<ConsentManager>
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
 * @param optionsText - Stringified options object for ConsentProvider
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
				moduleSpecifier: 'next/app',
				namedImports: ['AppProps'],
			});
		}
	}
}

const PAGES_APP_PATTERNS = [
	'pages/_app.tsx',
	'pages/_app.ts',
	'src/pages/_app.tsx',
	'src/pages/_app.ts',
];

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
 *
 * Unlike App Router, Pages Router only needs one component file because
 * it doesn't use the 'use client' directive pattern.
 */
export function updatePagesLayout({
	projectRoot,
	mode,
	backendURL,
	useEnvFile,
	proxyNextjs,
	enableDevTools = false,
	selectedScripts,
	uiStyle,
	expandedTheme,
	layoutFilePath,
}: UpdatePagesLayoutOptions): Promise<{
	updated: boolean;
	filePath: string | null;
	alreadyModified: boolean;
	componentFiles?: ComponentFilePaths;
}> {
	return runLayoutUpdatePipeline({
		afterImport: updateAppComponentTyping,
		createComponents: (_layoutFilePath, pagesDir) =>
			createConsentManagerComponent(
				projectRoot,
				pagesDir,
				mode as StorageMode,
				proxyNextjs ? '/api/c15t' : backendURL,
				proxyNextjs ? false : useEnvFile,
				selectedScripts,
				enableDevTools,
				expandedTheme,
				'node',
				uiStyle,
				NEXTJS_CONFIG
			),
		filePatterns: PAGES_APP_PATTERNS,
		frameworkDirName: 'pages',
		knownFilePath: layoutFilePath,
		projectRoot,
		wrapJsx: wrapPagesJsxContent,
	});
}
