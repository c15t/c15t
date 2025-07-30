/**
 * Unified Next.js template handler
 * Detects whether the project uses App Directory or Pages Directory
 * and routes to the appropriate implementation
 */

import { Project } from 'ts-morph';
import type { AvailablePackages } from '~/context/framework-detection';
import { updateAppLayout } from './app/layout';
import { updatePagesLayout } from './pages/layout';

interface UpdateNextLayoutOptions {
	projectRoot: string;
	mode: string;
	backendURL?: string;
	useEnvFile?: boolean;
	pkg: AvailablePackages;
	proxyNextjs?: boolean;
}

type NextStructure = 'app' | 'pages' | null;

function detectNextJsStructure(projectRoot: string): NextStructure | null {
	const project = new Project();

	// Check for App Directory structure
	const appLayoutPatterns = [
		'app/layout.tsx',
		'src/app/layout.tsx',
		'app/layout.ts',
		'src/app/layout.ts',
	];

	for (const pattern of appLayoutPatterns) {
		const files = project.addSourceFilesAtPaths(`${projectRoot}/${pattern}`);
		if (files.length > 0) {
			return 'app';
		}
	}

	// Check for Pages Directory structure
	const pagesAppPatterns = [
		'pages/_app.tsx',
		'pages/_app.ts',
		'src/pages/_app.tsx',
		'src/pages/_app.ts',
	];

	for (const pattern of pagesAppPatterns) {
		const files = project.addSourceFilesAtPaths(`${projectRoot}/${pattern}`);
		if (files.length > 0) {
			return 'pages';
		}
	}

	return null;
}

export async function updateNextLayout(
	options: UpdateNextLayoutOptions
): Promise<{
	updated: boolean;
	filePath: string | null;
	alreadyModified: boolean;
	structureType: NextStructure;
}> {
	const structureType = detectNextJsStructure(options.projectRoot);

	if (!structureType) {
		return {
			updated: false,
			filePath: null,
			alreadyModified: false,
			structureType: null,
		};
	}

	let result: {
		updated: boolean;
		filePath: string | null;
		alreadyModified: boolean;
	};

	if (structureType === 'app') {
		result = await updateAppLayout(options);
	} else {
		result = await updatePagesLayout(options);
	}

	return {
		...result,
		structureType,
	};
}
