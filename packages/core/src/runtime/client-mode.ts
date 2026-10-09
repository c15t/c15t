import { isProductionBuild } from '../libs/is-production';
/**
 * `@c15t/core/runtime/client-mode` — turn a consent mode into the transport
 * a server-framework client root uses, keeping every path that page doesn't
 * run out of its first-load JavaScript.
 *
 * Server-framework packages (Next.js, TanStack Start, Nuxt, Astro and
 * SvelteKit) resolve the visitor's state on the server and render the
 * banner with it, so the browser usually never runs init. What first load
 * needs is what a save needs:
 *
 * - `manifest()` resolved on the server (the default) and `hosted()`
 *   statically include only the hosted record transport and the
 *   init-request builder. A re-init loads the hosted transport with
 *   `import()` and sends its first `/init` alongside the chunk request.
 * - `manifest({ resolve: 'browser' })` loads the browser resolver with
 *   `import()`, starting when the transport is built, alongside the
 *   manifest request.
 * - `offline()` loads the offline transport and its policy pack with
 *   `import()` on first init.
 *
 * No path here statically imports the resolver, a policy pack, the server
 * snapshot or any translation.
 */
import { hasPrefetchedInitialData } from '../libs/prefetch/window-key';
import type { ConsentMode, OfflineModeOptions } from '../modes';
import type * as HostedModule from '../transports/hosted';
import { createHostedInitRequest } from '../transports/hosted-init-request';
import type { HostedInitRequest } from '../transports/hosted-init-request';
import { createHostedRecordTransport } from '../transports/hosted-records';
import type * as ManifestBrowserModule from '../transports/manifest-browser';
import type { BrowserManifestOptions } from '../transports/manifest-browser';
import { createManifestRequestInit } from '../transports/manifest-request';
import type {
	ProviderTransportContext,
	ProviderTransportFactory,
	ProviderTransportKind,
} from '../transports/mode';
import type * as OfflineModule from '../transports/offline';
import type { InitContext, KernelTransport } from '../types';

/** Where a client root's transport sends requests. */
export interface ClientModeOptions {
	/**
	 * Backend URL for saves, and for `GET /init` in hosted mode. A hosted
	 * mode's own `backendURL` wins. Manifest mode falls back to
	 * `routePrefix`, for a consent route that proxies saves.
	 */
	backendURL?: string;
	/**
	 * Prefix of the app's own consent route, such as `/api/c15t`. Manifest
	 * mode re-inits through `${routePrefix}/init`, and browser resolution
	 * fetches `${routePrefix}/manifest`.
	 */
	routePrefix?: string;
}

/**
 * Loads the transport that runs init, given the context of the init that
 * triggered the load. Called at most once per successful load; a rejected
 * load is retried on the next init.
 */
export type LoadInitTransport = (ctx: InitContext) => Promise<KernelTransport>;

/** The hosted transport's module, or a stand-in for tests. */
export type LoadHostedModule = () => Promise<
	Pick<typeof HostedModule, 'createHostedTransport'>
>;

/** The offline transport's module, or a stand-in for tests. */
export type LoadOfflineModule = () => Promise<
	Pick<typeof OfflineModule, 'offline'>
>;

/** The browser resolver's module, or a stand-in for tests. */
export type LoadManifestBrowserModule = () => Promise<
	Pick<typeof ManifestBrowserModule, 'createBrowserManifestTransport'>
>;

const loadHostedModule: LoadHostedModule = () => import('../transports/hosted');
const loadOfflineModule: LoadOfflineModule = () =>
	import('../transports/offline');
const loadManifestBrowserModule: LoadManifestBrowserModule = () =>
	import('../transports/manifest-browser');

const trimSlash = function trimSlash(url: string): string {
	return url.endsWith('/') ? url.slice(0, -1) : url;
};

