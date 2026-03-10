/**
 * Unified Next.js template handler
 * Detects whether the project uses App Directory or Pages Directory
 * and routes to the appropriate implementation
 */

import path from 'node:path';
import type { AvailablePackages } from '~/context/framework-detection';
import { findLayoutFile } from '~/detection/layout';
import type { ExpandedTheme, UIStyle } from '../../prompts';
import { updateAppLayout } from './app/layout';
import { updatePagesLayout } from './pages/layout';

interface UpdateNextLayoutOptions {
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

type NextStructure = 'app' | 'pages' | null;

export async function updateNextLayout(
	options: UpdateNextLayoutOptions
): Promise<{
	updated: boolean;
	filePath: string | null;
	alreadyModified: boolean;
	structureType: NextStructure;
	componentFiles?: {
		consentManager: string;
		consentManagerClient?: string;
		consentManagerDir?: string;
	};
}> {
	const layoutDetection = await findLayoutFile(options.projectRoot);

	if (!layoutDetection) {
		return {
			updated: false,
			filePath: null,
			alreadyModified: false,
			structureType: null,
		};
	}

	const structureType: NextStructure = layoutDetection.type;
	const layoutFilePath = path.join(options.projectRoot, layoutDetection.path);

	let result: {
		updated: boolean;
		filePath: string | null;
		alreadyModified: boolean;
		componentFiles?: {
			consentManager: string;
			consentManagerClient?: string;
			consentManagerDir?: string;
		};
	};

	if (structureType === 'app') {
		result = await updateAppLayout({ ...options, layoutFilePath });
	} else {
		result = await updatePagesLayout({ ...options, layoutFilePath });
	}

	return {
		...result,
		structureType,
	};
}
