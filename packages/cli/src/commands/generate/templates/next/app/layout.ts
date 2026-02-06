/**
 * App Directory layout template generator
 * Handles updating Next.js App Directory layout files with ConsentManagerProvider
 * and creates separate consent-manager component files
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { Project, type SourceFile, SyntaxKind } from 'ts-morph';
import type { AvailablePackages } from '~/context/framework-detection';
import type { ExpandedTheme, UIStyle } from '../../../prompts';
import { generateOptionsText, getBackendURLValue } from '../../shared/options';
import {
	generateConsentManagerClientTemplate,
	generateConsentManagerTemplate,
} from './components';
import {
	generateExpandedCookieBannerTemplate,
	generateExpandedPreferenceCenterTemplate,
	generateExpandedProviderTemplate,
	generateExpandedServerComponent,
	generateExpandedThemeTemplate,
} from './expanded-files';

const HTML_TAG_REGEX = /<html[^>]*>([\s\S]*)<\/html>/;
const BODY_TAG_REGEX = /<body[^>]*>([\s\S]*)<\/body>/;
const BODY_OPENING_TAG_REGEX = /<body[^>]*>/;
const HTML_CONTENT_REGEX = /([\s\S]*<\/html>)/;

/**
 * Detects or determines the components directory path
 *
 * @param projectRoot - Root directory of the project
 * @param appDir - App directory path (either 'app' or 'src/app')
 * @returns The components directory path relative to project root
 *
 * @remarks
 * Checks for existing components folders in order:
 * 1. src/components (if using src/app)
 * 2. components (root level)
 * 3. app/components (inside app dir)
 * Creates src/components or components based on project structure
 */
async function getComponentsDirectory(
	projectRoot: string,
	appDir: string
): Promise<string> {
	const isSrcApp = appDir.startsWith('src');

	// Check existing locations in order of preference
	const candidates = isSrcApp
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
	return isSrcApp ? 'src/components' : 'components';
}

