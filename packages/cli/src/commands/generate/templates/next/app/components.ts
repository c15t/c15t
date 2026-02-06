/**
 * Component template generators for Next.js App Directory
 * Generates consent-manager.tsx and consent-manager.client.tsx components
 */

interface GenerateConsentManagerTemplateOptions {
	enableSSR: boolean;
	backendURLValue: string;
}

interface GenerateConsentManagerClientTemplateOptions {
	enableSSR: boolean;
	optionsText: string;
}

/**
 * Generates the server-side consent-manager.tsx component template
 *
 * @param options - Template generation options
 * @param options.enableSSR - Whether to include fetchInitialData for SSR
 * @param options.backendURLValue - The backend URL value (could be env var or literal)
 * @returns The complete component file content
 *
 * @remarks
 * This component is rendered on the server. When SSR is enabled, it:
 * - Calls fetchInitialData() to pre-fetch consent data
 * - Passes the SSR data promise to the client component
 *
 * When SSR is disabled, it simply wraps children with the client component.
 *
 * @example
 * ```ts
 * // With SSR enabled
 * const content = generateConsentManagerTemplate({
 *   enableSSR: true,
 *   backendURLValue: 'process.env.NEXT_PUBLIC_C15T_URL!',
 * });
 *
 * // Without SSR
 * const content = generateConsentManagerTemplate({
 *   enableSSR: false,
 *   backendURLValue: '"/api/c15t"',
 * });
 * ```
 */
export function generateConsentManagerTemplate({
	enableSSR,
	backendURLValue,
}: GenerateConsentManagerTemplateOptions): string {
	if (enableSSR) {
		return `import { fetchInitialData } from '@c15t/nextjs';
import type { ReactNode } from 'react';
import ConsentManagerProvider from './provider';

/**
 * Server-side rendered consent management wrapper for Next.js App Router
 *
 * This component pre-fetches consent data on the server for faster hydration.
 * The fetchInitialData() function uses Next.js headers() API, which means:
 * - The route will be dynamically rendered (not statically generated)
 * - Works in server components and dynamic routes
 *
 * @param props - Component properties
 * @param props.children - Child components to render within the consent manager context
 *
 * @example
 * \`\`\`tsx
 * // In your root layout.tsx
 * import { ConsentManager } from './consent-manager';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <ConsentManager>
 *           {children}
 *         </ConsentManager>
 *       </body>
 *     </html>
 *   );
 * }
 * \`\`\`
 */
export function ConsentManager({ children }: { children: ReactNode }) {
	const ssrData = fetchInitialData({
		backendURL: ${backendURLValue},
	});

	return (
		<ConsentManagerProvider ssrData={ssrData}>
			{children}
		</ConsentManagerProvider>
	);
}
`;
	}

	// Without SSR - simpler pattern
	return `import type { ReactNode } from 'react';
import ConsentManagerProvider from './provider';

/**
 * Consent management wrapper for Next.js App Router (client-side only)
 *
 * This component uses client-side data fetching. Use this pattern when:
 * - Your site uses static generation (generateStaticParams)
 * - You want to avoid the headers() dynamic API
 * - SSR data fetching causes issues in your setup
 *
 * @param props - Component properties
 * @param props.children - Child components to render within the consent manager context
 *
 * @example
 * \`\`\`tsx
 * // In your root layout.tsx
 * import { ConsentManager } from './consent-manager';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <ConsentManager>
 *           {children}
 *         </ConsentManager>
 *       </body>
 *     </html>
 *   );
 * }
 * \`\`\`
 */
export function ConsentManager({ children }: { children: ReactNode }) {
	return (
		<ConsentManagerProvider>
			{children}
		</ConsentManagerProvider>
	);
}
`;
}

/**
 * Generates the client-side consent-manager.client.tsx component template
 *
 * @param options - Template generation options
 * @param options.enableSSR - Whether SSR data will be passed from server component
 * @param options.optionsText - The stringified options object for ConsentManagerProvider
 * @returns The complete client component file content
 *
 * @remarks
 * This component is marked with 'use client' directive and handles:
 * - ConsentManagerProvider with configuration
 * - CookieBanner and ConsentManagerDialog components
 * - SSR data hydration (when enableSSR is true)
 *
 * Users should customize this file to add their specific scripts and callbacks.
 *
 * @example
 * ```ts
 * const content = generateConsentManagerClientTemplate({
 *   enableSSR: true,
 *   optionsText: 'mode: "c15t",\n\t\t\t\tbackendURL: "/api/c15t"',
 * });
 * await fs.writeFile('consent-manager.client.tsx', content);
 * ```
 */
export function generateConsentManagerClientTemplate({
	enableSSR,
	optionsText,
}: GenerateConsentManagerClientTemplateOptions): string {
	const propsInterface = enableSSR
		? `interface Props {
	children: ReactNode;
	ssrData?: InitialDataPromise;
}`
		: `interface Props {
	children: ReactNode;
}`;

	const propsDestructure = enableSSR
		? '{ children, ssrData }: Props'
		: '{ children }: Props';

	const typeImports = enableSSR
		? `import type { InitialDataPromise } from '@c15t/nextjs';`
		: '';

	const ssrDataOption = enableSSR ? '\n\t\t\t\tssrData,' : '';

	return `'use client';

import type { ReactNode } from 'react';
import {
	ConsentManagerProvider,
	CookieBanner,
	ConsentManagerDialog,
} from '@c15t/nextjs';
${typeImports}

${propsInterface}

/**
 * Client-side consent manager provider
 *
 * This component handles:
 * - Consent state management
 * - Cookie banner and dialog display
 * - Script loading based on consent${enableSSR ? '\n * - SSR data hydration' : ''}
 *
 * @see https://c15t.com/docs/frameworks/nextjs
 */
export default function ConsentManagerClient(${propsDestructure}) {
	return (
		<ConsentManagerProvider
			options={{
				${optionsText}${ssrDataOption}
				// Add your scripts here:
				// scripts: [
				//   googleTagManager({ id: 'GTM-XXXXXX' }),
				// ],
				// Add your callbacks here:
				// callbacks: {
				//   onConsentSet: (response) => console.log('Consent updated:', response),
				// },
			}}
		>
			<CookieBanner />
			<ConsentManagerDialog />
			{children}
		</ConsentManagerProvider>
	);
}
`;
}
