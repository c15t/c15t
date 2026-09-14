'use client';

import type { KernelTransport } from '@c15t/core';
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

type ManifestModeOptions = Pick<ConsentConfig, 'backendURL'> & {
	manifestURL: string;
};

/**
 * Manifest transport that loads `@c15t/core/transports/manifest` on first
 * use. The resolver pulls in every translation language, so a static
 * import would land in the client bundle of every app that renders the
 * root, manifest mode or not.
 */
const loadManifestTransport = async function loadManifestTransport(
	options: ManifestModeOptions
): Promise<KernelTransport> {
	const { createManifestTransport } =
		await import('@c15t/core/transports/manifest');
	return createManifestTransport(options);
};

const createLazyManifestTransport = function createLazyManifestTransport(
	options: ManifestModeOptions
): KernelTransport {
	let transportPromise: Promise<KernelTransport> | undefined;
	const load = function load(): Promise<KernelTransport> {
		transportPromise ??= (async () => {
			try {
				return await loadManifestTransport(options);
			} catch (error) {
				// A failed chunk load must not poison every later init/save;
				// the kernel's retry gets a fresh import attempt.
				transportPromise = undefined;
				throw error;
			}
		})();
		return transportPromise;
	};

	return {
		async identify(user, subjectId) {
			await (await load()).identify?.(user, subjectId);
		},
		async init(ctx) {
			const transport = await load();
			return (await transport.init?.(ctx)) ?? {};
		},
		async loadSubjectRecord(subjectId) {
			return (await (await load()).loadSubjectRecord?.(subjectId)) ?? null;
		},
		async recordPrivacyOptOut(directive, subjectId) {
			await (await load()).recordPrivacyOptOut?.(directive, subjectId);
		},
		async save(payload) {
			const transport = await load();
			if (!transport.save) {
				throw new Error('@c15t/nextjs: manifest transport cannot save.');
			}
			return await transport.save(payload);
		},
	};
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
	scriptLoader,
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
				mode,
				networkBlocker,
				persistence,
				prefetch: state,
				scriptLoader,
				scripts,
			}}
		>
			{children}
		</ConsentProvider>
	);
};
