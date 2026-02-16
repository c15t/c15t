/**
 * App Directory layout template generator
 * Handles updating Next.js App Directory layout files with ConsentManagerProvider
 * and creates separate consent-manager component files
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { AvailablePackages } from '~/context/framework-detection';
import type { ExpandedTheme, UIStyle } from '../../../prompts';
import { generateConsentComponent } from '../../shared/components';
import { getComponentsDirectory } from '../../shared/directory';
import {
	generateExpandedConsentBannerTemplate,
	generateExpandedConsentDialogTemplate,
	generateExpandedProviderTemplate,
	generateExpandedThemeTemplate,
} from '../../shared/expanded-components';
import { NEXTJS_CONFIG } from '../../shared/framework-config';
import { runLayoutUpdatePipeline } from '../../shared/layout-pipeline';
import { generateOptionsText, getBackendURLValue } from '../../shared/options';
import { generateServerComponent } from '../../shared/server-components';

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
	enableSSR?: boolean;
	enableDevTools?: boolean;
	uiStyle?: UIStyle;
	expandedTheme?: ExpandedTheme;
	selectedScripts?: string[];
	layoutFilePath?: string;
}

interface ComponentFilePaths {
	consentManager: string;
	consentManagerClient?: string;
	consentManagerDir?: string;
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
 * - consent-banner.tsx - Compound component banner
 * - consent-dialog.tsx - Compound component dialog
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
		enableDevTools?: boolean;
		expandedTheme: ExpandedTheme;
	}
): Promise<ComponentFilePaths> {
	const {
		mode,
		backendURL,
		useEnvFile,
		proxyNextjs,
		enableSSR,
		enableDevTools,
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
		proxyNextjs,
		NEXTJS_CONFIG.envVarPrefix
	);

	// Generate options text for the provider component
	const optionsText = generateOptionsText(
		mode,
		backendURL,
		useEnvFile,
		proxyNextjs,
		undefined,
		NEXTJS_CONFIG.envVarPrefix
	);

	// Generate all component file contents
	const serverComponentContent = generateServerComponent({
		enableSSR,
		backendURLValue,
		framework: NEXTJS_CONFIG,
	});
	const providerContent = generateExpandedProviderTemplate({
		enableSSR,
		enableDevTools: Boolean(enableDevTools),
		optionsText,
		framework: NEXTJS_CONFIG,
	});
	const consentBannerContent =
		generateExpandedConsentBannerTemplate(NEXTJS_CONFIG);
	const consentDialogContent =
		generateExpandedConsentDialogTemplate(NEXTJS_CONFIG);
	const themeContent = generateExpandedThemeTemplate(
		expandedTheme,
		NEXTJS_CONFIG
	);

	// Define file paths - everything in components/consent-manager/
	const indexPath = path.join(consentManagerDirPath, 'index.tsx');
	const providerPath = path.join(consentManagerDirPath, 'provider.tsx');
	const consentBannerPath = path.join(
		consentManagerDirPath,
		'consent-banner.tsx'
	);
	const consentDialogPath = path.join(
		consentManagerDirPath,
		'consent-dialog.tsx'
	);
	const themePath = path.join(consentManagerDirPath, 'theme.ts');

	// Create directory and write files
	await fs.mkdir(consentManagerDirPath, { recursive: true });
	await Promise.all([
		fs.writeFile(indexPath, serverComponentContent, 'utf-8'),
		fs.writeFile(providerPath, providerContent, 'utf-8'),
		fs.writeFile(consentBannerPath, consentBannerContent, 'utf-8'),
		fs.writeFile(consentDialogPath, consentDialogContent, 'utf-8'),
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
		enableDevTools?: boolean;
		expandedTheme?: ExpandedTheme;
		selectedScripts?: string[];
	}
): Promise<
	Required<Pick<ComponentFilePaths, 'consentManager' | 'consentManagerClient'>>
> {
	const {
		mode,
		backendURL,
		useEnvFile,
		proxyNextjs,
		enableSSR,
		enableDevTools,
		expandedTheme,
		selectedScripts,
	} = options;

	const hasTheme = expandedTheme && expandedTheme !== 'none';

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
		proxyNextjs,
		NEXTJS_CONFIG.envVarPrefix
	);

	// Generate options text for the client component
	const optionsText = generateOptionsText(
		mode,
		backendURL,
		useEnvFile,
		proxyNextjs,
		undefined,
		NEXTJS_CONFIG.envVarPrefix
	);

	// Generate component file contents
	const consentManagerContent = generateServerComponent({
		enableSSR,
		backendURLValue,
		framework: NEXTJS_CONFIG,
	});
	const consentManagerClientContent = generateConsentComponent({
		importSource: NEXTJS_CONFIG.importSource,
		optionsText,
		selectedScripts,
		useClientDirective: true,
		defaultExport: true,
		ssrDataOption: enableSSR,
		includeOverrides: !enableSSR,
		enableDevTools: Boolean(enableDevTools),
		useFrameworkProps: enableSSR ? NEXTJS_CONFIG.importSource : undefined,
		includeTheme: Boolean(hasTheme),
		docsSlug: NEXTJS_CONFIG.docsSlug,
	});

	// Define file paths - everything in components/consent-manager/
	const indexPath = path.join(consentManagerDirPath, 'index.tsx');
	const providerPath = path.join(consentManagerDirPath, 'provider.tsx');

	// Create directory and write files
	await fs.mkdir(consentManagerDirPath, { recursive: true });
	const writePromises: Promise<void>[] = [
		fs.writeFile(indexPath, consentManagerContent, 'utf-8'),
		fs.writeFile(providerPath, consentManagerClientContent, 'utf-8'),
	];

	// Generate theme file when a theme is selected
	if (hasTheme) {
		const themeContent = generateExpandedThemeTemplate(
			expandedTheme,
			NEXTJS_CONFIG
		);
		const themePath = path.join(consentManagerDirPath, 'theme.ts');
		writePromises.push(fs.writeFile(themePath, themeContent, 'utf-8'));
	}

	await Promise.all(writePromises);

	return {
		consentManager: indexPath,
		consentManagerClient: providerPath,
	};
}

const APP_LAYOUT_PATTERNS = [
	'app/layout.tsx',
	'src/app/layout.tsx',
	'app/layout.ts',
	'src/app/layout.ts',
];

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
	enableSSR = false,
	enableDevTools = false,
	uiStyle = 'prebuilt',
	expandedTheme = 'tailwind',
	selectedScripts,
	layoutFilePath,
}: UpdateAppLayoutOptions): Promise<{
	updated: boolean;
	filePath: string | null;
	alreadyModified: boolean;
	componentFiles?: ComponentFilePaths;
}> {
	return runLayoutUpdatePipeline({
		filePatterns: APP_LAYOUT_PATTERNS,
		projectRoot,
		knownFilePath: layoutFilePath,
		frameworkDirName: 'app',
		wrapJsx: wrapAppJsxContent,
		createComponents: async (_layoutFilePath, appDir) => {
			if (uiStyle === 'expanded') {
				return createExpandedConsentManagerComponents(projectRoot, appDir, {
					mode,
					backendURL,
					useEnvFile,
					proxyNextjs,
					enableSSR,
					enableDevTools,
					expandedTheme,
				});
			}
			return createPrebuiltConsentManagerComponents(projectRoot, appDir, {
				mode,
				backendURL,
				useEnvFile,
				proxyNextjs,
				enableSSR,
				enableDevTools,
				expandedTheme,
				selectedScripts,
			});
		},
	});
}
