/* oxlint-disable func-style, no-use-before-define -- Function hoisting keeps the JSX traversal before its wrapping helper. */
/**
 * Templates module for generating configuration files
 * This module now serves as a wrapper that routes to the appropriate implementation
 * based on the detected project structure (App Directory vs Pages Directory)
 */

import { Project } from 'ts-morph';
import type { SourceFile } from 'ts-morph';

import type {
	AvailablePackages,
	DevelopmentEnvironment,
} from '~/context/framework-detection';

import type { StorageMode } from '../../../constants';
import type { ExpandedTheme, UIStyle } from '../prompts';
import { updateNextLayout } from './next';
import { createConsentManagerComponent } from './shared/create-component-files';
import { getSourceDirectory } from './shared/directory';
import { writeFile } from './shared/file-plan';
import { getLayoutExpressions } from './shared/layout-target';
import {
	addConsentManagerImport,
	hasConsentManagerImport,
} from './shared/module-specifier';

interface UpdateReactLayoutOptions {
	developmentEnvironment?: DevelopmentEnvironment;
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
	for (const expression of getLayoutExpressions(layoutFile).reverse()) {
		expression.replaceWithText(
			`(<ConsentManager>{${expression.getText()}}</ConsentManager>)`
		);
	}
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
 * - provider.tsx - Client provider with ConsentProvider, Banner, and Dialog
 * - theme.ts - (optional) Generated when user selects a custom theme
 */
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
	developmentEnvironment,
	uiStyle,
	projectRoot,
	mode,
	backendURL,
	useEnvFile,
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
				[layoutFile] = files;
				break;
			}
		} catch {
			// File doesn't exist or can't be parsed, try next pattern
		}
	}

	if (!layoutFile) {
		return {
			alreadyModified: false,
			filePath: null,
			updated: false,
		};
	}

	const layoutFilePath = layoutFile.getFilePath();
	const sourceDir = getSourceDirectory(layoutFilePath);

	// Check if ConsentManager is already imported
	if (hasConsentManagerImport(layoutFile)) {
		return {
			alreadyModified: true,
			filePath: layoutFilePath,
			updated: false,
		};
	}

	try {
		getLayoutExpressions(layoutFile);
		// Create consent manager component file
		const componentFiles = await createConsentManagerComponent(
			projectRoot,
			sourceDir,
			mode as StorageMode,
			backendURL,
			useEnvFile,
			selectedScripts,
			enableDevTools,
			expandedTheme,
			developmentEnvironment,
			uiStyle
		);

		// Add import for ConsentManager with correct relative path
		addConsentManagerImport(layoutFile, componentFiles.consentManager);

		// Update the component JSX
		const updated = updateGenericReactJsx(layoutFile);

		if (updated) {
			await writeFile(layoutFilePath, layoutFile.getFullText(), 'utf-8');
			return {
				alreadyModified: false,
				componentFiles,
				filePath: layoutFilePath,
				updated: true,
			};
		}

		return {
			alreadyModified: false,
			filePath: layoutFilePath,
			updated: false,
		};
	} catch (error) {
		throw new Error(
			`Failed to update generic React layout: ${error instanceof Error ? error.message : String(error)}`,
			{ cause: error }
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
	if (options.pkg === 'c15t/next') {
		const nextResult = await updateNextLayout(options);

		if (nextResult.structureType) {
			// Successfully handled by Next.js implementation
			return {
				alreadyModified: nextResult.alreadyModified,
				componentFiles: nextResult.componentFiles,
				filePath: nextResult.filePath,
				updated: nextResult.updated,
			};
		}
	}

	// Use generic React implementation for all other cases
	return updateGenericReactLayout(options);
}
