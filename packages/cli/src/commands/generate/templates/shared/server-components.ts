/**
 * Server component template generators
 * Generates the server-side consent-manager index.tsx component
 * that wraps the client provider with optional SSR data fetching.
 *
 * Parameterized by FrameworkConfig so it can be reused across
 * Next.js App Router, TanStack Start, and other RSC frameworks.
 */

import type { FrameworkConfig } from './framework-config';

interface GenerateServerComponentOptions {
	enableSSR: boolean;
	backendURLValue: string;
	framework: FrameworkConfig;
}

/**
 * Generates the server-side consent-manager index.tsx component template
 *
 * When SSR is enabled, the component calls fetchInitialData() to pre-fetch
 * consent data on the server and passes the promise to the client component.
 * When SSR is disabled, it simply wraps children with the client component.
 *
 * @param options - Template generation options
 * @param options.enableSSR - Whether to include fetchInitialData for SSR
 * @param options.backendURLValue - The backend URL value (could be env var or literal)
 * @param options.framework - Framework-specific configuration
 * @returns The complete component file content
 */
export function generateServerComponent({
	enableSSR,
	backendURLValue,
	framework,
}: GenerateServerComponentOptions): string {
	if (enableSSR) {
		return `import { fetchInitialData } from '${framework.importSource}';
import type { ReactNode } from 'react';
import ConsentManagerProvider from './provider';

/**
 * Server-side consent management wrapper with SSR data prefetching.
 * @see https://c15t.com/docs/frameworks/${framework.docsSlug}/quickstart
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

	return `import type { ReactNode } from 'react';
import ConsentManagerProvider from './provider';

/**
 * Consent management wrapper.
 * @see https://c15t.com/docs/frameworks/${framework.docsSlug}/quickstart
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
 * Generates a simple non-RSC wrapper component for React (no SSR)
 *
 * @param frameworkName - Display name (e.g. 'React')
 * @param docsSlug - Docs URL slug (e.g. 'react')
 * @returns The complete wrapper file content
 */
export function generateSimpleWrapperComponent(
	_frameworkName: string,
	docsSlug: string
): string {
	return `import type { ReactNode } from 'react';
import ConsentManagerProvider from './provider';

/**
 * Consent management wrapper.
 * @see https://c15t.com/docs/frameworks/${docsSlug}/quickstart
 */
export function ConsentManager({ children }: { children: ReactNode }) {
	return <ConsentManagerProvider>{children}</ConsentManagerProvider>;
}
`;
}
