'use client';

/**
 * Client root for the TanStack Start adapter.
 *
 * Receives the visitor's `ConsentState` from the root route loader, resolved
 * or as a pending promise the loader streams, and forwards it to the React
 * provider as `options.prefetch`. Kernel creation, persistence, init, and
 * module wiring live in `@c15t/react`.
 *
 * The state also carries the backend URL, the mode and the route prefix
 * `createConsentStateHandler()` was given. `clientMode()` turns them into a
 * transport whose init path loads only when the browser runs init, so
 * first-load JavaScript holds the record transport and nothing else.
 *
 * The state must travel through loader data (or a server function
 * result), never through module state: the server and the client each
 * create their own kernel from the same serialized value, which is what
 * keeps the first paint and the hydrated tree identical.
 */
import type {
	KernelOverrides,
	KernelTransport,
	ProviderTransportFactory,
	Vendor,
} from '@c15t/core';
import { backendURL as generatedBackendURL } from '@c15t/core/generated';
import type { ConsentMode } from '@c15t/core/modes';
import type { Script } from '@c15t/core/modules/script-loader';
import { clientMode } from '@c15t/core/runtime/client-mode';
import { preloadScriptLoaderWith } from '@c15t/core/runtime/script-loader-preload';
import type * as ScriptServerStart from '@c15t/core/runtime/script-server-start';
import { resolveStreamedInit } from '@c15t/core/runtime/streamed-init';
import type {
	UseNetworkBlockerOptions,
	UsePersistenceOptions,
	UseScriptLoaderOptions,
} from '@c15t/react/module-hooks';
import { ConsentProvider } from '@c15t/react/provider';
import type { ConsentProviderOptions } from '@c15t/react/provider';
import * as React from 'react';
import { Suspense, useState } from 'react';
import type { ReactNode } from 'react';

import { readPrefetchedInitialData } from './libs/prefetch-head';
import type { ConsentState } from './server';

export interface ConsentRootProps {
	/**
	 * The visitor's consent state produced server-side by `resolveConsent()`
	 * (or `createConsentStateHandler()`) from `@c15t/tanstack-start/server`,
	 * usually read back with `Route.useLoaderData()`. Serializable JSON. It
	 * carries the backend URL, mode and route prefix the server helper was
	 * given, so the root needs no transport options of its own.
	 *
	 * A pending promise is fine too. Return it unawaited from the root
	 * loader (`loader: () => ({ consent: getConsentState() })`) and TanStack
	 * Router streams it: the response starts without waiting for the
	 * backend, and the banner mounts once the promise resolves after
	 * hydration instead of being in the server HTML. Until then no category
	 * is granted, so gated scripts and embeds stay blocked.
	 *
	 * Pages with no loader, such as a static host, pass `{}`. The browser
	 * then resolves consent from the backend URL `consentManifest()` read.
	 */
	state: ConsentState | Promise<ConsentState>;

	/**
	 * Script tags to manage with the script-loader module.
	 */
	scripts?: Script[];

	/**
	 * Vendors the preference center lists under their category, each with
	 * its own switch, so a visitor can grant a category and still turn one
	 * vendor off. Scripts, network rules and iframes naming a vendor's
	 * `id` follow that choice. Merged with vendors the backend declares.
	 * Optional: most sites need only categories. See the vendor consent guide.
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
		/**
		 * Replaces the mode the state carries. Takes the data from
		 * `@c15t/tanstack-start`, or a transport factory such as `custom()`.
		 */
		mode?: ConsentMode | ProviderTransportFactory;
	};

	children: ReactNode;
}

type RecordedState = PromiseLike<ConsentState> & {
	status?: string;
	value?: ConsentState;
};

const isPending = function isPending(
	state: ConsentState | Promise<ConsentState>
): state is Promise<ConsentState> {
	return typeof (state as PromiseLike<ConsentState>).then === 'function';
};

const transportFor = function transportFor(
	state: ConsentState | undefined,
	mode: ConsentMode | ProviderTransportFactory | undefined,
	overrides: KernelOverrides | undefined
): ProviderTransportFactory {
	const backendURL = state?.backendURL ?? generatedBackendURL;
	const routePrefix = state?.routePrefix;
	return clientMode(mode ?? state?.mode, {
		backendURL,
		// A `consentPrefetchHead()` script may have started the init request
		// before hydration. The transport consumes that promise on its first
		// init, so the first save stays bound to the decision it resolved.
		initialData: readPrefetchedInitialData({
			backendURL,
			overrides,
			routePrefix,
		}),
		routePrefix,
	});
};

