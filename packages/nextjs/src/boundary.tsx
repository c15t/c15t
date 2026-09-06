'use client';

import type { KernelConfig, KernelTransport } from '@c15t/core';
import type { Script } from '@c15t/core/modules/script-loader';
/**
 * Client boundary for the Next.js adapter.
 *
 * Receives a plain `KernelConfig` from a Server Component and forwards it
 * to the React provider as `options.prefetch`. Kernel creation,
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

export interface ConsentBoundaryProps {
	/**
	 * Kernel configuration produced server-side by
	 * `readInitialConsentConfig()` or `prefetchInitialConsent()` from
	 * `@c15t/nextjs/server`. Serializable JSON.
	 */
	config: KernelConfig | Promise<KernelConfig>;

	/**
	 * Backend base URL (e.g. `/api/c15t` or `https://consent.example.com`).
	 * When provided, the provider uses hosted mode and auto-runs init.
	 * Overrides `consent.backendURL`.
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
	consent?: ConsentConfig;

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
 * boundary, manifest mode or not.
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
		async init(ctx) {
			const transport = await load();
			return (await transport.init?.(ctx)) ?? {};
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
	consent: ConsentConfig | undefined;
	manifestTransport: KernelTransport | undefined;
	mode: ProviderTransportFactory | undefined;
}): ProviderTransportFactory {
	if (input.mode) {
		return input.mode;
	}
	if (!input.backendURL) {
		return offline();
	}
	if (input.consent?.initURL) {
		return hosted({
			assertDecisionInputs: true,
			initURL: input.consent.initURL,
			url: input.backendURL,
		});
	}
	if (input.manifestTransport) {
		return custom(input.manifestTransport);
	}
	return hosted({ url: input.backendURL });
};

export const ConsentBoundary = ({
	config,
	backendURL,
	consent,
	scripts,
	scriptLoader,
	networkBlocker,
	persistence,
	options,
	children,
}: ConsentBoundaryProps) => {
	const resolvedBackendURL = backendURL ?? consent?.backendURL;
	const manifestURL =
		consent?.initURL || !resolvedBackendURL ? undefined : consent?.manifestURL;
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
		consent,
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
				prefetch: config,
				scriptLoader,
				scripts,
			}}
		>
			{children}
		</ConsentProvider>
	);
};
