/**
 * Component template generators for Next.js App Directory
 * Generates consent-manager.tsx and consent-manager.client.tsx components
 */

/**
 * Generates the server-side consent-manager.tsx component template
 *
 * @param optionsText - The stringified options object for ConsentManagerProvider
 * @returns The complete component file content
 *
 * @remarks
 * This component is rendered on the server and contains:
 * - ConsentManagerProvider with server-side configuration
 * - CookieBanner component
 * - ConsentManagerDialog component
 * - ConsentManagerClient wrapper for client-side features
 *
 * @example
 * ```ts
 * const content = generateConsentManagerTemplate('{ mode: "c15t", backendURL: "/api/c15t" }');
 * ```
 */
export function generateConsentManagerTemplate(optionsText: string): string {
	return `import {
	ConsentManagerDialog,
	ConsentManagerProvider,
	CookieBanner,
} from '@c15t/nextjs';
// For client-only apps (non-SSR), you can use:
// import { ConsentManagerProvider } from '@c15t/nextjs/client';
import { ConsentManagerClient } from './consent-manager.client';

/**
 * Server-side rendered consent management wrapper for Next.js App Router
 *
 * This component provides SSR-compatible consent management by separating
 * server-side configuration from client-side functionality. The server handles
 * initial setup and configuration, while client-side features (callbacks,
 * scripts) are delegated to the ConsentManagerClient component.
 *
 * @param props - Component properties
 * @param props.children - Child components to render within the consent manager context
 *
 * @returns The consent manager provider with banner, dialog, and client wrapper
 *
 * @remarks
 * This split architecture is necessary because certain options like callbacks
 * and scripts cannot be serialized during server-side rendering. For
 * client-only implementations, use \`<ConsentManagerProvider />\` from
 * \`@c15t/nextjs/client\`.
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
export function ConsentManager({ children }: { children: React.ReactNode }) {
	return (
		<ConsentManagerProvider
			options={${optionsText}}
		>
			<CookieBanner />
			<ConsentManagerDialog />
			<ConsentManagerClient>{children}</ConsentManagerClient>
		</ConsentManagerProvider>
	);
}
`;
}

/**
 * Generates the client-side consent-manager.client.tsx component template
 *
 * @returns The complete client component file content
 *
 * @remarks
 * This component is marked with 'use client' directive and handles:
 * - ClientSideOptionsProvider for callbacks and scripts
 * - Integration scripts (Google Tag Manager, Meta Pixel, etc.)
 * - Client-side callbacks (onConsentSet, onError, etc.)
 *
 * Users should customize this file to add their specific scripts and callbacks.
 *
 * @example
 * ```ts
 * const content = generateConsentManagerClientTemplate();
 * await fs.writeFile('consent-manager.client.tsx', content);
 * ```
 */
export function generateConsentManagerClientTemplate(): string {
	return `'use client';

import { ClientSideOptionsProvider } from '@c15t/nextjs/client';

/**
 * Client-side consent manager wrapper for handling scripts and callbacks
 *
 * This component is rendered on the client and provides the ability to:
 * - Load integration scripts (Google Tag Manager, Meta Pixel, TikTok Pixel, etc.)
 * - Handle client-side callbacks (onConsentSet, onError, onBannerFetched)
 * - Manage script lifecycle (onLoad, onDelete)
 *
 * @param props - Component properties
 * @param props.children - Child components to render within the client-side context
 *
 * @returns The client-side options provider with children
 *
 * @see https://c15t.com/docs/frameworks/next/callbacks
 * @see https://c15t.com/docs/frameworks/next/script-loader
 */
export function ConsentManagerClient({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<ClientSideOptionsProvider
			// 📝 Add your integration scripts here
			// Scripts are loaded when consent is given and removed when consent is revoked
			scripts={[
				// Example:
				// googleTagManager({
				//   id: 'GTM-XXXXXX',
				//   script: {
				//     onLoad: () => console.log('GTM loaded'),
				//   },
				// }),
			]}
			// 📝 Add your callbacks here
			// Callbacks allow you to react to consent events
			callbacks={{
				// Example:
				// onConsentSet(response) {
				//   console.log('Consent updated:', response);
				// },
				// onError(error) {
				//   console.error('Consent error:', error);
				// },
			}}
		>
			{children}
		</ClientSideOptionsProvider>
	);
}
`;
}
