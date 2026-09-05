/**
 * `@c15t/nextjs` Next.js App Router adapter.
 *
 * Pattern:
 *   // app/layout.tsx (Server Component)
 *   import { readInitialConsentConfig } from '@c15t/nextjs/server';
 *   import { ConsentBoundary } from '@c15t/nextjs';
 *
 *   export default async function RootLayout({ children }) {
 *     const config = await readInitialConsentConfig();
 *     return (
 *       <html>
 *         <body>
 *           <ConsentBoundary config={config}>{children}</ConsentBoundary>
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
export type { ConsentBoundaryProps } from './boundary';
export { ConsentBoundary } from './boundary';
