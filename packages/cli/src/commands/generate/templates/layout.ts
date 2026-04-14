/**
 * Templates module for generating configuration files
 * This module now serves as a wrapper that routes to the appropriate implementation
 * based on the detected project structure (App Directory vs Pages Directory)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import {
	Project,
	type ReturnStatement,
	type SourceFile,
	SyntaxKind,
} from 'ts-morph';
import type { AvailablePackages } from '~/context/framework-detection';
import type { StorageMode } from '../../../constants';
import type { ExpandedTheme, UIStyle } from '../prompts';
import { updateNextLayout } from './next';
import { generateConsentComponent } from './shared/components';
import { getComponentsDirectory, getSourceDirectory } from './shared/directory';
import { generateExpandedThemeTemplate } from './shared/expanded-components';
import { REACT_CONFIG } from './shared/framework-config';
import {
	addConsentManagerImport,
	hasConsentManagerImport,
} from './shared/module-specifier';
import { generateOptionsText } from './shared/options';
import { generateSimpleWrapperComponent } from './shared/server-components';

interface UpdateReactLayoutOptions {
	projectRoot: string;
	mode: string;
	backendURL?: string;
	useEnvFile?: boolean;
	pkg: AvailablePackages;
	proxyNextjs?: boolean;
	enableSSR?: boolean;
	enableDevTools?: boolean;
	uiStyle?: UIStyle;
	expandedTheme?: ExpandedTheme;
	selectedScripts?: string[];
}

interface ComponentFilePaths {
	consentManager: string;
	consentManagerDir?: string;
}

/**
 * Updates JSX content for generic React projects
 * Wraps the main component's return JSX with ConsentManager component
 *
 * @param layoutFile - The source file to update
 * @returns True if JSX was successfully updated, false otherwise
 *
 * @throws {Error} When JSX cannot be parsed or updated
 */
function updateGenericReactJsx(layoutFile: SourceFile): boolean {
	// Find the main function component (could be function declaration or arrow function)
	const functionDeclarations = layoutFile.getFunctions();
	const variableDeclarations = layoutFile.getVariableDeclarations();

	// Look for return statements in function declarations
	for (const func of functionDeclarations) {
		const returnStatement = func.getDescendantsOfKind(
			SyntaxKind.ReturnStatement
		)[0];
		if (returnStatement) {
			return wrapReturnStatementWithConsentManager(returnStatement);
		}
	}

	// Look for return statements in arrow functions
	for (const varDecl of variableDeclarations) {
		const initializer = varDecl.getInitializer();
		if (initializer) {
			const returnStatement = initializer.getDescendantsOfKind(
				SyntaxKind.ReturnStatement
			)[0];
			if (returnStatement) {
				return wrapReturnStatementWithConsentManager(returnStatement);
			}
		}
	}

	return false;
}

/**
 * Wraps a return statement's JSX with ConsentManager component
 *
 * @param returnStatement - The return statement to wrap
 * @returns True if successfully wrapped, false otherwise
 */
function wrapReturnStatementWithConsentManager(
	returnStatement: ReturnStatement
): boolean {
	const expression = returnStatement.getExpression();
	if (!expression) {
		return false;
	}

	// Unwrap parenthesized expression if present: return (...) -> ...
	let originalJsx = expression.getText();
	if (originalJsx.startsWith('(') && originalJsx.endsWith(')')) {
		originalJsx = originalJsx.slice(1, -1).trim();
	}

	// Wrap the JSX with ConsentManager
	const newJsx = `(
		<ConsentManager>
			${originalJsx}
		</ConsentManager>
	)`;

	returnStatement.replaceWithText(`return ${newJsx}`);
	return true;
}

/**
 * Creates the consent-manager component files in the React project
 *
 * @param projectRoot - Root directory of the project
 * @param sourceDir - Source directory path (either 'src' or '')
 * @param mode - Storage mode for consent management
 * @param backendURL - Backend URL for hosted/self-hosted modes
 * @param useEnvFile - Whether to use environment variables
 * @param selectedScripts - Selected scripts to include
 * @param enableDevTools - Whether to add DevTools component
 * @param expandedTheme - Theme preset selection
 * @returns Object containing path to created files
 *
 * @throws {Error} When files cannot be created
 *
 * @remarks
 * Creates in components/consent-manager/:
 * - index.tsx - Simple wrapper that imports and renders provider
 * - provider.tsx - Client provider with ConsentManagerProvider, Banner, Dialog
 * - theme.ts - (optional) Generated when user selects a custom theme
 */
