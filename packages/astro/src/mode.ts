/**
 * Transport selection for `@c15t/astro`.
 *
 * Astro evaluates `astro.config.mjs` at build time, but the browser boot
 * script is a string the integration injects. A transport factory cannot
 * cross that boundary, so the integration takes a plain descriptor and both
 * sides turn it into a {@link ProviderTransportFactory} themselves.
 */

import { createHostedTransport, custom, hosted } from '@c15t/core';
import type {
	KernelTransport,
	ProviderTransportContext,
	ProviderTransportFactory,
} from '@c15t/core';

import type {
	C15tHostedDescriptor,
	C15tManifestDescriptor,
	C15tModeDescriptor,
	C15tOfflineDescriptor,
} from './types';

/**
 * Talk to a c15t backend over HTTP.
 *
 * @param options - Backend URL and request options.
 * @returns A serializable hosted-mode descriptor.
 * @example
 * ```ts
 * import { c15t, hosted } from '@c15t/astro';
 *
 * export default defineConfig({
 *   integrations: [c15t({ mode: hosted({ url: 'https://consent.example.com' }) })],
 * });
 * ```
 */
export const hostedMode = function hostedMode(
	options: Omit<C15tHostedDescriptor, 'type'>
): C15tHostedDescriptor {
	return { ...options, type: 'hosted' };
};

/**
 * Resolve policies locally with no backend.
 *
 * @param options - Explicit policy rules to resolve against.
 * @returns A serializable offline-mode descriptor.
 * @example
 * ```ts
 * c15t({ mode: offline() })
 * ```
 */
export const offlineMode = function offlineMode(
	options: Omit<C15tOfflineDescriptor, 'type'> = {}
): C15tOfflineDescriptor {
	return { ...options, type: 'offline' };
};

/**
 * Resolve `/init` from a cached consent manifest.
 *
 * The server resolves it in-process; the browser goes through the injected
 * `/api/c15t/init` route, so no manifest or translation bundle reaches the
 * client.
 *
 * @param options - Manifest URL, inline manifest, or backend URL.
 * @returns A serializable manifest-mode descriptor.
 * @example
 * ```ts
 * c15t({ mode: manifest({ backendURL: 'https://your-project.inth.app' }) })
 * ```
 */
export const manifestMode = function manifestMode(
	options: Omit<C15tManifestDescriptor, 'type'> = {}
): C15tManifestDescriptor {
	return { ...options, type: 'manifest' };
};

/**
 * Resolve explicit policy rules through the shared offline transport.
 *
 * The transport and the recommended rule pack load on the first init. The
 * page script resolves the mode at runtime, so a static import would ship
 * both to every hosted and manifest site, where they never run. An offline
 * page the server already resolved never inits, so it never loads them
 * either. Saves need nothing from the chunk: offline mode has no server to
 * acknowledge them.
 */
const createOfflineFactory = (
	descriptor: C15tOfflineDescriptor
): ProviderTransportFactory =>
	Object.assign(
		(context: ProviderTransportContext): KernelTransport => {
			let loading: Promise<KernelTransport> | undefined;
			const load = function load(): Promise<KernelTransport> {
				loading ??= (async () => {
					try {
						const { createOfflineTransport } = await import('./offline-mode');
						return createOfflineTransport({
							iabEnabled: context.iabEnabled,
							policyRules: descriptor.policyRules ?? context.policyRules,
							translations: context.translations,
						});
					} catch (error) {
						// Let the kernel's retry make a fresh import attempt.
						loading = undefined;
						throw error;
					}
				})();
				return loading;
			};
			return {
				async init(ctx) {
					const transport = await load();
					return (await transport.init?.(ctx)) ?? {};
				},
				save: (payload) =>
					Promise.resolve({ ok: true, subjectId: payload.subjectId }),
			};
		},
		{ kind: 'offline' as const }
	);

/** Where the browser reaches manifest-resolved init data. */
export interface ManifestClientEndpoints {
	/** Route that returns a resolved `InitOutput`. */
	initPath: string;
	/** Backend base URL used for `POST /subjects`. */
	backendURL?: string;
}

/**
 * Turn a mode descriptor into the transport factory a kernel needs.
 *
 * `manifest` resolves through `endpoints.initPath` so the browser never
 * downloads a manifest or the full translation catalogue. Server code that
 * wants in-process manifest resolution uses
 * `createServerManifestFactory` from `@c15t/astro/server` instead.
 *
 * @param descriptor - The serialized mode descriptor.
 * @param endpoints - Route paths used by `manifest` mode.
 * @returns A transport factory for `createConsentKernel`.
 * @throws {Error} When the descriptor carries an unknown `type`.
 */
export const resolveTransportFactory = function resolveTransportFactory(
	descriptor: C15tModeDescriptor,
	endpoints: ManifestClientEndpoints = { initPath: '/api/c15t/init' }
): ProviderTransportFactory {
	if (descriptor.type === 'hosted') {
		return hosted({
			backendURL: descriptor.url,
			domain: descriptor.domain,
			headers: descriptor.headers,
		});
	}
	if (descriptor.type === 'offline') {
		return createOfflineFactory(descriptor);
	}
	if (descriptor.type === 'manifest') {
		// The injected route already resolved the manifest, so the browser
		// reads init from it and posts consent straight to the backend.
		const base = endpoints.initPath.replace(/\/init$/u, '');
		const backendURL = endpoints.backendURL ?? descriptor.backendURL ?? base;
		const transport = createHostedTransport({
			assertDecisionInputs: true,
			backendURL,
			initURL: endpoints.initPath,
		});
		return Object.assign(() => transport, { kind: 'hosted' as const });
	}
	throw new Error(
		`@c15t/astro: unknown mode ${JSON.stringify((descriptor as { type: string }).type)}. Use hosted(), offline() or manifest().`
	);
};

/** Escape hatch for a caller-supplied transport. */
export { custom };
