/**
 * @c15t/nextjs-v3 — Next.js App Router adapter (experimental).
 *
 * Unstable. API may change before v3.0 stable.
 *
 * Pattern:
 *   // app/layout.tsx (Server Component)
 *   import { readInitialConsentConfig } from '@c15t/nextjs-v3/server';
 *   import { ConsentBoundary } from '@c15t/nextjs-v3';
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
 *   import { useConsent } from '@c15t/react-v3';
 *   const allowed = useConsent('marketing');
 *
 * Contrast with v2:
 * - No `fetchInitialData()` returning an unawaited Promise.
 * - No `ssrData` prop the consumer has to thread without awaiting.
 * - No module-level runtime cache — Fluid Compute safe by construction.
 */

export * from '@c15t/react-v3';

export { buildPrefetchScript, type PrefetchOptions } from 'c15t';
export type { ConsentBoundaryProps } from './boundary';
export { ConsentBoundary } from './boundary';
export { C15tPrefetch } from './libs/browser-initial-data';
export { fetchInitialData } from './libs/initial-data';
export type {
	C15tPrefetchProps,
	ConsentManagerProps,
	FetchInitialDataOptions,
	InitialDataPromise,
} from './types';
