'use client';

import type { KernelOverrides, KernelTransport, Vendor } from '@c15t/core';
import type { Script } from '@c15t/core/modules/script-loader';
import { preloadScriptLoaderWith } from '@c15t/core/runtime/script-loader-preload';
import { resolveStreamedInit } from '@c15t/core/runtime/streamed-init';
/**
 * Client root for the TanStack Start adapter.
 *
 * Receives the visitor's `ConsentState` from the root route loader, resolved
 * or as a pending promise the loader streams, and forwards it to the React
 * provider as `options.prefetch`. Kernel creation, persistence, init, and
 * module wiring live in `@c15t/react`.
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
import { initURLFor } from './libs/route-prefix';
import type { ConsentState } from './server';

export interface ConsentRootProps {
	/**
	 * The visitor's consent state produced server-side by `resolveConsent()`
	 * (or `createConsentStateHandler()`) from `@c15t/tanstack-start/server`,
	 * usually read back with `Route.useLoaderData()`. Serializable JSON.
	 *
	 * A pending promise is fine too. Return it unawaited from the root
	 * loader (`loader: () => ({ consent: getConsentState() })`) and TanStack
	 * Router streams it: the response starts without waiting for the
	 * backend, and the banner mounts once the promise resolves after
	 * hydration instead of being in the server HTML. Until then no category
	 * is granted, so gated scripts and embeds stay blocked.
	 */
	state: ConsentState | Promise<ConsentState>;

	/**
	 * Backend base URL. When provided, the provider uses hosted mode and
	 * auto-runs init. Consent saves go to `${backendURL}/subjects`, and init
	 * to `${backendURL}/init` unless {@link ConsentRootProps.routePrefix} is
	 * set.
	 *
	 * Without the proxy this is the c15t backend itself, for example
	 * `https://consent.example.com`. With
	 * `createConsentServerRoute({ backendURL: 'https://consent.example.com', proxy: true })`
	 * mounted, pass the route prefix instead, `"/api/c15t"`, so saves stay
	 * same-origin and reach the backend through the proxy, and set
	 * `routePrefix` to the same path. The route factory still needs the
	 * absolute backend URL, and so does the server-side `resolveConsent()`
	 * (`createConsentStateHandler({ backendURL })`): with `routePrefix` set,
	 * it never fetches a URL under the prefix and returns the cookie-only
	 * state instead.
	 */
	backendURL?: string;

	/**
	 * Where `createConsentServerRoute()` is mounted, such as `"/api/c15t"`
	 * for `src/routes/api/c15t/$.ts`. When set, the browser gets init from
	 * `${routePrefix}/init`, which the route resolves in-process from the
	 * cached manifest, and saves assert the resolved decision inputs, so the
	 * backend rejects a save made against a stale policy instead of
	 * recording it.
	 *
	 * Unset, the browser gets init from `${backendURL}/init`. Same option
	 * and default as Next.js `defineConsentConfig({ routePrefix })`. Pass the
	 * same value to `createConsentStateHandler()` or `resolveConsent()`.
	 */
	routePrefix?: string;

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
		| '__preloadScriptLoader'
		| '__resolveStreamedInit'
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

const isPromiseLike = function isPromiseLike(
	value: ConsentState | PromiseLike<ConsentState>
): value is PromiseLike<ConsentState> {
	return typeof (value as PromiseLike<ConsentState>).then === 'function';
};

const resolveMode = function resolveMode(
	backendURL: string | undefined,
	routePrefix: string | undefined,
	initialData: ReturnType<typeof readPrefetchedInitialData>,
	state: ConsentState | undefined,
	overrides: KernelOverrides | undefined
): ProviderTransportFactory {
	if (!backendURL) {
		return lazyOffline();
	}
	const initURL = initURLFor(routePrefix);
	if (!initURL) {
		return hosted({ initialData, url: backendURL });
	}
	return hosted({
		assertDecisionInputs: true,
		// The server-rendered banner is interactive before the client init
		// resolves; the prefetched decision binds any save made in between.
		// A streamed state renders no banner before it resolves, and the
		// saves made after that carry the decision the kernel applied.
		decisionInputs: decisionInputsFromConfig(state, overrides),
		initURL,
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
 *
 * @example
 * ```tsx
 * // Stream the page without waiting for the consent backend.
 * export const Route = createRootRoute({
 *   ...consentLoaderOptions,
 *   loader: () => ({ consent: getConsentState() }),
 *   component: RootComponent,
 * });
 *
 * function RootComponent() {
 *   const { consent } = Route.useLoaderData();
 *   return (
 *     <ConsentRoot state={consent} backendURL="https://consent.example.com">
 *       <Outlet />
 *     </ConsentRoot>
 *   );
 * }
 * ```
 */
export const ConsentRoot = ({
	state,
	backendURL,
	routePrefix,
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
				routePrefix,
				readPrefetchedInitialData({
					backendURL,
					overrides: options?.overrides,
					routePrefix,
				}),
				isPromiseLike(state) ? undefined : state,
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
				// A returning visitor's state often lets a script run. Start the
				// script loader's download during the first render, not after
				// hydration, a round trip later.
				__preloadScriptLoader: preloadScriptLoaderWith,
				// `state` is often a promise the server streams in. Apply it
				// with code from the first-load chunk: loading that code after
				// hydration would hold the banner back by a round trip.
				__resolveStreamedInit: resolveStreamedInit,
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