interface UpdateAppLayoutOptions {
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
	consentManagerClient?: string;
	consentManagerDir?: string;
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
 * @param layoutFilePath - Full path to the layout file (can be absolute or relative)
 * @returns The app directory path relative to project root
 *
 * @remarks
 * Returns either 'app' or 'src/app' depending on where the layout file is located.
 * Uses path utilities for cross-platform compatibility (handles both Windows and Unix paths).
 */
function getAppDirectory(layoutFilePath: string): string {
	// Normalize the path to handle different path separators and formats
	const normalizedPath = path.normalize(layoutFilePath);

	// Create platform-specific path segment to check for
	const srcAppSegment = path.join('src', 'app');

	// Check if the normalized path contains the 'src/app' (or 'src\app' on Windows) segment
	if (normalizedPath.includes(srcAppSegment)) {
		return path.join('src', 'app');
	}

	return 'app';
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
 * @param layoutFile - The layout source file to update
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
 * Creates the expanded consent-manager component files in a directory structure
 *
 * @param projectRoot - Root directory of the project
 * @param appDir - App directory path (either 'app' or 'src/app')
 * @param options - Configuration options for template generation
 * @returns Object containing paths to created files
 *
 * @throws {Error} When files or directories cannot be created
 *
 * @remarks
 * Creates in components/consent-manager/:
 * - index.tsx - Main server component entry point
 * - provider.tsx - Client provider wrapper
 * - cookie-banner.tsx - Compound component banner
 * - preference-center.tsx - Compound component dialog
 * - theme.ts - Theme preset configuration
 */
async function createExpandedConsentManagerComponents(
	projectRoot: string,
	appDir: string,
	options: {
		mode: string;
		backendURL?: string;
		useEnvFile?: boolean;
		proxyNextjs?: boolean;
		enableSSR: boolean;
		expandedTheme: ExpandedTheme;
	}
): Promise<ComponentFilePaths> {
	const {
		mode,
		backendURL,
		useEnvFile,
		proxyNextjs,
		enableSSR,
		expandedTheme,
	} = options;

	// Detect or create components directory
	const componentsDir = await getComponentsDirectory(projectRoot, appDir);
	const consentManagerDirPath = path.join(
		projectRoot,
		componentsDir,
		'consent-manager'
	);

	// Get the backend URL value for fetchInitialData
	const backendURLValue = getBackendURLValue(
		backendURL,
		useEnvFile,
		proxyNextjs
	);

	// Generate options text for the provider component
	const optionsText = generateOptionsText(
		mode,
		backendURL,
		useEnvFile,
		proxyNextjs
	);

	// Generate all component file contents
	const serverComponentContent = generateExpandedServerComponent({
		enableSSR,
		backendURLValue,
	});
	const providerContent = generateExpandedProviderTemplate({
		enableSSR,
		optionsText,
	});
	const cookieBannerContent = generateExpandedCookieBannerTemplate();
	const preferenceCenterContent = generateExpandedPreferenceCenterTemplate();
	const themeContent = generateExpandedThemeTemplate(expandedTheme);

	// Define file paths - everything in components/consent-manager/
	const indexPath = path.join(consentManagerDirPath, 'index.tsx');
	const providerPath = path.join(consentManagerDirPath, 'provider.tsx');
	const cookieBannerPath = path.join(
		consentManagerDirPath,
		'cookie-banner.tsx'
	);
	const preferenceCenterPath = path.join(
		consentManagerDirPath,
		'preference-center.tsx'
	);
	const themePath = path.join(consentManagerDirPath, 'theme.ts');

	// Create directory and write files
	await fs.mkdir(consentManagerDirPath, { recursive: true });
	await Promise.all([
		fs.writeFile(indexPath, serverComponentContent, 'utf-8'),
		fs.writeFile(providerPath, providerContent, 'utf-8'),
		fs.writeFile(cookieBannerPath, cookieBannerContent, 'utf-8'),
		fs.writeFile(preferenceCenterPath, preferenceCenterContent, 'utf-8'),
		fs.writeFile(themePath, themeContent, 'utf-8'),
	]);

	return {
		consentManager: indexPath,
		consentManagerDir: consentManagerDirPath,
	};
}

/**
 * Creates the consent-manager component files in the components directory
 *
 * @param projectRoot - Root directory of the project
 * @param appDir - App directory path (either 'app' or 'src/app')
 * @param options - Configuration options for template generation
 * @returns Object containing paths to created files
 *
 * @throws {Error} When files cannot be created
 *
 * @remarks
 * Creates in components/consent-manager/:
 * - index.tsx - Main server component entry point
 * - provider.tsx - Client component with ConsentManagerProvider
 */
async function createPrebuiltConsentManagerComponents(
	projectRoot: string,
	appDir: string,
	options: {
		mode: string;
		backendURL?: string;
		useEnvFile?: boolean;
		proxyNextjs?: boolean;
		enableSSR: boolean;
	}
): Promise<
	Required<Pick<ComponentFilePaths, 'consentManager' | 'consentManagerClient'>>
> {
	const { mode, backendURL, useEnvFile, proxyNextjs, enableSSR } = options;

	// Detect or create components directory
	const componentsDir = await getComponentsDirectory(projectRoot, appDir);
	const consentManagerDirPath = path.join(
		projectRoot,
		componentsDir,
		'consent-manager'
	);

	// Get the backend URL value for fetchInitialData
	const backendURLValue = getBackendURLValue(
		backendURL,
		useEnvFile,
		proxyNextjs
	);

	// Generate options text for the client component
	const optionsText = generateOptionsText(
		mode,
		backendURL,
		useEnvFile,
		proxyNextjs
	);

	// Generate component file contents
	const consentManagerContent = generateConsentManagerTemplate({
		enableSSR,
		backendURLValue,
	});
	const consentManagerClientContent = generateConsentManagerClientTemplate({
		enableSSR,
		optionsText,
	});

	// Define file paths - everything in components/consent-manager/
	const indexPath = path.join(consentManagerDirPath, 'index.tsx');
	const providerPath = path.join(consentManagerDirPath, 'provider.tsx');

	// Create directory and write files
	await fs.mkdir(consentManagerDirPath, { recursive: true });
	await Promise.all([
		fs.writeFile(indexPath, consentManagerContent, 'utf-8'),
		fs.writeFile(providerPath, consentManagerClientContent, 'utf-8'),
	]);

	return {
		consentManager: indexPath,
		consentManagerClient: providerPath,
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
	enableSSR = true,
	uiStyle = 'prebuilt',
	expandedTheme = 'tailwind',
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

	// Create consent manager component files based on UI style
	let componentFiles: ComponentFilePaths;

	if (uiStyle === 'expanded') {
		componentFiles = await createExpandedConsentManagerComponents(
			projectRoot,
			appDir,
			{
				mode,
				backendURL,
				useEnvFile,
				proxyNextjs,
				enableSSR,
				expandedTheme,
			}
		);
	} else {
		componentFiles = await createPrebuiltConsentManagerComponents(
			projectRoot,
			appDir,
			{
				mode,
				backendURL,
				useEnvFile,
				proxyNextjs,
				enableSSR,
			}
		);
	}

	// Add import for ConsentManager with correct relative path
	addConsentManagerImport(layoutFile, componentFiles.consentManager);

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
