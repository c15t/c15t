import {
	createHostedInitRequest,
	createHostedRecordTransport,
	hasPrefetchedInitialData,
} from '@c15t/core';
import type {
	HostedInitRequest,
	InitContext,
	KernelTransport,
	ProviderTransportFactory,
} from '@c15t/core';

import type { ConsentConfig } from './config';

/** Where `ConsentRoot` resolves init and posts saves in manifest mode. */
export type ManifestModeOptions = Pick<ConsentConfig, 'backendURL'> & {
	manifestURL: string;
};

/**
 * Loads the transport that resolves init from the manifest.
 *
 * @internal
 */
export type LoadManifestTransport = (
	options: ManifestModeOptions
) => Promise<KernelTransport>;

/**
 * Loads the transport that runs init, given the context of the init that
 * triggered the load. Called at most once per successful load; a rejected
 * load is retried on the next init.
 *
 * @internal
 */
export type LoadInitTransport = (ctx: InitContext) => Promise<KernelTransport>;

/**
 * Loads `@c15t/core/transports/manifest-browser` on first use. The resolver
 * would otherwise land in the client bundle of every app that renders the
 * root, manifest mode or not.
 */
const loadManifestTransport: LoadManifestTransport =
	async function loadManifestTransport(options) {
		const { createBrowserManifestTransport } =
			await import('@c15t/core/transports/manifest-browser');
		return createBrowserManifestTransport(options);
	};

/**
 * A transport that loads its init path only when init runs.
 *
 * Saves, identity links and subject reads use the same
 * backend routes and request bodies in the hosted and manifest transports.
 * Those transports differ only after their own init remembers decision
 * inputs. When the server already resolved the visitor's state there is no
 * client init, and the kernel's decision inputs on the save payload are the
 * whole policy assertion, so those requests go out through the record
 * transport without waiting for a chunk.
 *
 * @param records - Record transport used until init starts.
 * @param load - Loads the transport that runs init.
 * @returns A kernel transport.
 * @internal
 */
export const createLazyInitTransport = function createLazyInitTransport(
	records: KernelTransport,
	load: LoadInitTransport
): KernelTransport {
	let transportPromise: Promise<KernelTransport> | undefined;
	const resolver = function resolver(
		ctx: InitContext
	): Promise<KernelTransport> {
		transportPromise ??= (async () => {
			try {
				return await load(ctx);
			} catch (error) {
				// A failed chunk load must not poison every later init/save;
				// the kernel's retry gets a fresh import attempt.
				transportPromise = undefined;
				throw error;
			}
		})();
		return transportPromise;
	};
	// Once init has started loading its transport, keep every request on it
	// so saves carry the decision inputs that init remembered.
	const recordTransport =
		async function recordTransport(): Promise<KernelTransport> {
			return transportPromise ? await transportPromise : records;
		};

	return {
		async identify(user, subjectId) {
			await (await recordTransport()).identify?.(user, subjectId);
		},
		async init(ctx) {
			const transport = await resolver(ctx);
			return (await transport.init?.(ctx)) ?? {};
		},
		async loadSubjectRecord(subjectId) {
			return (
				(await (await recordTransport()).loadSubjectRecord?.(subjectId)) ?? null
			);
		},
		async save(payload) {
			const transport = await recordTransport();
			if (!transport.save) {
				throw new Error('@c15t/nextjs: the init transport cannot save.');
			}
			return await transport.save(payload);
		},
	};
};

/**
 * Manifest transport for `ConsentRoot` that loads the resolver only when
 * the browser has to resolve init itself.
 *
 * @param options - Backend and manifest URLs.
 * @param load - Loads the resolving transport. Defaults to a dynamic import.
 * @returns A kernel transport.
 * @internal
 */
export const createLazyManifestTransport = function createLazyManifestTransport(
	options: ManifestModeOptions,
	load: LoadManifestTransport = loadManifestTransport
): KernelTransport {
	return createLazyInitTransport(
		createHostedRecordTransport({ backendURL: options.backendURL }),
		() => load(options)
	);
};

interface LazyHostedOptions {
	/** Backend URL for saves, and for `GET /init` without `initURL`. */
	url: string;
	/** Same-origin route that resolves init. */
	initURL?: string;
	/** Assert the resolved decision on saves. */
	assertDecisionInputs?: boolean;
}

/**
 * Loads the full hosted transport, whose init path (request-context headers,
 * the inline-prefetch reader and the init-response mapper) a server-resolved
 * root never runs.
 */
