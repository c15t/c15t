/**
 * Shared directory utilities for layout templates
 * These functions help detect and create component directories
 */

import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Detects or determines the components directory path
 *
 * @param projectRoot - Root directory of the project
 * @param sourceDir - Source directory path (e.g., 'src', 'app', 'src/app', or '')
 * @returns The components directory path relative to project root
 *
 * @remarks
 * Checks for existing components folders in order:
 * 1. src/components (if using src directory)
 * 2. components (root level)
 * Creates src/components or components based on project structure
 *
 * @example
 * ```ts
 * // With src directory
 * await getComponentsDirectory('/project', 'src');
 * // Returns: 'src/components' (if exists) or 'components' (if exists) or 'src/components' (default)
 *
 * // Without src directory
 * await getComponentsDirectory('/project', '');
 * // Returns: 'components' (if exists) or 'src/components' (if exists) or 'components' (default)
 *
 * // With app directory
 * await getComponentsDirectory('/project', 'src/app');
 * // Returns: 'src/components' (if exists) or 'components' (if exists) or 'src/components' (default)
 * ```
 */
export async function getComponentsDirectory(
	projectRoot: string,
	sourceDir: string
): Promise<string> {
	const isSrcDir = sourceDir === 'src' || sourceDir.startsWith('src');

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

/**
 * Determines the framework directory path based on a file's location
 *
 * @param filePath - Full path to a file (can be absolute or relative)
 * @param dirName - The framework directory name to look for (e.g., 'app', 'pages')
 * @returns The framework directory path relative to project root (e.g., 'app', 'src/app', 'pages', 'src/pages')
 *
 * @remarks
 * Checks whether the file is under `src/<dirName>` or just `<dirName>`.
 * Uses path utilities for cross-platform compatibility (handles both Windows and Unix paths).
 *
 * @example
 * ```ts
 * getFrameworkDirectory('/project/src/app/layout.tsx', 'app'); // 'src/app'
 * getFrameworkDirectory('/project/app/layout.tsx', 'app'); // 'app'
 * getFrameworkDirectory('/project/src/pages/_app.tsx', 'pages'); // 'src/pages'
 * getFrameworkDirectory('/project/pages/_app.tsx', 'pages'); // 'pages'
 * ```
 */
export function getFrameworkDirectory(
	filePath: string,
	dirName: string
): string {
	const normalizedPath = path.normalize(filePath);
	const srcSegment = path.join('src', dirName);

	if (normalizedPath.includes(srcSegment)) {
		return path.join('src', dirName);
	}

	return dirName;
}

/**
 * Determines the source directory based on a file path
 *
 * @param filePath - Full path to a file (can be absolute or relative)
 * @returns The source directory path ('src' if in src directory, otherwise '')
 *
 * @remarks
 * Returns 'src' if the file is in src directory, otherwise returns empty string for root level.
 * Uses path utilities for cross-platform compatibility (handles both Windows and Unix paths).
 *
 * @example
 * ```ts
 * getSourceDirectory('/project/src/app/layout.tsx'); // 'src'
 * getSourceDirectory('/project/app/layout.tsx'); // ''
 * ```
 */
export function getSourceDirectory(filePath: string): string {
	// Normalize the path to handle different path separators and formats
	const normalizedPath = path.normalize(filePath);

	// Split the path into segments using the platform-specific separator
	const segments = normalizedPath.split(path.sep);

	// Check if 'src' is one of the path segments
	if (segments.includes('src')) {
		return 'src';
	}

	return '';
}
