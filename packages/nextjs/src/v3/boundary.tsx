'use client';

/**
 * Client boundary for the v3 Next.js adapter.
 *
 * Receives a plain `KernelConfig` from a Server Component and forwards it
 * to the React v3 provider as `options.prefetch`. Kernel creation,
 * persistence, init, and module wiring live in `@c15t/react/v3`.
 */
import type {
	UseNetworkBlockerOptions,
	UsePersistenceOptions,
	UseScriptLoaderOptions,
} from '@c15t/react/v3/module-hooks';
import {
	ConsentProvider,
	type ConsentProviderOptions,
} from '@c15t/react/v3/provider';
import type { KernelConfig } from 'c15t/v3';
import type { Script } from 'c15t/v3/modules/script-loader';
import type { ReactNode } from 'react';

export interface ConsentBoundaryProps {
	/**
	 * Kernel configuration produced server-side by
	 * `readInitialConsentConfig()` or `prefetchInitialConsent()` from
	 * `@c15t/nextjs/v3/server`. Serializable JSON.
	 */
	config: KernelConfig;

	/**
	 * Backend base URL (e.g. `/api/c15t` or `https://consent.example.com`).
	 * When provided, the provider uses hosted mode and auto-runs init.
	 */
	backendURL?: string;

	/**
	 * Script tags to manage via the v3 script-loader module.
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
	 * Additional React v3 provider options.
	 */
	options?: Omit<
		ConsentProviderOptions,
		| 'backendURL'
		| 'mode'
		| 'networkBlocker'
		| 'persistence'
		| 'prefetch'
		| 'scriptLoader'
		| 'scripts'
	>;

	children: ReactNode;
}

export function ConsentBoundary({
	config,
	backendURL,
	scripts,
	scriptLoader,
	networkBlocker,
	persistence,
	options,
	children,
}: ConsentBoundaryProps) {
	return (
		<ConsentProvider
			options={{
				...options,
				mode: backendURL ? 'hosted' : 'offline',
				backendURL,
				prefetch: config,
				scripts,
				scriptLoader,
				networkBlocker,
				persistence,
			}}
		>
			{children}
		</ConsentProvider>
	);
}
