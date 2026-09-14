/**
 * `@c15t/nextjs` Next.js App Router adapter.
 *
 * Pattern:
 *   // app/layout.tsx (Server Component)
 *   import { resolveConsent } from '@c15t/nextjs/server';
 *   import { ConsentRoot } from '@c15t/nextjs';
 *
 *   export default async function RootLayout({ children }) {
 *     const state = await resolveConsent();
 *     return (
 *       <html>
 *         <body>
 *           <ConsentRoot state={state}>{children}</ConsentRoot>
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
 * caches, keeping requests isolated under Fluid Compute.
 */

// oxlint-disable-next-line oxc/no-barrel-file -- Preserve declaration order, interface shape, and public compatibility.
export * from '@c15t/react';
export type { ConsentRootProps } from './root';
export { ConsentRoot } from './root';
export type { ConsentState } from './types';
export type { ConsentConfig } from './config';
export { defineConsentConfig } from './config';
