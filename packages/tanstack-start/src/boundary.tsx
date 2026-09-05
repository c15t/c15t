'use client';

import type { KernelConfig } from '@c15t/core';
import type { Script } from '@c15t/core/modules/script-loader';
/**
 * Client boundary for the TanStack Start adapter.
 *
 * Receives a plain `KernelConfig` from the root route loader and forwards
 * it to the React provider as `options.prefetch`. Kernel creation,
 * persistence, init, and module wiring live in `@c15t/react`.
 *
 * The config must travel through loader data (or a server function
 * result), never through module state: the server and the client each
 * create their own kernel from the same serialized value, which is what
 * keeps the first paint and the hydrated tree identical.
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
import { useState } from 'react';

import { decisionInputsFromConfig } from './libs/decision-seed';
import { readPrefetchedInitialData } from './libs/prefetch-head';

/**
 * Same-origin route that resolves init from the cached manifest. Matches the
 * splat route `createConsentServerRoute()` serves under `/api/c15t/$`.
 */
export const DEFAULT_INIT_ROUTE = '/api/c15t/init';

export interface ConsentBoundaryProps {
	/**
	 * Kernel configuration produced server-side by
	 * `readInitialConsentConfig()` or `prefetchInitialConsent()` from
	 * `@c15t/tanstack-start/server`, usually read back with
	 * `Route.useLoaderData()`. Serializable JSON.
	 */
	config: KernelConfig;

	/**
	 * Backend base URL. When provided, the provider uses hosted mode and
	 * auto-runs init. Consent saves go to `${backendURL}/subjects`; init goes
	 * to {@link ConsentBoundaryProps.initRoute}.
	 *
	 * Without the proxy this is the c15t backend itself, for example
	 * `https://consent.example.com`. With
	 * `createConsentServerRoute({ proxy: true })` mounted, pass the route
	 * prefix instead, `"/api/c15t"`, so saves stay same-origin and reach the
	 * backend through the proxy. The server-side prefetch
	 * (`createConsentConfigHandler({ backendURL })`) must still receive the
	 * absolute backend URL, usually from `C15T_BACKEND_URL`: its self-route
	 * guard skips a relative `/api/c15t` and returns the cookie-only config.
	 */
	backendURL?: string;

	/**
	 * Same-origin init route served by `createConsentServerRoute()`.
	 * Defaults to `/api/c15t/init`, which resolves init in-process from the
	 * cached manifest and asserts the resolved decision inputs on save so a
	 * stale policy is rejected instead of recorded.
	 *
	 * Pass `false` to call `${backendURL}/init` directly instead, for apps
	 * that do not mount the server route.
	 */
	initRoute?: string | false;

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

const resolveMode = function resolveMode(
	backendURL: string | undefined,
	initRoute: string | false | undefined,
	initialData: ReturnType<typeof readPrefetchedInitialData>,
	config: KernelConfig | undefined
): ProviderTransportFactory {
	if (!backendURL) {
		return offline();
	}
	if (initRoute === false) {
		return hosted({ initialData, url: backendURL });
	}
	return hosted({
		assertDecisionInputs: true,
		// The server-rendered banner is interactive before the client init
		// resolves; the prefetched decision binds any save made in between.
		decisionInputs: decisionInputsFromConfig(config),
		initURL: initRoute ?? DEFAULT_INIT_ROUTE,
		initialData,
		url: backendURL,
	});
};

/**
 * Wraps the app in a consent provider seeded with server-produced config.
 *
 * @example
 * ```tsx
 * // src/routes/__root.tsx
 * import { ConsentBoundary } from '@c15t/tanstack-start';
 *
 * function RootComponent() {
 *   const config = Route.useLoaderData();
 *   return (
 *     <ConsentBoundary
 *       config={config}
 *       backendURL="https://consent.example.com"
 *     >
 *       <Outlet />
 *     </ConsentBoundary>
 *   );
 * }
 * ```
 */
export const ConsentBoundary = ({
	config,
	backendURL,
	initRoute,
	scripts,
	scriptLoader,
	networkBlocker,
	persistence,
	options,
	children,
}: ConsentBoundaryProps) => {
	// A `consentPrefetchHead()` script may have started the init request
	// before hydration. The hosted transport consumes that promise on its
	// first init, so the decision-input assertion still runs and the first
	// save stays bound to the resolved policy. Read once, on the client only,
	// so server and client render the same tree.
	const [mode, setMode] = useState(
		() =>
			options?.mode ??
			resolveMode(
				backendURL,
				initRoute,
				readPrefetchedInitialData({
					backendURL,
					initRoute,
					overrides: options?.overrides,
				}),
				config
			)
	);
	// Initial-only, like the provider's own `mode`.
	void setMode;

	return (
		<ConsentProvider
			options={{
				...options,
				__debugPkg: '@c15t/tanstack-start',
				mode,
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
};
