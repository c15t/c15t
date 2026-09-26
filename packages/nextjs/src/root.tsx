'use client';

import type { KernelTransport, Vendor } from '@c15t/core';
import type { Script } from '@c15t/core/modules/script-loader';
/**
 * Client root for the Next.js adapter.
 *
 * Receives the visitor's `ConsentState` from a Server Component and forwards
 * it to the React provider as `options.prefetch`. Kernel creation,
 * persistence, init, and module wiring live in `@c15t/react`.
 */
import { custom, hosted, offline } from '@c15t/react';
import type { ProviderTransportFactory } from '@c15t/react';
import type {
	UseNetworkBlockerOptions,
	UsePersistenceOptions,
	UseScriptLoaderOptions,
} from '@c15t/react/module-hooks';
import { ConsentProvider } from '@c15t/react/provider';
import type { ConsentProviderOptions } from '@c15t/react/provider';
import { useMemo } from 'react';
import type { ReactNode } from 'react';

import type { ConsentConfig } from './config';
import { createLazyManifestTransport } from './lazy-manifest-transport';
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
	> & {
		mode?: ProviderTransportFactory;
	};

	children: ReactNode;
}

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
		return offline();
	}
	if (input.config?.initURL) {
		return hosted({
			assertDecisionInputs: true,
			initURL: input.config.initURL,
			url: input.backendURL,
		});
	}
	if (input.manifestTransport) {
		return custom(input.manifestTransport);
	}
	return hosted({ url: input.backendURL });
};

/**
 * Mounts the consent provider for a Next.js app. Render it once, near the
 * top of the tree, with the `state` a Server Component resolved through
 * `resolveConsent()`.
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { ConsentRoot } from '@c15t/nextjs';
 * import { resolveConsent } from '@c15t/nextjs/server';
 * import { consentConfig } from '@/consent.config';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <ConsentRoot
 *           state={resolveConsent({ config: consentConfig })}
 *           config={consentConfig}
 *         >
 *           {children}
 *         </ConsentRoot>
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
	const resolvedBackendURL = backendURL ?? config?.backendURL;
	const manifestURL =
		config?.initURL || !resolvedBackendURL ? undefined : config?.manifestURL;
	const manifestTransport = useMemo(
		() =>
			resolvedBackendURL && manifestURL
				? createLazyManifestTransport({
						backendURL: resolvedBackendURL,
						manifestURL,
					})
				: undefined,
		[manifestURL, resolvedBackendURL]
	);
	const mode = resolveMode({
		backendURL: resolvedBackendURL,
		config,
		manifestTransport,
		mode: options?.mode,
	});

	return (
		<ConsentProvider
			options={{
				...options,
				__debugPkg: '@c15t/nextjs',
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
