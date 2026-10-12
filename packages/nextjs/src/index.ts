/**
 * `@c15t/nextjs` Next.js adapter.
 *
 * Pattern:
 *   // c15t.config.ts, found by withConsentManifest in next.config.ts
 *   import { defineConsentConfig } from '@c15t/nextjs';
 *   export default defineConsentConfig({ scripts: [...] });
 *
 *   // app/layout.tsx (Server Component)
 *   import { ConsentBanner, ConsentRoot } from '@c15t/nextjs';
 *   import { resolveConsent } from '@c15t/nextjs/server';
 *
 *   export default function RootLayout({ children }) {
 *     return (
 *       <html>
 *         <body>
 *           <ConsentRoot state={resolveConsent()}>
 *             {children}
 *             <ConsentBanner />
 *           </ConsentRoot>
 *         </body>
 *       </html>
 *     );
 *   }
 *
 *   // any client component
 *   import { useConsent } from '@c15t/react';
 *   const allowed = useConsent('marketing');
 *
 * Server helpers return serializable data and avoid module-level runtime
 * caches, keeping requests isolated under Fluid Compute. A Server Component
 * resolves this entry through the `react-server` condition to
 * `index.react-server.ts`.
 */

// oxlint-disable-next-line oxc/no-barrel-file -- Preserve declaration order, interface shape, and public compatibility.
export * from '@c15t/react';
export type { ConsentRootProps } from './root';
export { ConsentRoot } from './root';
export type { ConsentClientOptions, ConsentState } from './types';
export type { ConsentConfig } from './config';
export { defineConsentConfig } from './config';
// The data factories, in place of `@c15t/react`'s transports.
export type {
	ConsentMode,
	HostedMode,
	HostedModeOptions,
	ManifestMode,
	ManifestModeOptions,
	OfflineMode,
	OfflineModeOptions,
} from '@c15t/core/modes';
export { hosted, manifest, offline } from '@c15t/core/modes';
