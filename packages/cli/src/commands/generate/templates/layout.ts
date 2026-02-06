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
import { generateConsentManagerTemplate } from './react/components';

/**
 * Detects or determines the components directory path
 *
 * @param projectRoot - Root directory of the project
 * @param sourceDir - Source directory path (either 'src' or '')
 * @returns The components directory path relative to project root
 *
 * @remarks
 * Checks for existing components folders in order:
 * 1. src/components (if using src directory)
 * 2. components (root level)
 * Creates src/components or components based on project structure
 */
async function getComponentsDirectory(
	projectRoot: string,
	sourceDir: string
): Promise<string> {
	const isSrcDir = sourceDir === 'src';

	// Check existing locations in order of preference
	const candidates = isSrcDir
		? ['src/components', 'components']
		: ['components', 'src/components'];

	for (const candidate of candidates) {
		try {
			const candidatePath = path.join(projectRoot, candidate);
			const stat = await fs.stat(candidatePath);
			if (stat.isDirectory()) {
				return candidate;
			}
		} catch {
			// Directory doesn't exist, continue checking
		}
	}

	// No existing components folder, create one based on structure
	return isSrcDir ? 'src/components' : 'components';
}

interface UpdateReactLayoutOptions {
	projectRoot: string;
	mode: string;
	backendURL?: string;
	useEnvFile?: boolean;
	pkg: AvailablePackages;
	proxyNextjs?: boolean;
	enableSSR?: boolean;
	uiStyle?: UIStyle;
	expandedTheme?: ExpandedTheme;
}

interface ComponentFilePaths {
	consentManager: string;
	consentManagerDir?: string;
}

/**
 * Computes a relative module specifier from one file to another
 *
 * @param fromFilePath - The file that will contain the import (e.g., layout file)
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

	// Strip /index suffix for cleaner imports (bundlers resolve index files automatically)
	relativePath = relativePath.replace(/\/index$/, '');

	// Ensure the path starts with './' or '../'
	if (!relativePath.startsWith('.')) {
		relativePath = `./${relativePath}`;
	}

	return relativePath;
}

/**
 * Adds the ConsentManager import to the layout file
 *
 * @param layoutFile - The source file to update
 * @param consentManagerFilePath - The absolute path to the consent-manager file
 *
 * @remarks
 * Computes the correct relative import path from the layout file to the consent-manager file,
 * handling nested directory structures correctly.
 */
function addConsentManagerImport(
	layoutFile: SourceFile,
	consentManagerFilePath: string
): void {
	const layoutFilePath = layoutFile.getFilePath();

	// Compute the correct relative module specifier
	const moduleSpecifier = computeRelativeModuleSpecifier(
		layoutFilePath,
		consentManagerFilePath
	);

	// Check if import already exists (check for the computed path or common variations)
	const existingImports = layoutFile.getImportDeclarations();
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
		layoutFile.addImportDeclaration({
			namedImports: ['ConsentManager'],
			moduleSpecifier,
		});
	}
}

/**
 * Determines the source directory based on the layout file location
 *
 * @param layoutFilePath - Full path to the layout file (can be absolute or relative)
 * @returns The source directory path relative to project root
 *
 * @remarks
 * Returns 'src' if the file is in src directory, otherwise returns empty string for root level.
 * Uses path utilities for cross-platform compatibility (handles both Windows and Unix paths).
 */
function getSourceDirectory(layoutFilePath: string): string {
	// Normalize the path to handle different path separators and formats
	const normalizedPath = path.normalize(layoutFilePath);

	// Split the path into segments using the platform-specific separator
	const segments = normalizedPath.split(path.sep);

	// Check if 'src' is one of the path segments
	if (segments.includes('src')) {
		return 'src';
	}

	return '';
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

	const originalJsx = expression.getText();

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
 * @param backendURL - Backend URL for c15t/self-hosted modes
 * @param useEnvFile - Whether to use environment variables
 * @returns Object containing path to created file
 *
 * @throws {Error} When file cannot be created
 *
 * @remarks
 * Creates in components/consent-manager/:
 * - index.tsx - Component with provider, UI, scripts, and callbacks
 */
async function createConsentManagerComponent(
	projectRoot: string,
	sourceDir: string,
	mode: StorageMode,
	backendURL?: string,
	useEnvFile?: boolean
): Promise<ComponentFilePaths> {
	// Detect or create components directory
	const componentsDir = await getComponentsDirectory(projectRoot, sourceDir);
	const consentManagerDirPath = path.join(
		projectRoot,
		componentsDir,
		'consent-manager'
	);

	// Generate component file content
	const consentManagerContent = generateConsentManagerTemplate(
		mode,
		backendURL,
		useEnvFile
	);

	// Define file path - main component is index.tsx
	const indexPath = path.join(consentManagerDirPath, 'index.tsx');

	// Create directory and write file
	await fs.mkdir(consentManagerDirPath, { recursive: true });
	await fs.writeFile(indexPath, consentManagerContent, 'utf-8');

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
	const existingImports = layoutFile.getImportDeclarations();
	const hasConsentManagerImport = existingImports.some((importDecl) => {
		const spec = importDecl.getModuleSpecifierValue();
		return (
			spec === './consent-manager' ||
			spec === './consent-manager.tsx' ||
			spec.endsWith('/consent-manager') ||
			spec.endsWith('/consent-manager/index')
		);
	});

	if (hasConsentManagerImport) {
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
			useEnvFile
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