const loadHostedTransport = async function loadHostedTransport(
	options: LazyHostedOptions & { fetch?: typeof globalThis.fetch }
): Promise<KernelTransport> {
	const { createHostedTransport } = await import('./hosted-mode');
	return createHostedTransport({
		assertDecisionInputs: options.assertDecisionInputs,
		backendURL: options.url,
		fetch: options.fetch,
		initURL: options.initURL,
	});
};

/** A first `/init` request sent before the hosted transport loaded. */
interface EarlyInit {
	url: string;
	init: HostedInitRequest['init'];
	response: Promise<Response>;
}

/**
 * Sends the first init request while the hosted transport's chunk loads,
 * so the chunk and `/init` travel in the same round trip instead of one
 * after the other. The request is the one the loaded transport builds.
 * Skipped on the server, without `fetch`, and when an inline prefetch
 * script already requested init, which the loaded transport reads instead.
 */
const startEarlyInit = function startEarlyInit(
	options: LazyHostedOptions,
	fetch: typeof globalThis.fetch | undefined,
	ctx: InitContext
): EarlyInit | undefined {
	if (
		typeof window === 'undefined' ||
		!fetch ||
		(!options.initURL && hasPrefetchedInitialData())
	) {
		return undefined;
	}
	// Carries the journey as the loaded transport does, so that transport's
	// first request still matches this one and takes its response.
	const request = createHostedInitRequest({
		backendURL: options.url,
		initURL: options.initURL,
		journey: ctx.journey,
		overrides: ctx.overrides,
	});
	const response = fetch(request.url, request.init);
	// If the loaded transport sends a different first request, nothing reads
	// this one; its failure is not an unhandled rejection.
	void (async () => {
		try {
			await response;
		} catch {
			// The transport that reads the response reports the failure.
		}
	})();
	return { init: request.init, response, url: request.url };
};

const isSameRequest = function isSameRequest(
	early: EarlyInit,
	input: Parameters<typeof globalThis.fetch>[0],
	init: RequestInit | undefined
): boolean {
	return (
		input === early.url &&
		init?.method === early.init.method &&
		init?.credentials === early.init.credentials &&
		JSON.stringify(init?.headers) === JSON.stringify(early.init.headers)
	);
};

/**
 * Hands the early response to the loaded transport's first request that
 * matches it exactly; every other request goes out through `fetch`.
 */
const withEarlyInit = function withEarlyInit(
	fetch: typeof globalThis.fetch,
	early: EarlyInit
): typeof globalThis.fetch {
	let pending: EarlyInit | undefined = early;
	const fetchWithEarlyInit = (
		input: Parameters<typeof globalThis.fetch>[0],
		init?: RequestInit
	): Promise<Response> => {
		if (pending && isSameRequest(pending, input, init)) {
			const { response } = pending;
			pending = undefined;
			return response;
		}
		return fetch(input, init);
	};
	return fetchWithEarlyInit as typeof globalThis.fetch;
};

/**
 * Hosted mode for `ConsentRoot`. Saves and the other record requests go
 * out at once through the record transport; the init path loads on the
 * first init, which a root with server-resolved state only runs when the
 * provider re-initializes. That first init's `/init` request goes out
 * alongside the chunk request, and the loaded transport reads its response.
 *
 * With `assertDecisionInputs`, a save that carries no decision inputs of its
 * own is refused until init resolved a decision, as in the full transport.
 * Both halves use the `fetch` that was global when the transport was
 * created, as the full transport does.
 *
 * @param options - Backend URL and, for same-origin init, `initURL` with
 *   `assertDecisionInputs`.
 * @param load - Loads the full hosted transport. Defaults to a dynamic import.
 * @returns A provider transport factory reporting `kind: 'hosted'`.
 * @internal
 */
export const lazyHosted = function lazyHosted(
	options: LazyHostedOptions,
	load: (
		options: LazyHostedOptions & { fetch?: typeof globalThis.fetch }
	) => Promise<KernelTransport> = loadHostedTransport
): ProviderTransportFactory {
	return Object.assign(
		(): KernelTransport => {
			const fetch = globalThis.fetch?.bind(globalThis);
			return createLazyInitTransport(
				createHostedRecordTransport(
					{ backendURL: options.url, fetch },
					options.assertDecisionInputs
						? {
								inputs: () => undefined,
								pending: () => undefined,
								required: true,
							}
						: undefined
				),
				(ctx) => {
					const early = startEarlyInit(options, fetch, ctx);
					return load({
						...options,
						fetch: early && fetch ? withEarlyInit(fetch, early) : fetch,
					});
				}
			);
		},
		{ kind: 'hosted' as const }
	);
};