/**
 * A transport that loads its init path only when init runs.
 *
 * Saves, identity links and subject reads use the same backend routes and
 * request bodies in the hosted and manifest transports. Those transports
 * differ only after their own init remembers decision inputs. When the
 * server already resolved the visitor's state there is no client init, and
 * the kernel's decision inputs on the save payload are the whole policy
 * assertion, so those requests go out through the record transport without
 * waiting for a chunk.
 *
 * @param records - Record transport used until init starts.
 * @param load - Loads the transport that runs init.
 * @returns A kernel transport.
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
				throw new Error('c15t: the init transport cannot save.');
			}
			return await transport.save(payload);
		},
	};
};

/** A request sent before the transport that reads its response loaded. */
interface EarlyRequest {
	url: string;
	init: RequestInit & { headers: Record<string, string> };
	response: Promise<Response>;
}

/** Sends a request now; nothing reading it is not an unhandled rejection. */
const sendEarly = function sendEarly(
	fetch: typeof globalThis.fetch,
	url: string,
	init: EarlyRequest['init']
): EarlyRequest {
	const response = fetch(url, init);
	void (async () => {
		try {
			await response;
		} catch {
			// The transport that reads the response reports the failure.
		}
	})();
	return { init, response, url };
};

const isSameRequest = function isSameRequest(
	early: EarlyRequest,
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
const withEarlyRequest = function withEarlyRequest(
	fetch: typeof globalThis.fetch,
	early: EarlyRequest
): typeof globalThis.fetch {
	let pending: EarlyRequest | undefined = early;
	const fetchWithEarlyRequest = (
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
	return fetchWithEarlyRequest as typeof globalThis.fetch;
};

/** Options for {@link lazyHosted}. */
export interface LazyHostedOptions {
	/** Backend URL for saves, and for `GET /init` without `initURL`. */
	backendURL: string;
	/** Same-origin route that resolves init, such as `/api/c15t/init`. */
	initURL?: string;
	/** Defaults to whether `initURL` is set. */
	assertDecisionInputs?: boolean;
	/** Headers forwarded to `GET /init`. */
	headers?: Record<string, string>;
	/** Kind reported through `window.c15t.mode`. Defaults to `'hosted'`. */
	kind?: ProviderTransportKind;
}

/**
 * Sends the first init request while the hosted transport's chunk loads,
 * so the chunk and `/init` travel in the same round trip. The request is
 * the one the loaded transport builds. Skipped on the server, without
 * `fetch`, with init headers (the loaded transport filters them), and when
 * an inline prefetch script already requested init, which the loaded
 * transport reads instead.
 */
const startEarlyInit = function startEarlyInit(
	options: LazyHostedOptions,
	fetch: typeof globalThis.fetch | undefined,
	ctx: InitContext
): EarlyRequest | undefined {
	if (
		typeof window === 'undefined' ||
		!fetch ||
		(options.headers && Object.keys(options.headers).length > 0) ||
		(!options.initURL && hasPrefetchedInitialData())
	) {
		return undefined;
	}
	// Carries the journey as the loaded transport does, so that transport's
	// first request still matches this one and takes its response.
	const request: HostedInitRequest = createHostedInitRequest({
		backendURL: options.backendURL,
		initURL: options.initURL,
		journey: ctx.journey,
		overrides: ctx.overrides,
	});
	return sendEarly(fetch, request.url, request.init);
};

/**
 * Hosted transport for a client root. Saves and the other record requests
 * go out at once through the record transport; the init path loads on the
 * first init, which a root with server-resolved state only runs when the
 * provider re-initializes. That first init's `/init` request goes out
 * alongside the chunk request, and the loaded transport reads its response.
 *
 * With `assertDecisionInputs`, a save that carries no decision inputs of its
 * own is refused until init resolved a decision, as in the full transport.
 * Both halves use the `fetch` that was global when the transport was
 * created, as the full transport does.
 *
 * @param options - Backend URL and, for same-origin init, `initURL`.
 * @param load - Loads the hosted transport's module.
 * @returns A provider transport factory.
 */
export const lazyHosted = function lazyHosted(
	options: LazyHostedOptions,
	load: LoadHostedModule = loadHostedModule
): ProviderTransportFactory {
	const assertDecisionInputs =
		options.assertDecisionInputs ?? options.initURL !== undefined;
	return Object.assign(
		(): KernelTransport => {
			const fetch = globalThis.fetch?.bind(globalThis);
			return createLazyInitTransport(
				createHostedRecordTransport(
					{ backendURL: options.backendURL, fetch },
					assertDecisionInputs
						? {
								inputs: () => undefined,
								pending: () => undefined,
								required: true,
							}
						: undefined
				),
				async (ctx) => {
					const early = startEarlyInit(options, fetch, ctx);
					const { createHostedTransport } = await load();
					return createHostedTransport({
						assertDecisionInputs,
						backendURL: options.backendURL,
						fetch: early && fetch ? withEarlyRequest(fetch, early) : fetch,
						headers: options.headers,
						initURL: options.initURL,
					});
				}
			);
		},
		{ kind: options.kind ?? ('hosted' as const) }
	);
};

/**
 * Offline mode that loads `offline()` on first init. `offline()` carries
 * the recommended policy-rule pack, so a static import would ship that pack
 * to every page that renders the root with a backend, where it never runs.
 * An offline page the server already resolved never inits, so it never
 * loads them either.
 *
 * @param options - Rules to resolve. Omitted, the provider's `policyRules`,
 *   then the recommended pack.
 * @param load - Loads the offline transport's module.
 * @returns A provider transport factory reporting `kind: 'offline'`.
 */
export const lazyOffline = function lazyOffline(
	options: OfflineModeOptions = {},
	load: LoadOfflineModule = loadOfflineModule
): ProviderTransportFactory {
	return Object.assign(
		(context: ProviderTransportContext): KernelTransport => {
			let transportPromise: Promise<KernelTransport> | undefined;
			const loadTransport = function loadTransport(): Promise<KernelTransport> {
				transportPromise ??= (async () => {
					try {
						const { offline } = await load();
						return offline({
							policyRules: options.policyRules ?? context.policyRules,
						})(context);
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
					const transport = await loadTransport();
					return (await transport.init?.(ctx)) ?? {};
				},
			};
		},
		{ kind: 'offline' as const }
	);
};

/** Options for {@link lazyBrowserManifest}. */
export type LazyBrowserManifestOptions = BrowserManifestOptions & {
	/** Backend URL for saves and the `/init` fallback. */
	backendURL: string;
};

/**
 * Manifest mode resolved in the browser. The resolver chunk and the
 * manifest request both start when the transport is built, so they load in
 * parallel with the rest of the page; the resolver reads the early
 * response. Saves before the first init go out through the record
 * transport.
 *
 * @param options - Manifest source and backend.
 * @param load - Loads the browser resolver's module.
 * @returns A provider transport factory reporting `kind: 'manifest'`.
 */
export const lazyBrowserManifest = function lazyBrowserManifest(
	options: LazyBrowserManifestOptions,
	load: LoadManifestBrowserModule = loadManifestBrowserModule
): ProviderTransportFactory {
	return Object.assign(
		(): KernelTransport => {
			const fetch =
				options.fetch ??
				(typeof globalThis.fetch === 'function'
					? globalThis.fetch.bind(globalThis)
					: undefined);
			const manifestURL =
				options.manifestURL ?? `${trimSlash(options.backendURL)}/manifest`;
			const inBrowser = typeof window !== 'undefined';
			const early =
				inBrowser && fetch && !options.snapshot
					? sendEarly(
							fetch,
							manifestURL,
							createManifestRequestInit({
								credentials: options.credentials,
								headers: options.headers,
							})
						)
					: undefined;
			const loading = inBrowser ? load() : undefined;
			// Read when init awaits it; until then a failed chunk is handled.
			void (async () => {
				try {
					await loading;
				} catch {
					// Init retries the import.
				}
			})();
			let firstLoad = loading;
			return createLazyInitTransport(
				createHostedRecordTransport({
					backendURL: options.backendURL,
					domain: options.domain,
					fetch,
				}),
				async () => {
					const pending = firstLoad ?? load();
					firstLoad = undefined;
					const { createBrowserManifestTransport } = await pending;
					return createBrowserManifestTransport({
						...options,
						fetch: early && fetch ? withEarlyRequest(fetch, early) : fetch,
						manifestURL: options.snapshot ? options.manifestURL : manifestURL,
					} as BrowserManifestOptions);
				}
			);
		},
		{ kind: 'manifest' as const }
	);
};

let warnedImplementation = false;

/**
 * The transport factory a server-framework client root uses for a mode.
 *
 * Takes the data from `@c15t/core/modes`. A transport factory, such as
 * `custom()` or a single-page app's `hosted()`, is returned unchanged; in
 * development an implementation factory warns once, because its code is
 * now in the client bundle.
 *
 * @param mode - The mode. Defaults to `manifest()`.
 * @param options - Backend URL and the app's consent route prefix.
 * @returns A provider transport factory that carries the mode's data.
 * @throws {Error} When the mode needs a backend URL and none is set.
 * @example
 * ```ts
 * import { manifest } from '@c15t/core/modes';
 * import { clientMode } from '@c15t/core/runtime/client-mode';
 *
 * const mode = clientMode(manifest(), {
 *   backendURL: 'https://your-project.inth.app',
 *   routePrefix: '/api/c15t',
 * });
 * ```
 */
export const clientMode = function clientMode(
	mode: ConsentMode | ProviderTransportFactory | undefined,
	options: ClientModeOptions = {}
): ProviderTransportFactory {
	if (typeof mode === 'function') {
		if (
			mode.kind !== 'custom' &&
			!warnedImplementation &&
			!isProductionBuild()
		) {
			warnedImplementation = true;
			console.warn(
				`c15t: \`mode\` is the ${mode.kind}() transport itself, so its code ships in the client bundle. Pass the ${mode.kind}() your framework package exports instead: it is plain data, and the root loads the code only when it runs.`
			);
		}
		return mode;
	}
	const data: ConsentMode = mode ?? { type: 'manifest' };
	const routePrefix =
		options.routePrefix === undefined
			? undefined
			: trimSlash(options.routePrefix);
	if (data.type === 'offline') {
		return Object.assign(lazyOffline({ policyRules: data.policyRules }), data);
	}
	if (data.type === 'hosted') {
		const backendURL = data.backendURL ?? options.backendURL;
		if (backendURL === undefined) {
			throw new Error(
				'c15t: hosted() needs a backend URL. Set `backendURL` on the mode or in your config.'
			);
		}
		return Object.assign(
			lazyHosted({ backendURL, headers: data.headers }),
			data
		);
	}
	const backendURL = options.backendURL ?? routePrefix;
	if (backendURL === undefined) {
		throw new Error(
			'c15t: manifest() needs a backend URL. Set `backendURL` in your config.'
		);
	}
	if (data.resolve === 'browser') {
		const {
			resolve: _resolve,
			source: _source,
			type: _type,
			...browser
		} = data;
		return Object.assign(
			lazyBrowserManifest({
				...browser,
				backendURL,
				manifestURL:
					data.manifestURL ??
					(routePrefix === undefined ? undefined : `${routePrefix}/manifest`),
			} as LazyBrowserManifestOptions),
			data
		);
	}
	return Object.assign(
		lazyHosted({
			backendURL,
			initURL: routePrefix === undefined ? undefined : `${routePrefix}/init`,
			kind: 'manifest',
		}),
		data
	);
};
