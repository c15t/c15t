/**
 * Shared module specifier utilities for layout templates
 * These functions help compute relative import paths and add imports to source files
 */

import path from 'node:path';
import type { SourceFile } from 'ts-morph';

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
 *
 * @example
 * ```ts
 * // Same directory
 * computeRelativeModuleSpecifier('/app/layout.tsx', '/app/consent-manager.tsx');
 * // Returns: './consent-manager'
 *
 * // Parent directory
 * computeRelativeModuleSpecifier('/app/layout.tsx', '/components/consent-manager.tsx');
 * // Returns: '../components/consent-manager'
 *
 * // Index file (stripped automatically)
 * computeRelativeModuleSpecifier('/app/layout.tsx', '/components/consent-manager/index.tsx');
 * // Returns: '../components/consent-manager'
 * ```
 */
export function computeRelativeModuleSpecifier(
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
 * Checks if a ConsentManager import already exists in a source file
 *
 * @param sourceFile - The source file to check
 * @param moduleSpecifier - Optional specific module specifier to check against
 * @returns True if a consent-manager import is found
 *
 * @remarks
 * Checks for common consent-manager import patterns:
 * - Exact match on `./consent-manager` or `./consent-manager.tsx`
 * - Any import ending with `/consent-manager` or `/consent-manager/index`
 * - Optionally, an exact match on a computed module specifier
 */
export function hasConsentManagerImport(
	sourceFile: SourceFile,
	moduleSpecifier?: string
): boolean {
	const existingImports = sourceFile.getImportDeclarations();
	return existingImports.some((importDecl) => {
		const spec = importDecl.getModuleSpecifierValue();
		return (
			spec === './consent-manager' ||
			spec === './consent-manager.tsx' ||
			spec.endsWith('/consent-manager') ||
			spec.endsWith('/consent-manager/index') ||
			(moduleSpecifier !== undefined && spec === moduleSpecifier)
		);
	});
}

/**
 * Adds the ConsentManager import to a source file
 *
 * @param sourceFile - The source file to update (layout or _app file)
 * @param consentManagerFilePath - The absolute path to the consent-manager file
 *
 * @remarks
 * Computes the correct relative import path from the source file to the consent-manager file,
 * handling nested directory structures correctly. Skips adding the import if it already exists.
 *
 * @example
 * ```ts
 * const project = new Project();
 * const layoutFile = project.addSourceFileAtPath('/app/layout.tsx');
 * addConsentManagerImport(layoutFile, '/components/consent-manager/index.tsx');
 * // Adds: import { ConsentManager } from '../components/consent-manager';
 * ```
 */
export function addConsentManagerImport(
	sourceFile: SourceFile,
	consentManagerFilePath: string
): void {
	const sourceFilePath = sourceFile.getFilePath();

	// Compute the correct relative module specifier
	const moduleSpecifier = computeRelativeModuleSpecifier(
		sourceFilePath,
		consentManagerFilePath
	);

	// Check if import already exists
	if (!hasConsentManagerImport(sourceFile, moduleSpecifier)) {
		sourceFile.addImportDeclaration({
			namedImports: ['ConsentManager'],
			moduleSpecifier,
		});
	}
}
