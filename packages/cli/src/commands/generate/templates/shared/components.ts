/**
 * Shared consent component template generator
 * Produces the Provider+Banner+Dialog component used by React, Next.js Pages, and App Dir client
 */

import {
	generateScriptsCommentPlaceholder,
	generateScriptsConfig,
	generateScriptsImport,
} from './scripts';

interface GenerateConsentComponentOptions {
	/** Package to import from: '@c15t/react' or '@c15t/nextjs' */
	importSource: string;
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
	/** Whether to add geo override for development (shows banner in non-EU countries) */
	includeOverrides?: boolean;
	/** Whether to add c15t DevTools component */
	enableDevTools?: boolean;
	/** When set, use ConsentManagerProps from this package for props typing (e.g. '@c15t/nextjs') */
	useFrameworkProps?: string;
	/** When true, add theme import from './theme' and include in options */
	includeTheme?: boolean;
	/** Docs slug for @see URL (e.g. 'react', 'nextjs') */
	docsSlug?: string;
}

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
 *   importSource: '@c15t/react',
 *   optionsText: "mode: 'offline',",
 * });
 *
 * // Next.js Pages
 * generateConsentComponent({
 *   importSource: '@c15t/nextjs',
 *   optionsText: "mode: 'hosted',\n\t\t\t\tbackendURL: '/api/c15t',",
 *   initialDataProp: true,
 * });
 *
 * // Next.js App Dir client
 * generateConsentComponent({
 *   importSource: '@c15t/nextjs',
 *   optionsText: "mode: 'hosted',\n\t\t\t\tbackendURL: '/api/c15t',",
 *   useClientDirective: true,
 *   defaultExport: true,
 *   ssrDataOption: true,
 *   includeOverrides: true,
 * });
 * ```
 */
export function generateConsentComponent({
	importSource,
	optionsText,
	selectedScripts = [],
	initialDataProp = false,
	useClientDirective = false,
	defaultExport = false,
	ssrDataOption = false,
	includeOverrides = false,
	enableDevTools = false,
	useFrameworkProps,
	includeTheme = false,
	docsSlug,
}: GenerateConsentComponentOptions): string {
	// Generate scripts import and config
	const scriptsImport = generateScriptsImport(selectedScripts);
	const scriptsConfig = selectedScripts.length
		? generateScriptsConfig(selectedScripts)
		: generateScriptsCommentPlaceholder();

	// Build the full options object
	const ssrDataLine = ssrDataOption ? '\n\t\t\t\tssrData,' : '';
	const themeLine = includeTheme ? '\n\t\t\t\ttheme,' : '';
	const overridesLine = includeOverrides
		? `\n\t\t\t\t// Shows banner during development. Remove for production.\n\t\t\t\toverrides: { country: 'DE' },`
		: '';

	const fullOptionsText = `{
			${optionsText}${ssrDataLine}${themeLine}
			${scriptsConfig}${overridesLine}
		}`;

	// When useFrameworkProps is set with ssrDataOption, use ConsentManagerProps from that source
	const useConsentManagerProps = useFrameworkProps && ssrDataOption;

	// Whether we need InitialDataPromise type (only when NOT using ConsentManagerProps)
	const needsDataType =
		(initialDataProp || ssrDataOption) && !useConsentManagerProps;

	const namedImports = needsDataType
		? `ConsentDialog,
	ConsentManagerProvider,
	ConsentBanner,
	type InitialDataPromise`
		: `ConsentDialog,
	ConsentManagerProvider,
	ConsentBanner,`;

	// Build framework props type import
	const frameworkPropsImport = useConsentManagerProps
		? `import type { ConsentManagerProps } from '${useFrameworkProps}';\n`
		: '';

	// Build component props
	let propsDestructure: string;
	if (useConsentManagerProps) {
		propsDestructure = `{ children, ssrData }: ConsentManagerProps`;
	} else if (ssrDataOption) {
		propsDestructure = `{
	children,
	ssrData,
}: {
	children: ReactNode;
	ssrData?: InitialDataPromise;
}`;
	} else if (initialDataProp) {
		propsDestructure = `{
	children,
	initialData,
}: {
	children: ReactNode;
	initialData?: InitialDataPromise;
}`;
	} else {
		propsDestructure = '{ children }: { children: ReactNode }';
	}

	// Build provider props
	const providerProps = initialDataProp
		? `\n\t\t\tinitialData={initialData}\n\t\t\toptions={${fullOptionsText}}`
		: ` options={${fullOptionsText}}`;

	// Build directive
	const directive = useClientDirective ? "'use client';\n\n" : '';
	const devToolsImport = enableDevTools
		? "import { DevTools } from '@c15t/dev-tools/react';\n"
		: '';
	const themeImport = includeTheme ? "import { theme } from './theme';\n" : '';

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
		initialDataProp,
		ssrDataOption,
		docsSlug,
	});

	// Build pre-doc extras (e.g. client-only comment for Pages)
	const preDocComment = initialDataProp
		? `// For client-only apps (non-SSR), you can use:
// import { ConsentManagerProvider } from '@c15t/nextjs/client';

`
		: '';

	return `${directive}import type { ReactNode } from 'react';
import {
	${namedImports}
} from '${importSource}';
${frameworkPropsImport}${devToolsImport}${themeImport}${scriptsImport ? `${scriptsImport}\n` : ''}${preDocComment}${docComment}
${exportPrefix} ${componentName}(${propsDestructure}) {
	return (
		<ConsentManagerProvider${providerProps}>
			<ConsentBanner />
			<ConsentDialog />
			${enableDevTools ? "<DevTools disabled={process.env.NODE_ENV === 'production'} />" : ''}
			{children}
		</ConsentManagerProvider>
	);
}
`;
}

function buildDocComment({
	defaultExport,
	initialDataProp,
	ssrDataOption,
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
}
