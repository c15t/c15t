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
 * When SSR is enabled, the component starts resolving consent state on the
 * server with `resolveConsent()` and passes the pending promise to the client
 * component, so the page renders without waiting for consent. The generated
 * file stays synchronous: awaiting there would hold the whole response until
 * the backend answers. When SSR is disabled, it simply wraps children with
 * the client component.
 *
 * @param options - Template generation options
 * @param options.enableSSR - Whether to call `resolveConsent()` for SSR
 * @param options.backendURLValue - The backend URL value (could be env var or literal)
 * @param options.framework - Framework-specific configuration
 * @returns The complete component file content
 */
export const generateServerComponent = function generateServerComponent({
	enableSSR,
	backendURLValue,
	framework,
}: GenerateServerComponentOptions): string {
	if (enableSSR) {
		return `import { resolveConsent } from '${framework.importSource}/server';
import type { ReactNode } from 'react';
import ConsentManagerClient from './provider';

/**
 * Server-side consent management wrapper.
 *
 * Starts resolving this request's consent state and passes the pending result
 * to the client provider without awaiting it, so the page renders without
 * waiting for the consent backend. The banner mounts after hydration, once
 * the state arrives.
 *
 * To render the banner in the server HTML instead, make this component async,
 * await \`resolveConsent\`, and wrap <ConsentManager> in <Suspense> in your
 * layout. The page then waits for consent before it is shown.
 * @see https://c15t.com/docs/frameworks/${framework.docsSlug}/app-router
 */
export function ConsentManager({ children }: { children: ReactNode }) {
	const state = resolveConsent({
		backendURL: ${backendURLValue},
	});

	return (
		<ConsentManagerClient state={state}>
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
