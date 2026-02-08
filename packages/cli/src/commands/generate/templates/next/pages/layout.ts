/**
 * Pages Directory layout template generator
 * Handles updating Next.js Pages Directory _app.tsx files with ConsentManagerProvider
 * and creates separate consent-manager component files
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { SourceFile } from 'ts-morph';
import type { AvailablePackages } from '~/context/framework-detection';
import { generateConsentComponent } from '../../shared/components';
import { runLayoutUpdatePipeline } from '../../shared/layout-pipeline';
import { generateOptionsText } from '../../shared/options';

interface UpdatePagesLayoutOptions {
	projectRoot: string;
	mode: string;
	backendURL?: string;
	useEnvFile?: boolean;
	pkg: AvailablePackages;
	proxyNextjs?: boolean;
	enableDevTools?: boolean;
	selectedScripts?: string[];
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
	optionsText: string,
	selectedScripts?: string[],
	enableDevTools?: boolean
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
	const consentManagerContent = generateConsentComponent({
		importSource: '@c15t/nextjs',
		optionsText,
		selectedScripts,
		initialDataProp: true,
		enableDevTools,
	});

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
 * import { withInitialC15TData } from '@c15t/nextjs';
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
	enableDevTools = false,
	selectedScripts,
}: UpdatePagesLayoutOptions): Promise<{
	updated: boolean;
	filePath: string | null;
	alreadyModified: boolean;
	componentFiles?: ComponentFilePaths;
}> {
	// Generate options text for the component
	const optionsText = generateOptionsText(
		mode,
		backendURL,
		useEnvFile,
		proxyNextjs
	);

	return runLayoutUpdatePipeline({
		filePatterns: PAGES_APP_PATTERNS,
		projectRoot,
		frameworkDirName: 'pages',
		wrapJsx: wrapPagesJsxContent,
		createComponents: async (_layoutFilePath, pagesDir) => {
			return createConsentManagerComponent(
				projectRoot,
				pagesDir,
				optionsText,
				selectedScripts,
				enableDevTools
			);
		},
		afterImport: (appFile) => {
			updateAppComponentTyping(appFile);
			addServerSideDataComment(appFile, backendURL, useEnvFile, proxyNextjs);
		},
	});
}
