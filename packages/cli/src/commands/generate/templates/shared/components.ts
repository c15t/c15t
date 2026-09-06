/**
 * Shared consent component template generator
 * Produces the Provider+Banner+Dialog component used by React, Next.js Pages, and App Dir client
 */

import type { DevelopmentEnvironment } from '~/context/framework-detection';

import { DEVTOOLS_COMPONENT, generateDevToolsImport } from './devtools';
import {
	generateScriptsCommentPlaceholder,
	generateScriptsConfig,
	generateScriptsImport,
} from './scripts';

interface GenerateConsentComponentOptions {
	developmentEnvironment?: DevelopmentEnvironment;
	/** Entry point to import from: 'c15t/react' or 'c15t/next' */
	importSource: string;
	/** Framework adapter entry point. Defaults to the provider's devtools subpath. */
	devToolsImportSource?: string;
	/** Pre-computed inner options text (mode, backendURL, etc.) */
	optionsText: string;
	/** Selected scripts to include */
	selectedScripts?: string[];
	/** Whether to add initialData prop passed as provider prop (Pages router) */
	initialDataProp?: boolean;
	/** Whether to add 'use client' directive (App Dir client) */
	useClientDirective?: boolean;
	/** Whether to use default export (App Dir client) */
	defaultExport?: boolean;
	/** Whether to add ssrData prop passed inside options object (App Dir client with SSR) */
	ssrDataOption?: boolean;
	/** Whether to add geo override for development */
	includeOverrides?: boolean;
	/** Whether to add c15t DevTools component */
	enableDevTools?: boolean;
	/** Entry point used for server-prefetch config typing. */
	useFrameworkProps?: string;
	/** When true, add theme import from './theme' and include in options */
	includeTheme?: boolean;
	/** Docs slug for @see URL (e.g. 'react', 'nextjs') */
	docsSlug?: string;
}

const buildDocComment = function buildDocComment({
	defaultExport,
	initialDataProp,
	ssrDataOption: _ssrDataOption,
	docsSlug,
}: {
	defaultExport: boolean;
	initialDataProp: boolean;
	ssrDataOption: boolean;
	docsSlug?: string;
}): string {
	if (defaultExport) {
		const slug = docsSlug || 'nextjs';
		return `/**
 * Client-side consent manager provider.
 * @see https://c15t.com/docs/frameworks/${slug}/quickstart
 */`;
	}

	if (initialDataProp) {
		return `/**
 * Consent management wrapper for Next.js Pages Router.
 * @see https://c15t.com/docs/frameworks/nextjs/quickstart
 */`;
	}

	const slug = docsSlug || 'react';
	return `/**
 * Consent manager provider.
 * @see https://c15t.com/docs/frameworks/${slug}/quickstart
 */`;
};

/**
 * Generates a consent manager component with Provider, Banner, and Dialog
 *
 * @param options - Configuration for the generated component
 * @returns The complete component file content as a string
 *
 * @remarks
 * This shared generator covers React, Next.js Pages, and Next.js App Dir client
 * variants. The core JSX pattern is always Provider wrapping Banner + Dialog + children.
 *
 * @example
 * ```ts
 * // React
 * generateConsentComponent({
 *   importSource: 'c15t/react',
 *   optionsText: "mode: 'offline',",
 * });
 *
 * // Next.js Pages
 * generateConsentComponent({
 *   importSource: 'c15t/next',
 *   optionsText: "mode: 'hosted',\n\t\t\t\tbackendURL: '/api/c15t',",
 *   initialDataProp: true,
 * });
 *
 * // Next.js App Dir client
 * generateConsentComponent({
 *   importSource: 'c15t/next',
 *   optionsText: "mode: 'hosted',\n\t\t\t\tbackendURL: '/api/c15t',",
 *   useClientDirective: true,
 *   defaultExport: true,
 *   ssrDataOption: true,
 *   includeOverrides: true,
 * });
 * ```
 */
