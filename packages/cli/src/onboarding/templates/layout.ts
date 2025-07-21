/**
 * Templates module for generating configuration files
 * This module now serves as a wrapper that routes to the appropriate implementation
 * based on the detected project structure (App Directory vs Pages Directory)
 */

import { Project, type SourceFile } from 'ts-morph';
import type { AvailablePackages } from '~/context/framework-detection';
import { updateNextLayout } from './next';

interface UpdateReactLayoutOptions {
	projectRoot: string;
	mode: string;
	backendURL?: string;
	useEnvFile?: boolean;
	pkg: AvailablePackages;
	proxyNextjs?: boolean;
}

/**
 * Fallback function for non-Next.js React projects
 * Handles generic React layout updates for projects that don't use Next.js structure
 *
 * @param options - Configuration options for updating the layout
 * @returns Information about the update operation
 */
function updateGenericReactLayout({
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
		'src/app.tsx',
		'src/App.tsx',
		'src/app/app.tsx',
		'src/app/App.tsx',
	];

	const project = new Project();
	let layoutFile: SourceFile | undefined;

	for (const pattern of layoutPatterns) {
		const files = project.addSourceFilesAtPaths(`${projectRoot}/${pattern}`);
		if (files.length > 0) {
			layoutFile = files[0];
			break;
		}
	}

	if (!layoutFile) {
		return Promise.resolve({
			updated: false,
			filePath: null,
			alreadyModified: false,
		});
	}

	// For generic React projects, use @c15t/react package instead
	const reactPkg = pkg === '@c15t/nextjs' ? '@c15t/react' : pkg;

	// Implementation similar to app directory but with @c15t/react
	// This is a simplified version for non-Next.js projects
	return Promise.resolve({
		updated: false,
		filePath: layoutFile.getFilePath(),
		alreadyModified: false,
	});
}

/**
 * Updates or creates a React layout file with ConsentManagerProvider
 * Automatically detects and handles Next.js App Directory, Pages Directory, or generic React projects
 *
 * @param options - Configuration options for updating the layout
 * @returns Information about the update operation
 *
 * @example
 * ```ts
 * // For Next.js projects (App or Pages Directory)
 * const result = await updateReactLayout({
 *   projectRoot: '/path/to/nextjs-project',
 *   mode: 'c15t',
 *   pkg: '@c15t/nextjs',
 *   backendURL: 'https://api.example.com'
 * });
 *
 * // For generic React projects (Vite, CRA, etc.)
 * const result = await updateReactLayout({
 *   projectRoot: '/path/to/react-project',
 *   mode: 'offline',
 *   pkg: '@c15t/react'
 * });
 * ```
 */
export async function updateReactLayout(
	options: UpdateReactLayoutOptions
): Promise<{
	updated: boolean;
	filePath: string | null;
	alreadyModified: boolean;
}> {
	// First try Next.js specific implementation
	const nextResult = await updateNextLayout(options);

	if (nextResult.structureType) {
		// Successfully handled by Next.js implementation
		return {
			updated: nextResult.updated,
			filePath: nextResult.filePath,
			alreadyModified: nextResult.alreadyModified,
		};
	}

	// Fallback to generic React implementation
	return updateGenericReactLayout(options);
}
