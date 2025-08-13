/**
 * Templates module for generating configuration files
 * This module now serves as a wrapper that routes to the appropriate implementation
 * based on the detected project structure (App Directory vs Pages Directory)
 */

import {
	Project,
	type ReturnStatement,
	type SourceFile,
	SyntaxKind,
} from 'ts-morph';
import type { AvailablePackages } from '~/context/framework-detection';
import { updateNextLayout } from './next';
import {
	generateOptionsText,
	getBaseImports,
	getCustomModeImports,
} from './shared/options';

interface UpdateReactLayoutOptions {
	projectRoot: string;
	mode: string;
	backendURL?: string;
	useEnvFile?: boolean;
	pkg: AvailablePackages;
	proxyNextjs?: boolean;
}

/**
 * Updates imports for generic React projects
 * Adds ConsentManagerProvider and related imports to the layout file
 *
 * @param layoutFile - The source file to update
 * @param packageName - The package name to import from
 * @param mode - The storage mode being used
 *
 * @throws {Error} When imports cannot be added to the file
 */
function updateGenericReactImports(
	layoutFile: SourceFile,
	packageName: string,
	mode: string
): void {
	const requiredImports = ['ConsentManagerProvider', ...getBaseImports()];
	let hasPackageImport = false;

	// Check existing imports and update if needed
	for (const importDecl of layoutFile.getImportDeclarations()) {
		if (importDecl.getModuleSpecifierValue() === packageName) {
			hasPackageImport = true;
			const namedImports = importDecl.getNamedImports().map((i) => i.getName());
			const missingImports = requiredImports.filter(
				(imp) => !namedImports.includes(imp)
			);
			if (missingImports.length > 0) {
				importDecl.addNamedImports(missingImports);
			}
			break;
		}
	}

	// Add new import if none exists
	if (!hasPackageImport) {
		layoutFile.addImportDeclaration({
			namedImports: requiredImports,
			moduleSpecifier: packageName,
		});
	}

	// Add custom mode imports if needed
	if (mode === 'custom') {
		for (const customImport of getCustomModeImports()) {
			layoutFile.addImportDeclaration(customImport);
		}
	}
}

/**
 * Updates JSX content for generic React projects
 * Wraps the main component's return JSX with ConsentManagerProvider
 *
 * @param layoutFile - The source file to update
 * @param mode - The storage mode being used
 * @param backendURL - Optional backend URL for c15t mode
 * @param useEnvFile - Whether to use environment variables
 * @param proxyNextjs - Whether to use Next.js proxy (not applicable for generic React)
 * @returns True if JSX was successfully updated, false otherwise
 *
 * @throws {Error} When JSX cannot be parsed or updated
 */
function updateGenericReactJsx(
	layoutFile: SourceFile,
	mode: string,
	backendURL?: string,
	useEnvFile?: boolean,
	proxyNextjs?: boolean
): boolean {
	// Find the main function component (could be function declaration or arrow function)
	const functionDeclarations = layoutFile.getFunctions();
	const variableDeclarations = layoutFile.getVariableDeclarations();

	// Look for return statements in function declarations
	for (const func of functionDeclarations) {
		const returnStatement = func.getDescendantsOfKind(
			SyntaxKind.ReturnStatement
		)[0];
		if (returnStatement) {
			return wrapReturnStatement(
				returnStatement,
				mode,
				backendURL,
				useEnvFile,
				proxyNextjs
			);
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
				return wrapReturnStatement(
					returnStatement,
					mode,
					backendURL,
					useEnvFile,
					proxyNextjs
				);
			}
		}
	}

	return false;
}

/**
 * Wraps a return statement's JSX with ConsentManagerProvider
 *
 * @param returnStatement - The return statement to wrap
 * @param mode - The storage mode being used
 * @param backendURL - Optional backend URL for c15t mode
 * @param useEnvFile - Whether to use environment variables
 * @param proxyNextjs - Whether to use Next.js proxy
 * @returns True if successfully wrapped, false otherwise
 */
function wrapReturnStatement(
	returnStatement: ReturnStatement,
	mode: string,
	backendURL?: string,
	useEnvFile?: boolean,
	proxyNextjs?: boolean
): boolean {
	const expression = returnStatement.getExpression();
	if (!expression) {
		return false;
	}

	const originalJsx = expression.getText();
	const optionsText = generateOptionsText(
		mode,
		backendURL,
		useEnvFile,
		proxyNextjs
	);

	// Wrap the JSX with ConsentManagerProvider
	const newJsx = `(
		<ConsentManagerProvider options={${optionsText}}>
			<CookieBanner />
			<ConsentManagerDialog />
			${originalJsx}
		</ConsentManagerProvider>
	)`;

	returnStatement.replaceWithText(`return ${newJsx}`);
	return true;
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
	pkg,
	backendURL,
	useEnvFile,
	proxyNextjs,
}: UpdateReactLayoutOptions): Promise<{
	updated: boolean;
	filePath: string | null;
	alreadyModified: boolean;
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

	// Check if file already has imports from our package
	const existingImports = layoutFile.getImportDeclarations();
	const hasPackageImport = existingImports.some(
		(importDecl) => importDecl.getModuleSpecifierValue() === pkg
	);

	if (hasPackageImport) {
		return {
			updated: false,
			filePath: layoutFile.getFilePath(),
			alreadyModified: true,
		};
	}

	try {
		// Add required imports
		updateGenericReactImports(layoutFile, pkg, mode);

		// Update the component JSX
		const updated = updateGenericReactJsx(
			layoutFile,
			mode,
			backendURL,
			useEnvFile,
			proxyNextjs
		);

		if (updated) {
			await layoutFile.save();
			return {
				updated: true,
				filePath: layoutFile.getFilePath(),
				alreadyModified: false,
			};
		}

		return {
			updated: false,
			filePath: layoutFile.getFilePath(),
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
			};
		}
	}

	// Use generic React implementation for all other cases
	return updateGenericReactLayout(options);
}