// oxlint-disable-next-line complexity -- Preserve established branch order and control flow.
export const generateConsentComponent = function generateConsentComponent({
	importSource,
	developmentEnvironment,
	devToolsImportSource = `${importSource}/devtools`,
	optionsText,
	selectedScripts = [],
	initialDataProp = false,
	useClientDirective = false,
	defaultExport = false,
	ssrDataOption = false,
	includeOverrides: _includeOverrides = false,
	enableDevTools = false,
	useFrameworkProps: _useFrameworkProps,
	includeTheme = false,
	docsSlug,
}: GenerateConsentComponentOptions): string {
	// Generate scripts import and config
	const scriptsImport = generateScriptsImport(selectedScripts);
	const scriptsConfig = selectedScripts.length
		? generateScriptsConfig(selectedScripts)
		: generateScriptsCommentPlaceholder();

	// Build the full options object
	const ssrDataLine = ssrDataOption ? '\n\t\t\t\tprefetch: config,' : '';
	const themeLine = includeTheme ? '\n\t\t\t\ttheme,\n\t\t\t\tcomponents,' : '';
	const overridesLine = '';

	const fullOptionsText = `{
			${optionsText}${ssrDataLine}${themeLine}
			${scriptsConfig}${overridesLine}
		}`;

	const needsDataType = initialDataProp || ssrDataOption;
	const modeImports = ['custom', 'hosted', 'offline'].filter((name) =>
		optionsText.includes(`${name}(`)
	);
	const namedImports = `ConsentDialog,
	ConsentProvider,
	ConsentBanner,${modeImports.map((name) => `\n\t${name},`).join('')}${needsDataType ? '\n\ttype KernelConfig,' : ''}`;

	// Build framework props type import
	const frameworkPropsImport = '';

	// Build component props
	let propsDestructure: string;
	if (ssrDataOption) {
		propsDestructure = `{
	children,
	config,
}: {
	children: ReactNode;
	config: KernelConfig;
}`;
	} else if (initialDataProp) {
		propsDestructure = `{
	children,
	initialData,
}: {
	children: ReactNode;
	initialData?: KernelConfig;
}`;
	} else {
		propsDestructure = '{ children }: { children: ReactNode }';
	}

	// Build provider props
	const providerProps = initialDataProp
		? ` options={{\n\t\t\t...${fullOptionsText},\n\t\t\tprefetch: initialData,\n\t\t}}`
		: ` options={${fullOptionsText}}`;

	// Build directive
	const directive = useClientDirective ? "'use client';\n\n" : '';
	const devToolsImport = enableDevTools
		? generateDevToolsImport(devToolsImportSource, developmentEnvironment)
		: '';
	const themeImport = includeTheme
		? "import { components, theme } from './theme';\n"
		: '';

	// Build export
	const componentName = defaultExport
		? 'ConsentManagerClient'
		: 'ConsentManager';
	const exportPrefix = defaultExport
		? 'export default function'
		: 'export function';

	// Build doc comment
	const docComment = buildDocComment({
		defaultExport,
		docsSlug,
		initialDataProp,
		ssrDataOption,
	});

	// Build pre-doc extras (e.g. client-only comment for Pages)
	const preDocComment = initialDataProp
		? `// For client-only apps (non-SSR), you can use:
// import { ConsentProvider } from 'c15t/next';

`
		: '';

	return `${directive}import type { ReactNode } from 'react';
import {
	${namedImports}
} from '${importSource}';
${frameworkPropsImport}${devToolsImport}${themeImport}${scriptsImport ? `${scriptsImport}\n` : ''}${preDocComment}${docComment}
${exportPrefix} ${componentName}(${propsDestructure}) {
	return (
		<ConsentProvider${providerProps}>
			<ConsentBanner />
			<ConsentDialog />
			${enableDevTools ? DEVTOOLS_COMPONENT : ''}
			{children}
		</ConsentProvider>
	);
}
`;
};
