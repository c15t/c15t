/**
 * App Directory layout template generator
 * Handles updating Next.js App Directory layout files with ConsentManagerProvider
 * and creates separate consent-manager component files
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { Project, type SourceFile, SyntaxKind } from 'ts-morph';
import type { AvailablePackages } from '~/context/framework-detection';
import { generateOptionsText } from '../../shared/options';
import {
	generateConsentManagerClientTemplate,
	generateConsentManagerTemplate,
} from './components';

const HTML_TAG_REGEX = /<html[^>]*>([\s\S]*)<\/html>/;
const BODY_TAG_REGEX = /<body[^>]*>([\s\S]*)<\/body>/;
const BODY_OPENING_TAG_REGEX = /<body[^>]*>/;
const HTML_CONTENT_REGEX = /([\s\S]*<\/html>)/;

interface UpdateAppLayoutOptions {
	projectRoot: string;
	mode: string;
	backendURL?: string;
	useEnvFile?: boolean;
	pkg: AvailablePackages;
	proxyNextjs?: boolean;
}

interface ComponentFilePaths {
	consentManager: string;
	consentManagerClient: string;
}

/**
 * Finds the App Directory layout file in the project
 *
 * @param project - ts-morph Project instance
 * @param projectRoot - Root directory of the project
 * @returns The layout source file if found, undefined otherwise
 *
 * @remarks
 * Searches for layout files in the following order:
 * - app/layout.tsx
 * - src/app/layout.tsx
 * - app/layout.ts
 * - src/app/layout.ts
 */
function findAppLayoutFile(
	project: Project,
	projectRoot: string
): SourceFile | undefined {
	const layoutPatterns = [
		'app/layout.tsx',
		'src/app/layout.tsx',
		'app/layout.ts',
		'src/app/layout.ts',
	];

	for (const pattern of layoutPatterns) {
		const files = project.addSourceFilesAtPaths(`${projectRoot}/${pattern}`);
		if (files.length > 0) {
			return files[0];
		}
	}
}

/**
 * Determines the app directory path based on the layout file location
 *
 * @param layoutFilePath - Full path to the layout file
 * @returns The app directory path relative to project root
 *
 * @remarks
 * Returns either 'app' or 'src/app' depending on where the layout file is located
 */
function getAppDirectory(layoutFilePath: string): string {
	if (layoutFilePath.includes('src/app')) {
		return 'src/app';
	}
	return 'app';
}

/**
 * Adds the ConsentManager import to the layout file
 *
 * @param layoutFile - The layout source file to update
 *
 * @remarks
 * Adds: import { ConsentManager } from './consent-manager';
 */
function addConsentManagerImport(layoutFile: SourceFile): void {
	// Check if import already exists
	const existingImports = layoutFile.getImportDeclarations();
	const hasConsentManagerImport = existingImports.some(
		(importDecl) =>
			importDecl.getModuleSpecifierValue() === './consent-manager' ||
			importDecl.getModuleSpecifierValue() === './consent-manager.tsx'
	);

	if (!hasConsentManagerImport) {
		layoutFile.addImportDeclaration({
			namedImports: ['ConsentManager'],
			moduleSpecifier: './consent-manager',
		});
	}
}

/**
 * Wraps the JSX content with ConsentManager component
 *
 * @param originalJsx - The original JSX string to wrap
 * @returns The JSX wrapped with ConsentManager component
 *
 * @remarks
 * This function wraps content with <ConsentManager> instead of inline provider components.
 * It handles different JSX structures:
 * - Full HTML with html and body tags
 * - Only body tag
 * - Plain JSX without html/body tags
 */
function wrapAppJsxContent(originalJsx: string): string {
	const hasHtmlTag =
		originalJsx.includes('<html') || originalJsx.includes('</html>');
	const hasBodyTag =
		originalJsx.includes('<body') || originalJsx.includes('</body>');

	const consentWrapper = (content: string) => `
		<ConsentManager>
			${content}
		</ConsentManager>
	`;

	if (hasHtmlTag) {
		const htmlMatch = originalJsx.match(HTML_TAG_REGEX);
		const htmlContent = htmlMatch?.[1] || '';
		if (!htmlContent) {
			return consentWrapper(originalJsx);
		}

		const bodyMatch = htmlContent.match(BODY_TAG_REGEX);
		if (!bodyMatch) {
			return originalJsx.replace(
				HTML_CONTENT_REGEX,
				`<html>${consentWrapper('$1')}</html>`
			);
		}

		const bodyContent = bodyMatch[1] || '';
		const bodyOpeningTag =
			originalJsx.match(BODY_OPENING_TAG_REGEX)?.[0] || '<body>';

		return originalJsx.replace(
			BODY_TAG_REGEX,
			`${bodyOpeningTag}${consentWrapper(bodyContent)}</body>`
		);
	}

	if (hasBodyTag) {
		const bodyMatch = originalJsx.match(BODY_TAG_REGEX);
		const bodyContent = bodyMatch?.[1] || '';
		if (!bodyContent) {
			return consentWrapper(originalJsx);
		}

		const bodyOpeningTag =
			originalJsx.match(BODY_OPENING_TAG_REGEX)?.[0] || '<body>';
		return originalJsx.replace(
			BODY_TAG_REGEX,
			`${bodyOpeningTag}${consentWrapper(bodyContent)}</body>`
		);
	}

	return consentWrapper(originalJsx);
}

