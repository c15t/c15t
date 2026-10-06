'use client';

import type { KernelTransport, Vendor } from '@c15t/core';
import type { Script } from '@c15t/core/modules/script-loader';
import { resolveStreamedInit } from '@c15t/core/runtime/streamed-init';
/**
 * Client root for the Next.js adapter.
 *
 * Receives the visitor's `ConsentState` from a Server Component and forwards
 * it to the React provider as `options.prefetch`. Kernel creation,
 * persistence, init, and module wiring live in `@c15t/react`.
 */
import { custom } from '@c15t/react';
import type { ProviderTransportFactory } from '@c15t/react';
import type {
	UseNetworkBlockerOptions,
	UsePersistenceOptions,
	UseScriptLoaderOptions,
} from '@c15t/react/module-hooks';
import { ConsentProvider } from '@c15t/react/provider';
import type { ConsentProviderOptions } from '@c15t/react/provider';
import { useState } from 'react';
import type { ReactNode } from 'react';

import type { ConsentConfig } from './config';
import {
	createLazyManifestTransport,
	lazyHosted,
} from './lazy-manifest-transport';
import { preloadScriptLoader } from './script-loader-preload';
import type { ConsentState } from './types';

export interface ConsentRootProps {
	/**
	 * The visitor's resolved consent state, produced server-side by
	 * `resolveConsent()` from `@c15t/nextjs/server`. Serializable JSON; a
	 * promise is fine, the provider awaits it.
	 */
	state: ConsentState | Promise<ConsentState>;

	/**
	 * Backend base URL (e.g. `/api/c15t` or `https://consent.example.com`).
	 * When provided, the provider uses hosted mode and auto-runs init.
	 * Overrides `config.backendURL`.
	 */
	backendURL?: string;

	/**
	 * A `defineConsentConfig` result. Picks the transport when
	 * `options.mode` is not set:
	 *
	 * - `initURL` set: hosted mode with init fetched from that same-origin
	 *   route (the handlers' `GET`, which resolves the cached manifest with
	 *   the request's geo) and saves posted to `${backendURL}/subjects`.
	 * - Otherwise `manifestURL` set: the manifest transport, resolving init
	 *   in the browser from that route. The resolver loads on first init so
	 *   it stays out of the initial bundle.
	 * - Otherwise: hosted mode against `backendURL`.
	 */
	config?: ConsentConfig;

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

const resolveMode = function resolveMode(input: {
	backendURL: string | undefined;
	config: ConsentConfig | undefined;
	manifestTransport: KernelTransport | undefined;
	mode: ProviderTransportFactory | undefined;
}): ProviderTransportFactory {
	if (input.mode) {
		return input.mode;
	}
	if (!input.backendURL) {
		return lazyOffline();
	}
	if (input.config?.initURL) {
		return lazyHosted({
			assertDecisionInputs: true,
			initURL: input.config.initURL,
			url: input.backendURL,
		});
	}
	if (input.manifestTransport) {
		return custom(input.manifestTransport);
	}
	return lazyHosted({ url: input.backendURL });
};

/**
 * Mounts the consent provider for a Next.js app. Render it once, near the
 * top of the tree, from a `'use client'` wrapper that imports the
 * `defineConsentConfig` result itself. A Server Component passes only the
 * `state` it resolved through `resolveConsent()`: the config carries a
 * symbol brand, which React cannot serialize across the server/client
 * boundary.
 *
 * @example
 * ```tsx
 * // components/consent.tsx
 * 'use client';
 * import { ConsentRoot } from '@c15t/nextjs';
 * import type { ConsentRootProps } from '@c15t/nextjs';
 * import { consentConfig } from '@/c15t.config';
 *
 * export function Consent({ children, state }: {
 *   children: React.ReactNode;
 *   state: ConsentRootProps['state'];
 * }) {
 *   return (
 *     <ConsentRoot state={state} config={consentConfig}>
 *       {children}
 *     </ConsentRoot>
 *   );
 * }
 *
 * // app/layout.tsx (Server Component)
 * import { resolveConsent } from '@c15t/nextjs/server';
 * import { consentConfig } from '@/c15t.config';
 * import { Consent } from '@/components/consent';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <Consent state={resolveConsent({ config: consentConfig })}>
 *           {children}
 *         </Consent>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export const ConsentRoot = ({
	state,
	backendURL,
	config,
	scripts,
	vendors,
	scriptLoader,
	clearOnRevocation,
	networkBlocker,
	persistence,
	options,
	children,
}: ConsentRootProps) => {
	// Initial-only, like the provider's own `mode`. A new one on every
	// render would make each rerender load the runtime's update module.
	const [mode, setMode] = useState(() => {
		// Before hydration finishes: the provider would load it from its
		// mount effect, a round trip later.
		preloadScriptLoader(state, scripts, options);
		const resolvedBackendURL = backendURL ?? config?.backendURL;
		const manifestURL =
			config?.initURL || !resolvedBackendURL ? undefined : config?.manifestURL;
		return resolveMode({
			backendURL: resolvedBackendURL,
			config,
			manifestTransport:
				resolvedBackendURL && manifestURL
					? createLazyManifestTransport({
							backendURL: resolvedBackendURL,
							manifestURL,
						})
					: undefined,
			mode: options?.mode,
		});
	});
	void setMode;

	return (
		<ConsentProvider
			options={{
				...options,
				__debugPkg: '@c15t/nextjs',
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
