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
 * Server-side rendered consent management wrapper for ${framework.frameworkName}
 *
 * This component pre-fetches consent data on the server for faster hydration.
 * The fetchInitialData() function uses ${framework.ssrMechanism}, which means:
 * - The route will be dynamically rendered (not statically generated)
 * - Works in server components and dynamic routes
 *
 * @see https://c15t.com/docs/frameworks/${framework.docsSlug}/ssr
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
 * Consent management wrapper for ${framework.frameworkName} (client-side only)
 *
 * This component uses client-side data fetching. Use this pattern when:
 * - Your site uses static generation
 * - You want to avoid the ${framework.ssrMechanism}
 * - SSR data fetching causes issues in your setup
 *
 * @see https://c15t.com/docs/frameworks/${framework.docsSlug}
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