/**
 * Creates the consent-manager component files in the app directory
 *
 * @param projectRoot - Root directory of the project
 * @param appDir - App directory path (either 'app' or 'src/app')
 * @param optionsText - Stringified options object for ConsentManagerProvider
 * @returns Object containing paths to created files
 *
 * @throws {Error} When files cannot be created
 *
 * @remarks
 * Creates two files:
 * - consent-manager.tsx - Server component with provider and UI
 * - consent-manager.client.tsx - Client component for scripts and callbacks
 */
async function createConsentManagerComponents(
	projectRoot: string,
	appDir: string,
	optionsText: string
): Promise<ComponentFilePaths> {
	const appDirPath = path.join(projectRoot, appDir);

	// Generate component file contents
	const consentManagerContent = generateConsentManagerTemplate(optionsText);
	const consentManagerClientContent = generateConsentManagerClientTemplate();

	// Define file paths
	const consentManagerPath = path.join(appDirPath, 'consent-manager.tsx');
	const consentManagerClientPath = path.join(
		appDirPath,
		'consent-manager.client.tsx'
	);

	// Write files
	await Promise.all([
		fs.writeFile(consentManagerPath, consentManagerContent, 'utf-8'),
		fs.writeFile(
			consentManagerClientPath,
			consentManagerClientContent,
			'utf-8'
		),
	]);

	return {
		consentManager: consentManagerPath,
		consentManagerClient: consentManagerClientPath,
	};
}

/**
 * Updates Next.js App Directory layout with consent management components
 *
 * @param options - Configuration options for the update
 * @returns Information about the update operation including file paths
 *
 * @throws {Error} When component files cannot be created or layout cannot be updated
 *
 * @remarks
 * This function performs the following steps:
 * 1. Locates the App Directory layout file
 * 2. Checks if consent management is already configured
 * 3. Creates consent-manager.tsx and consent-manager.client.tsx files
 * 4. Adds ConsentManager import to layout
 * 5. Wraps layout content with ConsentManager component
 */
export async function updateAppLayout({
	projectRoot,
	mode,
	backendURL,
	useEnvFile,
	proxyNextjs,
}: UpdateAppLayoutOptions): Promise<{
	updated: boolean;
	filePath: string | null;
	alreadyModified: boolean;
	componentFiles?: ComponentFilePaths;
}> {
	const project = new Project();
	const layoutFile = findAppLayoutFile(project, projectRoot);

	if (!layoutFile) {
		return { updated: false, filePath: null, alreadyModified: false };
	}

	const layoutFilePath = layoutFile.getFilePath();
	const appDir = getAppDirectory(layoutFilePath);

	// Check if ConsentManager is already imported
	const existingImports = layoutFile.getImportDeclarations();
	const hasConsentManagerImport = existingImports.some(
		(importDecl) =>
			importDecl.getModuleSpecifierValue() === './consent-manager' ||
			importDecl.getModuleSpecifierValue() === './consent-manager.tsx'
	);

	if (hasConsentManagerImport) {
		return {
			updated: false,
			filePath: layoutFilePath,
			alreadyModified: true,
		};
	}

	// Generate options text for the component
	const optionsText = generateOptionsText(
		mode,
		backendURL,
		useEnvFile,
		proxyNextjs
	);

	// Create consent manager component files
	const componentFiles = await createConsentManagerComponents(
		projectRoot,
		appDir,
		optionsText
	);

	// Add import for ConsentManager
	addConsentManagerImport(layoutFile);

	// Update the layout JSX
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
	const newJsx = wrapAppJsxContent(originalJsx);
	returnStatement.replaceWithText(`return ${newJsx}`);

	await layoutFile.save();
	return {
		updated: true,
		filePath: layoutFilePath,
		alreadyModified: false,
		componentFiles,
	};
}
