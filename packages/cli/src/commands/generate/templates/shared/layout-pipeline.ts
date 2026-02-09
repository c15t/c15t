/**
 * Shared layout update pipeline for Next.js templates
 * Extracts the common steps of finding a layout file, checking for existing imports,
 * creating component files, adding imports, wrapping JSX, and saving.
 */

import { Project, type SourceFile, SyntaxKind } from 'ts-morph';
import { getFrameworkDirectory } from './directory';
import {
	addConsentManagerImport,
	hasConsentManagerImport,
} from './module-specifier';

interface ComponentFilePaths {
	consentManager: string;
	consentManagerClient?: string;
	consentManagerDir?: string;
}

export interface LayoutUpdateResult {
	updated: boolean;
	filePath: string | null;
	alreadyModified: boolean;
	componentFiles?: ComponentFilePaths;
}

export interface LayoutPipelineConfig {
	/** Glob patterns to search for the layout file (e.g., ['app/layout.tsx', 'src/app/layout.tsx']) */
	filePatterns: string[];
	/** Root directory of the project */
	projectRoot: string;
	/** Framework directory name for getFrameworkDirectory (e.g., 'app' or 'pages') */
	frameworkDirName: string;
	/** Creates the consent-manager component files. Receives the layout file path and framework directory. */
	createComponents: (
		layoutFilePath: string,
		frameworkDir: string
	) => Promise<ComponentFilePaths>;
	/** Wraps the original JSX string with consent management components */
	wrapJsx: (originalJsx: string) => string;
	/** Optional hook called after the import is added, before JSX wrapping (e.g., for adding types or comments) */
	afterImport?: (sourceFile: SourceFile) => void;
}

/**
 * Runs the shared layout update pipeline for Next.js templates
 *
 * Steps:
 * 1. Create a ts-morph Project and find the layout file by patterns
 * 2. Determine the framework directory (e.g., 'app' or 'src/app')
 * 3. Check if ConsentManager import already exists → return early if so
 * 4. Call createComponents to generate component files
 * 5. Add ConsentManager import to the layout file
 * 6. Call afterImport hook (if provided)
 * 7. Find the first return statement, wrap its JSX with wrapJsx
 * 8. Save the file
 */
export async function runLayoutUpdatePipeline(
	config: LayoutPipelineConfig
): Promise<LayoutUpdateResult> {
	const {
		filePatterns,
		projectRoot,
		frameworkDirName,
		createComponents,
		wrapJsx,
		afterImport,
	} = config;

	// Step 1: Create project and find layout file
	const project = new Project();
	let layoutFile: SourceFile | undefined;

	for (const pattern of filePatterns) {
		const files = project.addSourceFilesAtPaths(`${projectRoot}/${pattern}`);
		if (files.length > 0) {
			layoutFile = files[0];
			break;
		}
	}

	if (!layoutFile) {
		return { updated: false, filePath: null, alreadyModified: false };
	}

	const layoutFilePath = layoutFile.getFilePath();

	// Step 2: Determine framework directory
	const frameworkDir = getFrameworkDirectory(layoutFilePath, frameworkDirName);

	// Step 3: Check for existing import
	if (hasConsentManagerImport(layoutFile)) {
		return {
			updated: false,
			filePath: layoutFilePath,
			alreadyModified: true,
		};
	}

	// Step 4: Create component files
	const componentFiles = await createComponents(layoutFilePath, frameworkDir);

	// Step 5: Add import
	addConsentManagerImport(layoutFile, componentFiles.consentManager);

	// Step 6: After-import hook
	if (afterImport) {
		afterImport(layoutFile);
	}

	// Step 7: Find return statement and wrap JSX
	const returnStatement = layoutFile.getDescendantsOfKind(
		SyntaxKind.ReturnStatement
	)[0];
	if (!returnStatement) {
		return {
			updated: false,
			filePath: layoutFilePath,
			alreadyModified: false,
		};
	}

	const expression = returnStatement.getExpression();
	if (!expression) {
		return {
			updated: false,
			filePath: layoutFilePath,
			alreadyModified: false,
		};
	}

	const originalJsx = expression.getText();
	const newJsx = wrapJsx(originalJsx);
	returnStatement.replaceWithText(`return ${newJsx}`);

	// Step 8: Save
	await layoutFile.save();
	return {
		updated: true,
		filePath: layoutFilePath,
		alreadyModified: false,
		componentFiles,
	};
}