/**
 * The transport for a state the server is still streaming. The backend URL,
 * mode and route prefix arrive with it, so every request waits for the
 * state; the streamed state answers the first init, so in practice only a
 * save or a re-init reaches this transport, after the state arrived.
 */
const deferredTransport = function deferredTransport(
	state: PromiseLike<ConsentState>,
	mode: ConsentMode | undefined,
	overrides: KernelOverrides | undefined
): ProviderTransportFactory {
	return Object.assign(
		(context: Parameters<ProviderTransportFactory>[0]): KernelTransport => {
			let loading: Promise<KernelTransport> | undefined;
			const load = function load(): Promise<KernelTransport> {
				loading ??= (async () => {
					let resolved: ConsentState | undefined;
					try {
						resolved = await state;
					} catch {
						// A rejected stream renders as though nothing was
						// prefetched; the backend URL then comes from the build.
					}
					return transportFor(resolved, mode, overrides)(context);
				})();
				return loading;
			};
			return {
				async identify(user, subjectId) {
					await (await load()).identify?.(user, subjectId);
				},
				async init(ctx) {
					return (await (await load()).init?.(ctx)) ?? {};
				},
				async loadSubjectRecord(subjectId) {
					return (await (await load()).loadSubjectRecord?.(subjectId)) ?? null;
				},
				async save(payload, saveContext) {
					const transport = await load();
					if (!transport.save) {
						throw new Error('c15t: the init transport cannot save.');
					}
					return await transport.save(payload, saveContext);
				},
			};
		},
		{ kind: mode?.type ?? ('manifest' as const) }
	);
};

const resolveMode = function resolveMode(
	state: ConsentState | Promise<ConsentState>,
	mode: ConsentMode | ProviderTransportFactory | undefined,
	overrides: KernelOverrides | undefined
): ProviderTransportFactory {
	if (typeof mode === 'function') {
		return clientMode(mode);
	}
	if (!isPending(state)) {
		return transportFor(state, mode, overrides);
	}
	// TanStack Router records a streamed promise's result on it once it
	// settled, as React's `use()` expects.
	const recorded: RecordedState = state;
	if (recorded.status === 'fulfilled' && recorded.value) {
		return transportFor(recorded.value, mode, overrides);
	}
	return deferredTransport(state, mode, overrides);
};

type ScriptServerStartModule = typeof ScriptServerStart;

/** A promise that keeps its result where React 18 reads it on a retry. */
type Recorded<Value> = Promise<Value> & {
	status?: 'fulfilled';
	value?: Value;
};

/** `promise`, which must not reject, recording its result on itself. */
const record = function record<Value>(
	promise: Promise<Value>
): Recorded<Value> {
	const holder: { recorded?: Recorded<Value> } = {};
	const recorded: Recorded<Value> = (async () => {
		const value = await promise;
		// Set by now: the await above yields.
		if (holder.recorded) {
			holder.recorded.status = 'fulfilled';
			holder.recorded.value = value;
		}
		return value;
	})();
	holder.recorded = recorded;
	return recorded;
};

const loadScriptServerStart = function loadScriptServerStart(): Recorded<
	ScriptServerStartModule | undefined
> {
	return record(
		(async () => {
			try {
				return await import('@c15t/core/runtime/script-server-start');
			} catch {
				return undefined;
			}
		})()
	);
};

let scriptServerStartModule:
	| Recorded<ScriptServerStartModule | undefined>
	| undefined;
let retriedScriptServerStart:
	| Recorded<ScriptServerStartModule | undefined>
	| undefined;

/**
 * Loaded on the server only, so no browser chunk requests it. A failed
 * import skips the server start and retries on the side for later renders.
 */
const importScriptServerStart = function importScriptServerStart(): Recorded<
	ScriptServerStartModule | undefined
> {
	const loaded = scriptServerStartModule;
	if (loaded?.status === 'fulfilled' && !loaded.value) {
		// Every render gets the failed load until the retry settles. On
		// React 18 a render that waited for the load calls again, and a
		// pending import there would suspend it again.
		retriedScriptServerStart ??= loadScriptServerStart();
		if (retriedScriptServerStart.status !== 'fulfilled') {
			return loaded;
		}
		scriptServerStartModule = retriedScriptServerStart;
		retriedScriptServerStart = undefined;
	}
	scriptServerStartModule ??= loadScriptServerStart();
	return scriptServerStartModule;
};

const settledStates = new WeakMap<
	Promise<ConsentState>,
	Recorded<ConsentState | undefined>
>();

/**
 * `state` with a rejection as `undefined`: the provider falls back to its
 * transport then, and the server start has nothing to start. One promise
 * per input, so `use` sees the same value on a retry.
 */
