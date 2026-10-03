/**
 * The transport wrapper behind a streamed `prefetch`: the first `init()`
 * waits for the prefetch promise and is answered from it.
 *
 * `streamPrefetch` pairs it with the resolver imported statically;
 * {@link lazyStreamPrefetch} imports the resolver only for a runtime whose
 * prefetch is a promise, so a provider that rarely streams keeps it out of
 * its first-load chunk.
 */
import { kernelConfigToInitResponse } from '../transports/init-output';
import type {
	ProviderTransportContext,
	ProviderTransportFactory,
} from '../transports/mode';
import type {
	ConsentKernel,
	InitResponse,
	KernelConfig,
	KernelTransport,
} from '../types';
import type { StreamedInitOptions } from './streamed-init';
import type { ConsentProviderRuntimeOptions, RuntimePrefetch } from './types';

type ResolveStreamedInit = (
	options: StreamedInitOptions
) => Promise<InitResponse>;

/**
 * Wrap a `mode` factory so its transport's first `init()` goes through
 * the resolver `loadResolver` returns. The transport context reports the
 * resolved config from then on, so a transport that reads it at init time
 * (offline's detected `Accept-Language`) sees the server's values rather
 * than the placeholder.
 *
 * @internal
 */
export const createStreamedMode = function createStreamedMode(
	mode: ProviderTransportFactory,
	prefetch: PromiseLike<RuntimePrefetch>,
	options: Pick<ConsentProviderRuntimeOptions, 'experiment' | 'overrides'>,
	getKernel: () => ConsentKernel | undefined,
	loadResolver: () => ResolveStreamedInit | Promise<ResolveStreamedInit>
): ProviderTransportFactory {
	const factory = (context: ProviderTransportContext): KernelTransport => {
		let resolved: KernelConfig | undefined;
		const transport = mode({
			...context,
			get prefetch() {
				return resolved ?? context.prefetch;
			},
		});
		let used = false;
		return {
			...transport,
			async init(initContext) {
				if (used) {
					return (await transport.init?.(initContext)) ?? {};
				}
				used = true;
				const kernel = getKernel() ?? null;
				// Read before any await: a clear that lands while the
				// prefetch streams must win over the records it carries.
				const recordsGeneration = kernel?.getRecordsGeneration();
				const resolveInit = await loadResolver();
				return resolveInit({
					context: initContext,
					kernel,
					onResolved: (config) => {
						resolved = config;
					},
					overrides: options.overrides,
					prefetch,
					recordsGeneration,
					runsExperiment: options.experiment !== undefined,
					toInitResponse: kernelConfigToInitResponse,
					transport,
				});
			},
		};
	};
	return Object.assign(factory, { kind: mode.kind });
};

/**
 * `streamPrefetch` whose resolver loads on demand.
 *
 * The provider runtime calls it only when `prefetch` is a promise, and the
 * import starts then, at construction, so it overlaps the wait for the
 * server's result. A runtime with a ready prefetch, or none, never loads
 * it. Pass it as `streamPrefetch` in `createConsentProviderRuntime`'s
 * modules.
 *
 * @param mode - The runtime's transport factory.
 * @param prefetch - The pending prefetch.
 * @param options - The runtime's `overrides` and `experiment`.
 * @param getKernel - The kernel being initialized, once it exists.
 * @returns A transport factory of the same kind.
 */
export const lazyStreamPrefetch = function lazyStreamPrefetch(
	mode: ProviderTransportFactory,
	prefetch: PromiseLike<RuntimePrefetch>,
	options: Pick<ConsentProviderRuntimeOptions, 'experiment' | 'overrides'>,
	getKernel: () => ConsentKernel | undefined
): ProviderTransportFactory {
	const loading = import('./streamed-init');
	return createStreamedMode(
		mode,
		prefetch,
		options,
		getKernel,
		async () => (await loading).resolveStreamedInit
	);
};
