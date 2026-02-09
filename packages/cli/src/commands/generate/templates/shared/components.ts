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
	/** Whether to add callbacks comment placeholder in options (App Dir client) */
	callbacksPlaceholder?: boolean;
	/** Whether to add c15t DevTools component */
	enableDevTools?: boolean;
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
 *   optionsText: "mode: 'c15t',\n\t\t\t\tbackendURL: '/api/c15t',",
 *   initialDataProp: true,
 * });
 *
 * // Next.js App Dir client
 * generateConsentComponent({
 *   importSource: '@c15t/nextjs',
 *   optionsText: "mode: 'c15t',\n\t\t\t\tbackendURL: '/api/c15t',",
 *   useClientDirective: true,
 *   defaultExport: true,
 *   ssrDataOption: true,
 *   callbacksPlaceholder: true,
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
	callbacksPlaceholder = false,
	enableDevTools = false,
}: GenerateConsentComponentOptions): string {
	// Generate scripts import and config
	const scriptsImport = generateScriptsImport(selectedScripts);
	const scriptsConfig = selectedScripts.length
		? generateScriptsConfig(selectedScripts)
		: generateScriptsCommentPlaceholder();

	// Build the full options object
	const ssrDataLine = ssrDataOption ? '\n\t\t\t\tssrData,' : '';
	const callbacksComment = callbacksPlaceholder
		? `\n\t\t\t\t// Add your callbacks here:\n\t\t\t\t// callbacks: {\n\t\t\t\t//   onConsentSet: (response) => console.log('Consent updated:', response),\n\t\t\t\t// },`
		: '';

	const fullOptionsText = `{
			${optionsText}${ssrDataLine}
			${scriptsConfig}${callbacksComment}
		}`;

	// Whether we need InitialDataPromise type
	const needsDataType = initialDataProp || ssrDataOption;

	const namedImports = needsDataType
		? `ConsentDialog,
	ConsentManagerProvider,
	ConsentBanner,
	type InitialDataPromise`
		: `ConsentDialog,
	ConsentManagerProvider,
	ConsentBanner,`;

	// Build component props
	let propsDestructure: string;
	if (ssrDataOption) {
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
		? "import { C15TDevTools } from '@c15t/dev-tools/react';\n"
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
		initialDataProp,
		ssrDataOption,
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
${devToolsImport}${scriptsImport ? `${scriptsImport}\n` : ''}${preDocComment}${docComment}
${exportPrefix} ${componentName}(${propsDestructure}) {
	return (
		<ConsentManagerProvider${providerProps}>
			<ConsentBanner />
			<ConsentDialog />
			${enableDevTools ? "<C15TDevTools disabled={process.env.NODE_ENV === 'production'} />" : ''}
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
}: {
	defaultExport: boolean;
	initialDataProp: boolean;
	ssrDataOption: boolean;
}): string {
	if (defaultExport) {
		const ssrLine = ssrDataOption ? '\n * - SSR data hydration' : '';
		return `/**
 * Client-side consent manager provider
 *
 * This component handles:
 * - Consent state management
 * - Cookie banner and dialog display
 * - Script loading based on consent${ssrLine}
 *
 * @see https://c15t.com/docs/frameworks/nextjs
 */`;
	}

	if (initialDataProp) {
		return `/**
 * Consent management wrapper for Next.js Pages Router
 *
 * This component wraps your app with consent management functionality,
 * including the cookie banner, consent dialog, and provider.
 *
 * @param props - Component properties
 * @param props.children - Child components to render within the consent manager context
 * @param props.initialData - Initial consent data from server-side props (optional)
 *
 * @returns The consent manager provider with banner and dialog
 *
 * @remarks
 * To get initial server-side data on other pages, use:
 * \`\`\`tsx
 * import { withInitialC15TData } from '@c15t/nextjs';
 *
 * export const getServerSideProps = withInitialC15TData('/api/c15t');
 * \`\`\`
 *
 * @example
 * \`\`\`tsx
 * // In your pages/_app.tsx
 * import { ConsentManager } from '../components/consent-manager';
 *
 * export default function MyApp({ Component, pageProps }) {
 *   return (
 *     <ConsentManager initialData={pageProps.initialC15TData}>
 *       <Component {...pageProps} />
 *     </ConsentManager>
 *   );
 * }
 * \`\`\`
 */`;
	}

	return `/**
 * Consent management wrapper for React
 *
 * This component wraps your app with consent management functionality,
 * including the cookie banner, consent dialog, and provider.
 *
 * Usage:
 * \`\`\`tsx
 * // In your App.tsx
 * import { ConsentManager } from './components/consent-manager';
 *
 * export default function App() {
 *   return (
 *     <ConsentManager>
 *       <YourApp />
 *     </ConsentManager>
 *   );
 * }
 * \`\`\`
 */`;
}
