'use client';

import type { KernelConfig } from '@c15t/core';
import type { Script } from '@c15t/core/modules/script-loader';
/**
 * Client boundary for the Next.js adapter.
 *
 * Receives a plain `KernelConfig` from a Server Component and forwards it
 * to the React provider as `options.prefetch`. Kernel creation,
 * persistence, init, and module wiring live in `@c15t/react`.
 */
import { hosted, offline } from '@c15t/react';
import type { ProviderTransportFactory } from '@c15t/react';
import type {
	UseNetworkBlockerOptions,
	UsePersistenceOptions,
	UseScriptLoaderOptions,
} from '@c15t/react/module-hooks';
import { ConsentProvider } from '@c15t/react/provider';
import type { ConsentProviderOptions } from '@c15t/react/provider';
import type { ReactNode } from 'react';

export interface ConsentBoundaryProps {
	/**
	 * Kernel configuration produced server-side by
	 * `readInitialConsentConfig()` or `prefetchInitialConsent()` from
	 * `@c15t/nextjs/server`. Serializable JSON.
	 */
	config: KernelConfig;

	/**
	 * Backend base URL (e.g. `/api/c15t` or `https://consent.example.com`).
	 * When provided, the provider uses hosted mode and auto-runs init.
	 */
	backendURL?: string;

	/**
	 * Script tags to manage with the script-loader module.
	 */
	scripts?: Script[];

	/**
	 * Script-loader options.
	 */
	scriptLoader?: UseScriptLoaderOptions;

	/**
	 * Network-blocker configuration.
	 */
	networkBlocker?: UseNetworkBlockerOptions | false;

	/**
	 * Enable client-side persistence. Defaults to true.
	 */
	persistence?: boolean | UsePersistenceOptions;

	/**
	 * Additional React provider options.
	 */
	options?: Omit<
		ConsentProviderOptions,
		| 'mode'
		| 'networkBlocker'
		| 'persistence'
		| 'prefetch'
		| 'scriptLoader'
		| 'scripts'
		| '__debugPkg'
	> & {
		mode?: ProviderTransportFactory;
	};

	children: ReactNode;
}

export const ConsentBoundary = ({
	config,
	backendURL,
	scripts,
	scriptLoader,
	networkBlocker,
	persistence,
	options,
	children,
}: ConsentBoundaryProps) => (
	<ConsentProvider
		options={{
			...options,
			__debugPkg: '@c15t/nextjs',
			mode:
				options?.mode ?? (backendURL ? hosted({ url: backendURL }) : offline()),
			networkBlocker,
			persistence,
			prefetch: config,
			scriptLoader,
			scripts,
		}}
	>
		{children}
	</ConsentProvider>
);