const settledState = function settledState(
	state: Promise<ConsentState>
): Recorded<ConsentState | undefined> {
	let settled = settledStates.get(state);
	if (!settled) {
		settled = record(
			(async () => {
				try {
					return await state;
				} catch {
					return undefined;
				}
			})()
		);
		settledStates.set(state, settled);
	}
	return settled;
};

/**
 * Whether `state` can start a script from the HTML: a streamed one, or one
 * resolved for this request. A prerendered state, or the static root's
 * `{}`, renders no start script, so shared HTML carries no inline script.
 */
const startsFromHTML = function startsFromHTML(
	state: ConsentState | Promise<ConsentState> | undefined
): boolean {
	if (state !== undefined && isPending(state)) {
		return true;
	}
	return (
		state?.initialPolicyResolution !== undefined && state.now !== undefined
	);
};

/** React 19's `use`, absent from React 18. */
const { use } = React as {
	use?: <Value>(value: Promise<Value>) => Value;
};

/**
 * `use` where React has it. React 18 suspends on a thrown promise and
 * reads its recorded result on the retry.
 */
const read = function read<Value>(promise: Recorded<Value>): Value {
	if (use) {
		// oxlint-disable-next-line react-hooks/rules-of-hooks -- `read` is `use` with a React 18 fallback, so it keeps `use`'s rules: render only, conditions allowed.
		return use(promise);
	}
	if (promise.status === 'fulfilled') {
		return promise.value as Value;
	}
	throw promise;
};

/**
 * Starts the scripts the server's consent state already lets run. An
 * inline script runs the setup of each one with a `serverStart` and
 * inserts it after first paint, before hydration, and the loader adopts
 * it. In the browser it only hydrates the inline script.
 *
 * It suspends on a streamed state inside its own boundary, on the server and
 * in the browser, so the rest of the page streams and hydrates without it.
 */
const ServerScriptStart = ({
	options,
}: {
	options: ConsentProviderOptions;
}): ReactNode => {
	const { prefetch } = options;
	const state = isPending(prefetch as ConsentState | Promise<ConsentState>)
		? read(settledState(prefetch as Promise<ConsentState>))
		: (prefetch as ConsentState | undefined);
	// A streamed state that rejects, or resolves to a shared one, renders no
	// start script, on the server and in the browser alike.
	if (!startsFromHTML(state)) {
		return null;
	}
	if (typeof document !== 'undefined') {
		// Hydrates the server's start script without running or replacing it.
		return (
			<script
				// oxlint-disable-next-line react/no-danger -- Empty: keeps the server's script.
				dangerouslySetInnerHTML={{ __html: '' }}
				suppressHydrationWarning
			/>
		);
	}
	const module = read(importScriptServerStart());
	// A failed import still renders the empty script the browser hydrates.
	const code = module?.serverScriptStart({
		...(options as unknown as Parameters<
			ScriptServerStartModule['serverScriptStart']
		>[0]),
		prefetch: state,
	});
	return (
		// Runs a granted vendor's setup and inserts its tag before the page
		// hydrates. The script loader adopts the tag.
		<script
			// oxlint-disable-next-line react/no-danger -- c15t's own code; serverScriptStart escapes `<` in every value.
			dangerouslySetInnerHTML={{ __html: code ?? '' }}
			nonce={options.nonce}
			suppressHydrationWarning
		/>
	);
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
 *   const { consent } = Route.useLoaderData();
 *   return (
 *     <ConsentRoot state={consent}>
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
 * ```
 *
 * @throws {Error} When the mode needs a backend URL and neither the state
 * nor `consentManifest()` provides one.
 */
export const ConsentRoot = ({
	state,
	scripts,
	vendors,
	scriptLoader,
	clearOnRevocation,
	networkBlocker,
	persistence,
	options,
	children,
}: ConsentRootProps) => {
	const [mode, setMode] = useState(() =>
		resolveMode(state, options?.mode, options?.overrides)
	);
	// Initial-only, like the provider's own `mode`.
	void setMode;

	const providerOptions: ConsentProviderOptions = {
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
	};

	return (
		<ConsentProvider options={providerOptions}>
			{children}
			{/* After the page: an inline script waits for the stylesheets,
			so ahead of the content it would hold back first paint. */}
			{scripts?.length &&
			startsFromHTML(state) &&
			scriptLoader?.serverStart !== false ? (
				<Suspense fallback={null}>
					<ServerScriptStart options={providerOptions} />
				</Suspense>
			) : null}
		</ConsentProvider>
	);
};
