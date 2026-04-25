/**
 * @c15t/nextjs/v3 — Next.js App Router adapter (experimental).
 *
 * Unstable. API may change before v3.0 stable.
 *
 * Pattern:
 *   // app/layout.tsx (Server Component)
 *   import { readInitialConsentConfig } from '@c15t/nextjs/v3/server';
 *   import { ConsentBoundary } from '@c15t/nextjs/v3';
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
 *   import { useConsent } from '@c15t/react/v3';
 *   const allowed = useConsent('marketing');
 *
 * Contrast with v2:
 * - No `fetchInitialData()` returning an unawaited Promise.
 * - No `ssrData` prop the consumer has to thread without awaiting.
 * - No module-level runtime cache — Fluid Compute safe by construction.
 */

export type {
	ConsentKernel,
	ConsentProviderProps,
	ConsentSnapshot,
	ConsentState,
	HostedTransportOptions,
	InitResult,
	KernelConfig,
	KernelEvent,
	KernelOverrides,
	KernelTransport,
	KernelUser,
	SaveResult,
} from '@c15t/react/v3';
// Re-export the React adapter so consumers have one import path.
export {
	ConsentProvider,
	createConsentKernel,
	createHostedTransport,
	useConsent,
	useConsents,
	useHasConsented,
	useIdentify,
	useInit,
	useOverrides,
	useSaveConsents,
	useSetConsent,
	useSetLanguage,
	useSetOverrides,
	useSnapshot,
	useUser,
} from '@c15t/react/v3';
export type { ConsentBoundaryProps } from './boundary';
export { ConsentBoundary } from './boundary';
