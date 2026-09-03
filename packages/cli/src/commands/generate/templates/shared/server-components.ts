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
 * When SSR is enabled, the component reads a serializable kernel config on
 * the server and passes it to the client component.
 * When SSR is disabled, it simply wraps children with the client component.
 *
 * @param options - Template generation options
 * @param options.enableSSR - Whether to include fetchInitialData for SSR
 * @param options.backendURLValue - The backend URL value (could be env var or literal)
 * @param options.framework - Framework-specific configuration
 * @returns The complete component file content
 */
export const generateServerComponent = function generateServerComponent({
	enableSSR,
	backendURLValue: _backendURLValue,
	framework,
}: GenerateServerComponentOptions): string {
	if (enableSSR) {
		return `import { readInitialConsentConfig } from '${framework.importSource}/server';
import type { ReactNode } from 'react';
import ConsentManagerClient from './provider';

/**
 * Server-side consent management wrapper with SSR data prefetching.
 * @see https://c15t.com/docs/frameworks/${framework.docsSlug}/quickstart
 */
export async function ConsentManager({ children }: { children: ReactNode }) {
	const config = await readInitialConsentConfig();

	return (
		<ConsentManagerClient config={config}>
			{children}
		</ConsentManagerClient>
	);
}
`;
	}

	return `import type { ReactNode } from 'react';
import ConsentManagerClient from './provider';

/**
 * Consent management wrapper.
 * @see https://c15t.com/docs/frameworks/${framework.docsSlug}/quickstart
 */
export function ConsentManager({ children }: { children: ReactNode }) {
	return (
		<ConsentManagerClient>
			{children}
		</ConsentManagerClient>
	);
}
`;
};

/**
 * Generates a simple non-RSC wrapper component for React (no SSR)
 *
 * @param frameworkName - Display name (e.g. 'React')
 * @param docsSlug - Docs URL slug (e.g. 'react')
 * @returns The complete wrapper file content
 */
export const generateSimpleWrapperComponent =
	function generateSimpleWrapperComponent(
		_frameworkName: string,
		docsSlug: string
	): string {
		return `import type { ReactNode } from 'react';
import ConsentManagerClient from './provider';

/**
 * Consent management wrapper.
 * @see https://c15t.com/docs/frameworks/${docsSlug}/quickstart
 */
export function ConsentManager({ children }: { children: ReactNode }) {
	return <ConsentManagerClient>{children}</ConsentManagerClient>;
}
`;
	};