async function createConsentManagerComponent(
	projectRoot: string,
	sourceDir: string,
	mode: StorageMode,
	backendURL?: string,
	useEnvFile?: boolean,
	selectedScripts?: string[],
	enableDevTools?: boolean,
	expandedTheme?: ExpandedTheme
): Promise<ComponentFilePaths> {
	const hasTheme = expandedTheme && expandedTheme !== 'none';

	// Detect or create components directory
	const componentsDir = await getComponentsDirectory(projectRoot, sourceDir);
	const consentManagerDirPath = path.join(
		projectRoot,
		componentsDir,
		'consent-manager'
	);

	// Generate component file content
	const optionsText = generateOptionsText(
		mode,
		backendURL,
		useEnvFile,
		undefined,
		true
	);
	const providerContent = generateConsentComponent({
		importSource: '@c15t/react',
		optionsText,
		selectedScripts,
		enableDevTools,
		useClientDirective: true,
		defaultExport: true,
		includeTheme: Boolean(hasTheme),
		includeOverrides: true,
		docsSlug: 'react',
	});
	const indexContent = generateSimpleWrapperComponent('React', 'react');

	// Define file paths
	const indexPath = path.join(consentManagerDirPath, 'index.tsx');
	const providerPath = path.join(consentManagerDirPath, 'provider.tsx');

	// Create directory and write files
	await fs.mkdir(consentManagerDirPath, { recursive: true });
	const writePromises: Promise<void>[] = [
		fs.writeFile(indexPath, indexContent, 'utf-8'),
		fs.writeFile(providerPath, providerContent, 'utf-8'),
	];

	// Generate theme file when a theme is selected
	if (hasTheme) {
		const themeContent = generateExpandedThemeTemplate(
			expandedTheme,
			REACT_CONFIG
		);
		const themePath = path.join(consentManagerDirPath, 'theme.ts');
		writePromises.push(fs.writeFile(themePath, themeContent, 'utf-8'));
	}

	await Promise.all(writePromises);

	return {
		consentManager: indexPath,
		consentManagerDir: consentManagerDirPath,
	};
}

/**
 * Fallback function for non-Next.js React projects
 * Handles generic React layout updates for projects that don't use Next.js structure
 *
 * @param options - Configuration options for updating the layout
 * @returns Information about the update operation
 *
 * @throws {Error} When layout file cannot be parsed or updated
 */
async function updateGenericReactLayout({
	projectRoot,
	mode,
	backendURL,
	useEnvFile,
	proxyNextjs,
	selectedScripts,
	enableDevTools,
	expandedTheme,
}: UpdateReactLayoutOptions): Promise<{
	updated: boolean;
	filePath: string | null;
	alreadyModified: boolean;
	componentFiles?: ComponentFilePaths;
}> {
	// Generic React layout patterns (Vite, CRA, etc.)
	const layoutPatterns = [
		'app.tsx',
		'App.tsx',
		'app.jsx',
		'App.jsx',
		'src/app.tsx',
		'src/App.tsx',
		'src/app.jsx',
		'src/App.jsx',
		'src/app/app.tsx',
		'src/app/App.tsx',
		'src/app/app.jsx',
		'src/app/App.jsx',
	];

	const project = new Project();
	let layoutFile: SourceFile | undefined;

	for (const pattern of layoutPatterns) {
		try {
			const files = project.addSourceFilesAtPaths(`${projectRoot}/${pattern}`);
			if (files.length > 0) {
				layoutFile = files[0];
				break;
			}
		} catch {
			// File doesn't exist or can't be parsed, try next pattern
		}
	}

	if (!layoutFile) {
		return {
			updated: false,
			filePath: null,
			alreadyModified: false,
		};
	}

	const layoutFilePath = layoutFile.getFilePath();
	const sourceDir = getSourceDirectory(layoutFilePath);

	// Check if ConsentManager is already imported
	if (hasConsentManagerImport(layoutFile)) {
		return {
			updated: false,
			filePath: layoutFilePath,
			alreadyModified: true,
		};
	}

	try {
		// Create consent manager component file
		const componentFiles = await createConsentManagerComponent(
			projectRoot,
			sourceDir,
			mode as StorageMode,
			backendURL,
			useEnvFile,
			selectedScripts,
			enableDevTools,
			expandedTheme
		);

		// Add import for ConsentManager with correct relative path
		addConsentManagerImport(layoutFile, componentFiles.consentManager);

		// Update the component JSX
		const updated = updateGenericReactJsx(layoutFile);

		if (updated) {
			await layoutFile.save();
			return {
				updated: true,
				filePath: layoutFilePath,
				alreadyModified: false,
				componentFiles,
			};
		}

		return {
			updated: false,
			filePath: layoutFilePath,
			alreadyModified: false,
		};
	} catch (error) {
		throw new Error(
			`Failed to update generic React layout: ${error instanceof Error ? error.message : String(error)}`
		);
	}
}

export async function updateReactLayout(
	options: UpdateReactLayoutOptions
): Promise<{
	updated: boolean;
	filePath: string | null;
	alreadyModified: boolean;
	componentFiles?: ComponentFilePaths;
}> {
	// Check package type first to determine which implementation to use
	if (options.pkg === '@c15t/nextjs') {
		const nextResult = await updateNextLayout(options);

		if (nextResult.structureType) {
			// Successfully handled by Next.js implementation
			return {
				updated: nextResult.updated,
				filePath: nextResult.filePath,
				alreadyModified: nextResult.alreadyModified,
				componentFiles: nextResult.componentFiles,
			};
		}
	}

	// Use generic React implementation for all other cases
	return updateGenericReactLayout(options);
}
