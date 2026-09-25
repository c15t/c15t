'use client';

import type { KernelOverrides, KernelTransport, Vendor } from '@c15t/core';
import type { Script } from '@c15t/core/modules/script-loader';
/**
 * Client root for the TanStack Start adapter.
 *
 * Receives the visitor's resolved `ConsentState` from the root route loader
 * and forwards it to the React provider as `options.prefetch`. Kernel
 * creation, persistence, init, and module wiring live in `@c15t/react`.
 *
 * The state must travel through loader data (or a server function
 * result), never through module state: the server and the client each
 * create their own kernel from the same serialized value, which is what
 * keeps the first paint and the hydrated tree identical.
 */
import { hosted } from '@c15t/react';
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
import type { ConsentState } from './server';

/**
 * Same-origin route that resolves init from the cached manifest. Matches the
 * splat route `createConsentServerRoute()` serves under `/api/c15t/$`.
 */
export const DEFAULT_INIT_ROUTE = '/api/c15t/init';

export interface ConsentRootProps {
	/**
	 * The visitor's consent state produced server-side by `resolveConsent()`
	 * (or `createConsentStateHandler()`) from `@c15t/tanstack-start/server`,
	 * usually read back with `Route.useLoaderData()`. Serializable JSON.
	 */
	state: ConsentState;

	/**
	 * Backend base URL. When provided, the provider uses hosted mode and
	 * auto-runs init. Consent saves go to `${backendURL}/subjects`; init goes
	 * to {@link ConsentRootProps.initRoute}.
	 *
	 * Without the proxy this is the c15t backend itself, for example
	 * `https://consent.example.com`. With
	 * `createConsentServerRoute({ proxy: true })` mounted, pass the route
	 * prefix instead, `"/api/c15t"`, so saves stay same-origin and reach the
	 * backend through the proxy. The server-side `resolveConsent()`
	 * (`createConsentStateHandler({ backendURL })`) must still receive the
	 * absolute backend URL, usually from `C15T_BACKEND_URL`: its self-route
	 * guard skips a relative `/api/c15t` and returns the cookie-only state.
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
	 * Vendors the preference center lists under their category, each with
	 * its own switch, so a visitor can grant a category and still turn one
	 * vendor off. Scripts, network rules and iframes naming a vendor's
	 * `id` follow that choice. Merged with vendors the backend declares.
	 * See the granular consent guide.
	 */
	vendors?: Vendor[];

	/**
	 * Remove configured browser data for initially denied categories after policy
	 * resolution and when consent is later revoked.
	 * Initial-only: remount ConsentRoot to replace the cleanup configuration.
	 */
	clearOnRevocation?: ConsentProviderOptions['clearOnRevocation'];

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
		| 'clearOnRevocation'
		| 'networkBlocker'
		| 'persistence'
		| 'prefetch'
		| 'scriptLoader'
		| 'scripts'
		| 'vendors'
		| '__debugPkg'
	> & {
		mode?: ProviderTransportFactory;
	};

	children: ReactNode;
}

/**
 * Offline mode that loads `offline()` on first init. `offline()` carries
 * the recommended policy-rule pack, so a static import would ship that pack
 * to every app that renders the root with a backend URL, where it never runs.
 */
const lazyOffline = function lazyOffline(): ProviderTransportFactory {
	return Object.assign(
		(context: Parameters<ProviderTransportFactory>[0]): KernelTransport => {
			let transportPromise: Promise<KernelTransport> | undefined;
			const load = function load(): Promise<KernelTransport> {
				transportPromise ??= (async () => {
					try {
						const { offline } = await import('./offline-mode');
						return offline()(context);
					} catch (error) {
						// Let the kernel's retry make a fresh import attempt.
						transportPromise = undefined;
						throw error;
					}
				})();
				return transportPromise;
			};
			return {
				async init(ctx) {
					const transport = await load();
					return (await transport.init?.(ctx)) ?? {};
				},
			};
		},
		{ kind: 'offline' as const }
	);
};

const resolveMode = function resolveMode(
	backendURL: string | undefined,
	initRoute: string | false | undefined,
	initialData: ReturnType<typeof readPrefetchedInitialData>,
	state: ConsentState | undefined,
	overrides: KernelOverrides | undefined
): ProviderTransportFactory {
	if (!backendURL) {
		return lazyOffline();
	}
	if (initRoute === false) {
		return hosted({ initialData, url: backendURL });
	}
	return hosted({
		assertDecisionInputs: true,
		// The server-rendered banner is interactive before the client init
		// resolves; the prefetched decision binds any save made in between.
		decisionInputs: decisionInputsFromConfig(state, overrides),
		initURL: initRoute ?? DEFAULT_INIT_ROUTE,
		initialData,
		url: backendURL,
	});
};

/**
 * Wraps the app in a consent provider seeded with the server-resolved state.
 *
 * @example
 * ```tsx
 * // src/routes/__root.tsx
 * import { ConsentRoot } from '@c15t/tanstack-start';
 *
 * function RootComponent() {
 *   const state = Route.useLoaderData();
 *   return (
 *     <ConsentRoot
 *       state={state}
 *       backendURL="https://consent.example.com"
 *     >
 *       <Outlet />
 *     </ConsentRoot>
 *   );
 * }
 * ```
 */
export const ConsentRoot = ({
	state,
	backendURL,
	initRoute,
	scripts,
	vendors,
	scriptLoader,
	clearOnRevocation,
	networkBlocker,
	persistence,
	options,
	children,
}: ConsentRootProps) => {
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
				state,
				options?.overrides
			)
	);
	// Initial-only, like the provider's own `mode`.
	void setMode;

	return (
		<ConsentProvider
			options={{
				...options,
				__debugPkg: '@c15t/tanstack-start',
				clearOnRevocation,
				mode,
				networkBlocker,
				persistence,
				prefetch: state,
				scriptLoader,
				scripts,
				vendors,
			}}
		>
			{children}
		</ConsentProvider>
	);
};
