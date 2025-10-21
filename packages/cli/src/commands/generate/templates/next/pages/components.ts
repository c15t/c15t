/**
 * Component template generators for Next.js Pages Directory
 * Generates consent-manager.tsx component
 */

/**
 * Generates the consent-manager.tsx component template for Pages Directory
 *
 * @param optionsText - The stringified options object for ConsentManagerProvider
 * @returns The complete component file content
 *
 * @remarks
 * This component wraps the Pages Directory app with consent management.
 * Unlike App Directory, Pages Directory doesn't need a separate client component
 * because it doesn't use the 'use client' directive pattern.
 *
 * @example
 * ```ts
 * const content = generateConsentManagerTemplate('{ mode: "c15t", backendURL: "/api/c15t" }');
 * ```
 */
export function generateConsentManagerTemplate(optionsText: string): string {
	return `import type { ReactNode } from 'react';
import {
	ConsentManagerDialog,
	ConsentManagerProvider,
	CookieBanner,
  type InitialDataPromise
} from '@c15t/nextjs/pages';
// For client-only apps (non-SSR), you can use:
// import { ConsentManagerProvider } from '@c15t/nextjs/client';

/**
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
 * import { withInitialC15TData } from '@c15t/nextjs/pages';
 *
 * export const getServerSideProps = withInitialC15TData('/api/c15t');
 * \`\`\`
 *
 * @example
 * \`\`\`tsx
 * // In your pages/_app.tsx
 * import { ConsentManager } from './consent-manager';
 *
 * export default function MyApp({ Component, pageProps }) {
 *   return (
 *     <ConsentManager initialData={pageProps.initialC15TData}>
 *       <Component {...pageProps} />
 *     </ConsentManager>
 *   );
 * }
 * \`\`\`
 */
export function ConsentManager({
	children,
	initialData,
}: {
	children: ReactNode;
	initialData?: InitialDataPromise;
}) {
	return (
		<ConsentManagerProvider
			initialData={initialData}
			options={${optionsText}}
		>
			<CookieBanner />
			<ConsentManagerDialog />
			{children}
		</ConsentManagerProvider>
	);
}
`;
}
