/**
 * The first `init()` of a runtime whose `prefetch` was a promise.
 *
 * A host that streams its prefetch passes `streamPrefetch` (this code
 * imported statically) or `lazyStreamPrefetch` (imported once a prefetch is
 * a promise) in the provider runtime's modules; one that never does ships
 * none of this. A provider shared by both kinds of host imports this module
 * through `@c15t/core/runtime/streamed-init` and wraps it with
 * `streamPrefetchWith` where it streams: the Next.js and TanStack Start
 * roots do, through the React provider.
 *
 * - A config that resolves with a policy becomes the init response
 *   outright: no network request. The runtime's own `overrides` win over
 *   the server's, as they do for a ready prefetch.
 * - A config without a policy (stored records, geo, language only) is a
 *   baseline: its overrides and records are applied to the kernel, then the
 *   transport's init runs with those overrides. Records apply through
 *   hydration rather than through the init response, so a returning
 *   visitor's choice holds even when that init fails.
 * - A rejected promise is logged outside production and the transport's
 *   init runs as though there were no prefetch.
 */
import type { InternalKernel } from '../kernel/internals';
import type { kernelConfigToInitResponse } from '../transports/init-output';
import type {
	ConsentKernel,
	InitContext,
	InitResponse,
	KernelConfig,
	KernelOverrides,
	KernelTransport,
} from '../types';
import type { RuntimePrefetch } from './types';

const hasKeys = function hasKeys(value: KernelOverrides): boolean {
	return Object.keys(value).length > 0;
};

const warn = function warn(...message: unknown[]): void {
	const nodeEnv = (globalThis as { process?: { env?: { NODE_ENV?: string } } })
		.process?.env?.NODE_ENV;
	if (nodeEnv !== 'production') {
		console.warn(...message);
	}
};

/** Inputs for {@link resolveStreamedInit}. */
export interface StreamedInitOptions {
	/** The context the kernel called `init()` with. */
	context: InitContext;
	/** The kernel being initialized, once it exists. */
	kernel: ConsentKernel | null;
	/** Called with the resolved config before it is applied. */
	onResolved: (config: KernelConfig) => void;
	/** The runtime's own overrides, which win over the server's. */
	overrides: KernelOverrides | undefined;
	/** The pending prefetch. */
	prefetch: PromiseLike<RuntimePrefetch>;
	/**
	 * The kernel's records generation when `init()` started. Prefetched
	 * records only apply while it is unchanged, so a clear wins.
	 */
	recordsGeneration: number | undefined;
	/** Whether the runtime runs an experiment of its own. */
	runsExperiment: boolean;
	/** The transport to fall back to. */
	transport: KernelTransport;
	/**
	 * `kernelConfigToInitResponse`, passed in rather than imported so a
	 * resolver loaded on demand shares no module with the first-load chunk.
	 */
	toInitResponse: typeof kernelConfigToInitResponse;
}

/**
 * Wait for a streamed prefetch and turn it into the first init response.
 *
 * @param options - See {@link StreamedInitOptions}.
 * @returns The init response the kernel applies.
 * @internal
 */
export const resolveStreamedInit = async function resolveStreamedInit(
	options: StreamedInitOptions
): Promise<InitResponse> {
	const { context, kernel, overrides, transport } = options;
	let config: RuntimePrefetch;
	try {
		config = (await options.prefetch) ?? {};
	} catch (error) {
		warn('c15t: prefetch rejected; using transport init.', error);
		return transport.init?.(context) ?? {};
	}
	if (config.experiment && !options.runsExperiment) {
		warn(
			'c15t: the streamed consent state carries an experiment, but the runtime started before it arrived and runs none. Await the server result, or also pass `experiment` to the options.'
		);
	}
	options.onResolved(config);

	const response = options.toInitResponse(config, overrides);
	if (response) {
		return response;
	}

	const baseline = { ...(config.initialOverrides ?? {}), ...(overrides ?? {}) };
	if (kernel) {
		if (hasKeys(baseline)) {
			kernel.set.overrides(baseline);
		}
		if (
			config.initialRecords &&
			kernel.getRecordsGeneration() === options.recordsGeneration
		) {
			(kernel as InternalKernel).hydrate(config.initialRecords);
		}
	}
	return (
		transport.init?.({
			...context,
			overrides: { ...context.overrides, ...baseline },
		}) ?? {}
	);
};
