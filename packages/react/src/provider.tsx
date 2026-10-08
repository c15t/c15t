'use client';

import {
	applyExperimentAssignment,
	applyExperimentTheme,
	hostExperiment,
	watchRevocationReload,
} from '@c15t/core';
import type {
	AllConsentNames,
	Callbacks,
	ClearOnRevocationConfig,
	ConsentExperiment,
	ConsentJourneyOption,
	ConsentKernel,
	ConsentPresentation,
	ExperimentState,
	JourneyState,
	HostedModeOptions,
	I18nConfig,
	InitContext,
	KernelConfig,
	KernelOverrides,
	KernelTransport,
	KernelUser,
	LegalLinks,
	ProviderTransportFactory,
	StorageConfig,
	User,
	Vendor,
} from '@c15t/core';
import {
	createPersistence,
	readStoredRecords,
} from '@c15t/core/modules/persistence';
import type { Script } from '@c15t/core/modules/script-loader';
import { createWindowDebug } from '@c15t/core/modules/window-debug';
import type { ConsentControlOptions } from '@c15t/core/runtime';
import {
	claimEarlyJourney,
	createConsentProviderRuntime,
	hostedModes,
	lazyRuntimeModule,
	lazyStreamPrefetch,
	streamPrefetchWith,
} from '@c15t/core/runtime/provider';
import type {
	ConsentProviderRuntime,
	ConsentProviderRuntimeOptions,
	ConsentRuntime,
	ConsentRuntimeModules,
	ResolveStreamedInit,
} from '@c15t/core/runtime/provider';
import { applyThemeSlots } from '@c15t/ui/utils';
import type { ReactNode } from 'react';
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useReducer,
	useState,
	useSyncExternalStore,
} from 'react';

import type { DialogPreload } from './chunk-warming';
import {
	KernelContext,
	ProviderServicesContext,
	StreamedPrefetchContext,
} from './context';
import type { ProviderServices } from './context';
import { ExternalIABProvider } from './external-iab-context';
import { useColorScheme } from './hooks/use-color-scheme';
import { useIsHydrated } from './hooks/use-is-hydrated';
import type {
	UseNetworkBlockerOptions,
	UsePersistenceOptions,
	UseScriptLoaderOptions,
} from './module-hooks';
import { createIframeBlockerOnDemand } from './module-hooks/iframe-blocker';
import type { UseIframeBlockerOptions } from './module-hooks/iframe-blocker';
import { UNCOMMITTED_HOLD_MS } from './module-hooks/network-hold';
import { V3ThemeProvider } from './theme-provider';
import type { ReactUIOptions } from './types/manager';
import type { ReactComponentSlots } from './types/slots';
import type { V3UIConfigValue } from './ui-config-context';

/** Replaced by the app's bundler; see the development warnings below. */
declare const process: { env: { NODE_ENV?: string } };

/** Events emitted by the mounted provider without snapshot-derived consent aliases. */
export type ConsentProviderCallbacks = Pick<
	Callbacks,
	| 'onChoiceRecorded'
	| 'onPermissionsChanged'
	| 'onSurfaceShown'
	| 'onError'
	| 'onBeforeConsentRevocationReload'
>;
/**
 * Prepared policy and records; legacy consent projections are not provider
 * inputs. An `experiment` a server helper resolved runs instead of
 * `options.experiment`, and a `journey` it started is the one the provider
 * continues.
 */
export type ConsentProviderPrefetch = Omit<
	KernelConfig,
	'initialDraft' | 'transport'
> &
	ExperimentState &
	JourneyState;

export interface ConsentProviderOptions
	extends
		ConsentControlOptions,
		Pick<
			ReactUIOptions,
			| 'colorScheme'
			| 'disableAnimation'
			| 'noStyle'
			| 'scrollLock'
			| 'theme'
			| 'trapFocus'
		> {
	enabled?: boolean;
	presentation?: ConsentPresentation;
	/**
	 * A/B experiment on prompt/preferences presentation. The assigned arm is
	 * merged over `presentation`, exposed through `useExperiment()`, and
	 * recorded with every impression and choice. Initial-only: remount the
	 * provider to change the experiment.
	 */
	experiment?: ConsentExperiment;
	/**
	 * Random journey id that links each `/init` to the save that follows:
	 * `'page'`, `'tab'` or `false`. Initial-only.
	 *
	 * @default 'page'
	 */
	journey?: ConsentJourneyOption;
	/**
	 * Content Security Policy nonce applied to DOM nodes c15t injects.
	 *
	 * @remarks
	 * Set this when your CSP uses a nonce-based policy instead of
	 * `'unsafe-inline'`. The provider forwards it to every `<script>`
	 * element created by the script loader. A per-script `nonce` still takes
	 * precedence. Pass the same nonce to `ConsentTheme`, which renders the
	 * theme `<style>` element.
	 */
	nonce?: string;
	/**
	 * Transport factory the provider builds its kernel with. Required.
	 *
	 * Pass `hosted()` to talk to a c15t backend, `offline()` to resolve
	 * policies locally with no network, or `custom()` to supply your own
	 * kernel transport. This is an initial-only
	 * option: remount the provider to change it.
	 *
	 * @example
	 * ```tsx
	 * import { ConsentProvider, hosted, offline } from '@c15t/react';
	 *
	 * <ConsentProvider options={{ mode: hosted({ url: '/api/c15t' }) }}>
	 *   {children}
	 * </ConsentProvider>
	 *
	 * <ConsentProvider options={{ mode: offline() }}>{children}</ConsentProvider>
	 * ```
	 */
	mode: ProviderTransportFactory;
	/**
	 * Where the visitor's choice is stored. Read once, like `persistence`:
	 * the stored records and the data clearing that protects them stay at
	 * the location the provider mounted with. Outside production, a change
	 * logs a warning; remount the provider to move storage.
	 */
	storageConfig?: StorageConfig;
	user?: User | KernelUser;
	overrides?: KernelOverrides;
	/**
	 * Server-resolved kernel configuration, usually from a framework server
	 * helper such as `resolveConsent()`.
	 *
	 * Pass the resolved `KernelConfig` and the provider builds its kernel
	 * from it synchronously: a config carrying a policy renders the banner
	 * on first paint.
	 *
	 * Pass the pending `Promise<KernelConfig>` instead and the provider
	 * mounts at once with a provisional policy, so `children` render (and
	 * the static shell can prerender) while the consent data streams in.
	 * Consent surfaces stay hidden until the promise resolves. On the
	 * server, `ConsentBanner` waits for it in its own Suspense boundary and
	 * follows the page in a later chunk of the same response, before
	 * hydration, when the resolved policy shows a banner; see
	 * `streamBanner`. The resolved config then answers the first `init()`
	 * in place of the transport's network init. A config that resolves without a policy (persisted
	 * consents, geo, language only) is applied to the kernel and the
	 * transport init runs as usual; a rejected promise is logged outside
	 * production and falls through to the transport init. Initial-only:
	 * remount the provider to change it.
	 *
	 * @example
	 * ```tsx
	 * // app/layout.tsx — stays synchronous, so the shell prerenders.
	 * const config = resolveConsent({ backendURL });
	 * return (
	 *   <ConsentProvider options={{ mode: hosted({ url }), prefetch: config }}>
	 *     {children}
	 *   </ConsentProvider>
	 * );
	 * ```
	 */
	prefetch?: ConsentProviderPrefetch | Promise<ConsentProviderPrefetch>;
	/**
	 * Whether `ConsentBanner` renders on the server once a `prefetch`
	 * promise resolves, so it arrives in the streamed response before the
	 * page hydrates. It shows only when the resolved policy shows a banner
	 * for this visitor. Set `false` to mount the banner after hydration
	 * instead, as with a client-only provider. No effect when `prefetch` is
	 * not a promise. Use the same value on the server and in the browser.
	 *
	 * @default true
	 */
	streamBanner?: boolean;
	callbacks?: ConsentProviderCallbacks;
	/**
	 * Remove configured browser data when its consent permission is revoked.
	 * Initial-only: remount the provider to replace its cleanup configuration.
	 */
	clearOnRevocation?: ClearOnRevocationConfig;
	/**
	 * Reload the page after an accept, reject or save turns off a category or
	 * vendor that was granted, or after a `consentSource` withdraws one.
	 * Removing a script cannot stop code that already ran, so the reload
	 * starts a document with only permitted code. Waits for the save request.
	 * Set `false` to handle revocation yourself.
	 * @default true
	 */
	reloadOnConsentRevoked?: boolean;
	scripts?: Script[];
	/**
	 * Vendors offered for vendor-level consent outside IAB. Each sits inside a
	 * category; a visitor can grant the category and still turn one vendor
	 * off. Scripts, network rules and iframes name a vendor through `vendor`
	 * or `data-vendor`. Merged with vendors the backend returns and with slugs
	 * found on scripts and rules; presentation declared here wins.
	 */
	vendors?: Vendor[];
	scriptLoader?: UseScriptLoaderOptions;
	networkBlocker?: UseNetworkBlockerOptions | false;
	/**
	 * Discover and gate DOM iframes with data-category. Enabled by default.
	 * The blocker loads when the first gated iframe is on the page; until it
	 * runs, a gated iframe that arrives with a `src` consent does not allow
	 * is paused.
	 */
	iframeBlocker?: UseIframeBlockerOptions | false;
	/**
	 * Store the visitor's choice in a cookie and localStorage. On by default.
	 * Read once, when the provider mounts; see `storageConfig`.
	 */
	persistence?: boolean | UsePersistenceOptions;
	i18n?: Partial<I18nConfig>;
	/** Categories to offer alongside discovered integration categories, within policy scope. */
	consentCategories?: AllConsentNames[];
	/** Per-component slot attribute overrides (shared contract with @c15t/vue). */
	components?: ReactComponentSlots;
	legalLinks?: LegalLinks;
	/**
	 * When the deferred `<ConsentDialog />` starts loading before it opens.
	 *
	 * - `'idle'` (default): after the page's load event, in browser idle time,
	 *   while the banner is shown or a button that opens the dialog is
	 *   mounted, and on hover or focus of such a button. Skipped when the
	 *   visitor has Save-Data on or a 2G-class connection.
	 * - `'intent'`: only on hover or focus of a button that opens the dialog.
	 *
	 * Neither loads the dialog on a visit that shows no banner and has no
	 * dialog trigger.
	 *
	 * @default 'idle'
	 */
	preloadDialog?: DialogPreload;
	/**
	 * Adapter package name reported by `window.c15t`.
	 * @internal
	 */
	__debugPkg?: string;
	/**
	 * The code that applies a `prefetch` promise, from
	 * `@c15t/core/runtime/streamed-init`. Without it the provider loads that
	 * code once `prefetch` is a promise, so an app that never streams one
	 * doesn't download it. A framework root whose state is usually streamed
	 * (`ConsentRoot`) passes it, so the state applies as soon as it arrives
	 * instead of after one more request. Read once, at mount.
	 * @internal
	 */
	__resolveStreamedInit?: ResolveStreamedInit;
	/**
	 * `preloadScriptLoaderWith` from
	 * `@c15t/core/runtime/script-loader-preload`. With it the runtime starts
	 * the script loader's download during the first render when consent
	 * already lets a script run, instead of from the mount effect. A
	 * framework root whose state usually holds a returning visitor's choice
	 * (`ConsentRoot`) passes it; without it the provider ships none of that
	 * decision. Read once, at mount.
	 * @internal
	 */
	__preloadScriptLoader?: (
		load: () => Promise<unknown>
	) => ConsentRuntimeModules['preloadScriptLoader'];
}

/**
 * Options accepted when an external runtime supplies the kernel.
 *
 * `mode` belongs to whoever created the runtime, so it is optional here.
 * Everything the component tree still owns — theme, slots, legal links —
 * is unchanged.
 */
export type ExternalRuntimeProviderOptions = Omit<
	ConsentProviderOptions,
	'callbacks' | 'mode' | 'vendors'
> & {
	mode?: ConsentProviderOptions['mode'];
	/**
	 * Not accepted here: the runtime owner declares vendors through
	 * `createConsentRuntime({ vendors })`, and the kernel carries them.
	 */
	vendors?: never;
	/**
	 * Not accepted here: the runtime owner passes callbacks to
	 * `createConsentRuntime({ callbacks })`, and the runtime runs them.
	 * Passing them anyway logs a warning in development.
	 */
	callbacks?: never;
};

/** The provider builds and owns its own kernel. */
export interface OwnedRuntimeProviderProps {
	options: ConsentProviderOptions;
	children: ReactNode;
	runtime?: undefined;
}

export interface ExternalRuntimeProviderProps {
	options?: ExternalRuntimeProviderOptions;
	children: ReactNode;
	runtime: ConsentRuntime;
}
export type ConsentProviderProps =
	| OwnedRuntimeProviderProps
	| ExternalRuntimeProviderProps;

/**
 * The modules a provider-built runtime mounts. Persistence, window debug
 * and the revocation reload are static: a returning visitor's choice must
 * apply before the banner shows, and the reload has to see the first save.
 * The rest load on demand, so a page that configures none of them never
 * downloads them:
 *
 * - the script loader and data clearing, when `scripts` or
 *   `clearOnRevocation` is set;
 * - the network blocker, when `networkBlocker` is set; the runtime holds
 *   matching requests from construction until it lands;
 * - the iframe blocker, when the first gated iframe is on the page; until
 *   then a watcher pauses gated frames consent does not allow.
 *
 * `lazyStreamPrefetch` lets `prefetch` be a promise a server streams in,
 * and loads that code only when it is one; a root that passes
 * `__resolveStreamedInit` has it in its first-load chunk instead. A root
 * that passes `__preloadScriptLoader` starts the script loader's download
 * during the first render when consent already lets a script run.
 */
/**
 * Connects a `consentSource` once its module has loaded. Few sites borrow
 * their decisions from another CMP, so the rest do not download it. Until
 * it connects, the kernel grants no optional category.
 */
const connectConsentSourceOnDemand: ConsentRuntimeModules['connectConsentSource'] =
	(kernel, source) => {
		let disconnect: (() => void) | undefined;
		let stopped = false;
		void (async () => {
			try {
				const { connectConsentSource } =
					await import('@c15t/core/runtime/controls');
				if (!stopped) {
					disconnect = connectConsentSource(kernel, source);
				}
			} catch {
				// Not connected: optional categories stay denied.
			}
		})();
		return () => {
			stopped = true;
			disconnect?.();
		};
	};

/** The script loader's module, behind one `import()` for every caller. */
const loadScriptLoader = async () =>
	(await import('@c15t/core/modules/script-loader')).createScriptLoader;

const reactRuntimeModules = function reactRuntimeModules(
	options: ConsentProviderOptions
): ConsentRuntimeModules {
	const resolveStreamedInit = options.__resolveStreamedInit;
	return {
		connectConsentSource: connectConsentSourceOnDemand,
		createClearOnRevocation: lazyRuntimeModule(
			async () =>
				(await import('@c15t/core/modules/clear-on-revocation'))
					.createClearOnRevocation
		),
		createIframeBlocker: createIframeBlockerOnDemand,
		createNetworkBlocker: lazyRuntimeModule(
			async () =>
				(await import('@c15t/core/modules/network-blocker'))
					.createNetworkBlocker
		),
		createPersistence,
		createScriptLoader: lazyRuntimeModule(loadScriptLoader),
		createWindowDebug,
		preloadScriptLoader: options.__preloadScriptLoader?.(loadScriptLoader),
		streamPrefetch: resolveStreamedInit
			? streamPrefetchWith(resolveStreamedInit)
			: lazyStreamPrefetch,
		watchRevocationReload,
	};
};

/**
 * React renders IAB through `IABProvider` in the tree, not through the
 * runtime's `iab` option, so the provider cannot tell the transport whether
 * IAB is on. Leave the transport's `iabEnabled` unset rather than `false`:
 * with `false`, `offline()` rejects a policy pack that uses `model: 'iab'`
 * and no banner shows. The context keeps its other members, live getters
 * included, through its prototype.
 *
 * One wrapper per mode: `update()` loads its comparison when any option is
 * a new value, so a fresh wrapper on every render would load it for every
 * rerender that hands the provider a new options object.
 */
const treeIABModes = new WeakMap<
	ProviderTransportFactory,
	ProviderTransportFactory
>();
/**
 * An `/init` request a render sent, the `hosted()` options and the
 * serialized init context it was sent for, and the transport that sent it.
 */
interface EarlyInit {
	readonly options: HostedModeOptions;
	readonly key: string;
	readonly transport: KernelTransport;
}
/**
 * Early requests no runtime has committed to yet. The first runtime built
 * for equivalent `hosted()` options and the same init context to commit
 * takes one; see {@link createOwnedRuntimeEntry}.
 */
const sentEarly = new Set<EarlyInit>();
/**
 * The transport the latest runtime construction built, and how to build
 * another for the same runtime. Construction is synchronous, so the
 * provider reads them right after.
 */
let builtTransport: KernelTransport | undefined;
let buildTransport: () => KernelTransport;

/**
 * Whether two `hosted()` calls reach the same backend the same way, as when
 * a render calls `hosted()` inline. `fetch` and `initialData` must be the
 * same value; the other options are data and compare by content. `fetch` is
 * the one a transport built now would use: an omitted one resolves to the
 * global `fetch`, which can change between a render and its retry.
 */
const sameHosted = (a: HostedModeOptions, b: HostedModeOptions): boolean =>
	a.fetch === b.fetch &&
	a.initialData === b.initialData &&
	JSON.stringify(a) === JSON.stringify(b);
const withTreeIAB = function withTreeIAB(
	mode: ProviderTransportFactory
): ProviderTransportFactory {
	if (typeof mode !== 'function') {
		return mode;
	}
	let wrapped = treeIABModes.get(mode);
	if (!wrapped) {
		wrapped = Object.assign(
			(context: Parameters<ProviderTransportFactory>[0]) =>
				(builtTransport = (buildTransport = () =>
					mode(
						Object.create(context, { iabEnabled: { value: undefined } })
					))()),
			{ kind: mode.kind }
		);
		treeIABModes.set(mode, wrapped);
	}
	return wrapped;
};

const toRuntimeOptions = function toRuntimeOptions(
	options: ConsentProviderOptions
): ConsentProviderRuntimeOptions {
	return {
		...options,
		mode: withTreeIAB(options.mode),
		pkg: options.__debugPkg ?? '@c15t/react',
	};
};

/**
 * Whether the visitor has a stored choice, read the way the runtime's
 * persistence will hydrate on `start()`: not at all with persistence off or
 * `skipHydration`, otherwise from its storage at its clock. The early
 * `/init` leaves before that, and its journey says whether a choice was
 * stored. It is sent only without a `prefetch`, so no seed decides
 * hydration here.
 */
const hasStoredChoice = function hasStoredChoice(
	options: ConsentProviderOptions
): boolean {
	const { persistence } = options;
	if (persistence === false || options.consentSource) {
		return false;
	}
	const settings = typeof persistence === 'object' ? persistence : {};
	if (settings.skipHydration) {
		return false;
	}
	const now = settings.now ? settings.now() : Date.now();
	const { records } = readStoredRecords(
		settings.storageConfig ?? options.storageConfig,
		now
	);
	// A choice or a notice dismissal: either one answers the prompt.
	return Boolean(records.choice || records.noticeDismissal);
};

/**
 * What makes two `/init` requests the same: the decision inputs, the user,
 * and the journey the request carries (its id, scope and stored flag).
 */
const earlyInitKey = function earlyInitKey(
	context: Pick<InitContext, 'journey' | 'overrides' | 'user'>
): string {
	const { journey } = context;
	return JSON.stringify({
		journey: journey ? [journey.id, journey.scope, journey.storedChoice] : null,
		overrides: context.overrides,
		user: context.user,
	});
};

/**
 * A runtime the provider built during a render, with what it needs to tell
 * whether React kept that render.
 */
interface OwnedRuntimeEntry {
	readonly runtime: ConsentProviderRuntime;
	/** Hand the runtime new options; it applies only what changed. */
	apply: (options: ConsentProviderOptions) => void;
	/**
	 * Start the runtime for a commit that kept it. Returns the cleanup for
	 * that mount, or `null` when the runtime was disposed before any commit
	 * used it and the provider must build another.
	 */
	mount: () => (() => void) | null;
}

interface PendingEntry {
	/** The network rules held from construction, or `null` for none. */
	holdKey: string | null;
	/** Creation order, for finding the renders React threw away. */
	sequence: number;
	expire: () => void;
}

/** Runtimes built during a render that has not committed yet. */
const uncommitted = new Set<PendingEntry>();
let entrySequence = 0;

/**
 * Build the runtime for a provider render.
 *
 * Construction is free of DOM and storage effects with one exception: a
 * runtime with network blocker rules holds matching requests from now on,
 * so children's mount effects cannot send them before the blocker loads.
 * React can throw a render away without committing it (StrictMode's second
 * render in React 18, a render that suspends before its first commit), and
 * nothing would dispose a runtime built in it. So a runtime starts out
 * uncommitted: the commit that keeps one disposes the runtimes earlier
 * renders built for the same rules, while its own hold still covers their
 * requests, and any runtime still uncommitted after
 * {@link UNCOMMITTED_HOLD_MS} disposes itself, failing what it held as
 * blocked. On the server nothing is held and nothing is tracked.
 *
 * In a client render, a `hosted()` runtime that will ask the backend for
 * its policy sends that `/init` request here, during the render, instead
 * of from the mount effect: before the first paint rather than after it.
 * `clientRender` comes from React, not from `window`: a server render
 * never mounts, even with a DOM shim, and hydration asks at mount as
 * before. The answer still applies at mount: the
 * kernel's first `init()` takes this request when its context (overrides,
 * language, user) is unchanged, and sends its own otherwise. The request
 * goes out on a transport of its own, held in {@link sentEarly}. A runtime
 * built for equivalent `hosted()` options and the same init context before
 * any commit sends nothing, so a render React repeats or throws away costs
 * no second request, even when it called `hosted()` again. A runtime asking
 * for another context sends its own and leaves this one to the runtime it
 * was sent for. The first of these runtimes to commit
 * takes the transport and its request; any other, such as a sibling
 * provider with the same mode, keeps its own transport and asks at mount.
 * Not sent with a `prefetch` (the server answered, or is answering), a
 * `consentSource` or `enabled: false` (no init), an `experiment` (its arm,
 * picked after mount, travels with the request), or any mode `hosted()`
 * did not return itself: a custom transport's `init()` may expect a
 * mounted page, and a wrapper's transport may not be swapped for another.
 */
const createOwnedRuntimeEntry = function createOwnedRuntimeEntry(
	initialOptions: ConsentProviderOptions,
	clientRender: boolean
): OwnedRuntimeEntry {
	const { mode, networkBlocker } = initialOptions;
	const runtime = createConsentProviderRuntime(
		toRuntimeOptions(initialOptions),
		reactRuntimeModules(initialOptions)
	);
	let options = initialOptions;
	let expired = false;
	let committed = false;
	// Mount effects run so far; a deferred dispose checks it.
	let mounts = 0;
	let timer: ReturnType<typeof setTimeout> | undefined;
	// This runtime's own transport, and the early request it may take.
	const transport = builtTransport as KernelTransport;
	let early: EarlyInit | undefined;
	let sent: EarlyInit | undefined;
	entrySequence += 1;
	const pending: PendingEntry = {
		expire() {
			// Nobody took the request this runtime sent: drop it.
			sentEarly.delete(sent as EarlyInit);
			uncommitted.delete(pending);
			clearTimeout(timer);
			expired = true;
			runtime.dispose();
		},
		holdKey:
			initialOptions.enabled !== false &&
			networkBlocker &&
			networkBlocker.enabled !== false
				? JSON.stringify(networkBlocker.rules)
				: null,
		sequence: entrySequence,
	};
	if (typeof window === 'undefined') {
		committed = true;
	} else {
		uncommitted.add(pending);
		timer = setTimeout(pending.expire, UNCOMMITTED_HOLD_MS);
		// `policyPending`: enabled, no `consentSource`, no policy yet.
		const snapshot = runtime.kernel.getSnapshot();
		const hostedMode = hostedModes.get(mode);
		const hostedOptions = hostedMode && {
			...hostedMode,
			fetch: hostedMode.fetch ?? globalThis.fetch,
		};
		if (
			clientRender &&
			hostedOptions &&
			snapshot.policyPending &&
			!(initialOptions.prefetch || initialOptions.experiment)
		) {
			// The journey this page's early requests share; the runtime
			// continues it on `start()`, so the save carries the same id.
			const journey = claimEarlyJourney({
				option: initialOptions.journey,
				storedChoice: hasStoredChoice(initialOptions),
			});
			const context = journey
				? { journey, overrides: snapshot.overrides, user: snapshot.user }
				: { overrides: snapshot.overrides, user: snapshot.user };
			const key = earlyInitKey(context);
			for (const other of sentEarly) {
				if (other.key === key && sameHosted(other.options, hostedOptions)) {
					early = other;
				}
			}
			if (!early) {
				// Not this runtime's transport: whichever runtime commits first
				// takes it.
				const carrier = buildTransport();
				const init = carrier.init as NonNullable<KernelTransport['init']>;
				const request = init(context);
				// Nobody reads it when the render that sent it never commits.
				// oxlint-disable-next-line promise/prefer-await-to-then -- Only marks the rejection handled.
				request.catch(() => undefined);
				let used = false;
				carrier.init = (next) => {
					// The kernel's init takes the response only for the request it
					// would have sent itself, journey included: a runtime that
					// starts another journey, or none, asks again.
					const reuse = !used && earlyInitKey(next) === key;
					used = true;
					return reuse ? request : init(next);
				};
				sent = { key, options: hostedOptions, transport: carrier };
				early = sent;
				sentEarly.add(sent);
			}
		}
	}

	const commit = function commit(): boolean {
		if (expired) {
			return false;
		}
		if (committed) {
			return true;
		}
		committed = true;
		// One-shot: the first runtime to commit takes the early request and
		// its transport, so no two kernels ever share one.
		if (sentEarly.delete(early as EarlyInit)) {
			Object.assign(transport, early?.transport);
		}
		uncommitted.delete(pending);
		clearTimeout(timer);
		if (pending.holdKey !== null) {
			for (const other of uncommitted) {
				if (
					other.sequence < pending.sequence &&
					other.holdKey === pending.holdKey
				) {
					other.expire();
				}
			}
		}
		return true;
	};

	return {
		apply(next) {
			if (next !== options) {
				options = next;
				// It rejects when its chunk fails to load. Requests held for
				// new rules have failed closed by then, and the next update
				// loads it again, so there is nothing left to handle.
				// oxlint-disable-next-line promise/prefer-await-to-then -- Fire and forget from an effect: only the rejection needs a handler.
				runtime.update(toRuntimeOptions(next)).catch(() => undefined);
			}
		},
		mount() {
			if (!commit()) {
				return null;
			}
			mounts += 1;
			const mount = mounts;
			// Idempotent: StrictMode's replayed mount finds it started.
			runtime.start();
			return () => {
				// StrictMode replays the mount in the same task; only a real
				// unmount leaves the count where this cleanup found it.
				queueMicrotask(() => {
					if (mounts === mount) {
						runtime.dispose();
					}
				});
			};
		},
		runtime,
	};
};

/**
 * Holds the provider's runtime. Creating the holder is pure, so StrictMode
 * calling the `useState` initializer twice costs nothing; the runtime is
 * built on the first `get()`, during the first render, so the server render
 * and the first client render use its kernel.
 */
const createRuntimeHolder = function createRuntimeHolder() {
	let entry: OwnedRuntimeEntry | null = null;
	return {
		get(
			options: ConsentProviderOptions,
			clientRender: boolean
		): OwnedRuntimeEntry {
			entry ??= createOwnedRuntimeEntry(options, clientRender);
			return entry;
		},
		reset() {
			entry = null;
		},
	};
};

const increment = (count: number): number => count + 1;
const subscribeNothing = (): (() => void) => () => undefined;

/**
 * The provider-built runtime: one per provider instance. `undefined` when
 * the provider renders a borrowed runtime.
 */
const useOwnedRuntime = function useOwnedRuntime(
	options: ConsentProviderOptions | undefined
): { entry: OwnedRuntimeEntry; rebuild: () => void } | undefined {
	// oxlint-disable-next-line react/hook-use-state -- Created once, during the first render.
	const [holder] = useState(createRuntimeHolder);
	const [, rerender] = useReducer(increment, 0);
	// React's server snapshot on the server and while hydrating: only a
	// client render sends `/init` early.
	const clientRender = useIsHydrated();
	const rebuild = useCallback(() => {
		holder.reset();
		rerender();
	}, [holder]);
	return options
		? { entry: holder.get(options, clientRender), rebuild }
		: undefined;
};

/** A layout effect in the browser; nothing to run on the server. */
const useBrowserLayoutEffect =
	typeof document === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Drives a provider-built runtime: hands it new options, then starts and
 * disposes it. Rendered before the provider's children, so the runtime
 * starts (stored choice applied, `/init` sent or the prefetch adopted,
 * modules mounted) before their mount effects run.
 */
const OwnedRuntimeLifecycle = ({
	entry,
	options,
	rebuild,
}: {
	entry: OwnedRuntimeEntry;
	options: ConsentProviderOptions;
	rebuild: () => void;
}) => {
	// Before paint, so an `enabled` change never shows a frame of the
	// previous kernel.
	useBrowserLayoutEffect(() => entry.apply(options), [entry, options]);

	useEffect(() => {
		const unmount = entry.mount();
		if (!unmount) {
			rebuild();
			return;
		}
		return unmount;
	}, [entry, rebuild]);

	return null;
};

const isPromiseLike = function isPromiseLike(
	value: unknown
): value is PromiseLike<unknown> {
	return (
		typeof (value as PromiseLike<unknown> | undefined)?.then === 'function'
	);
};

/**
 * v3 ConsentProvider.
 *
 * Builds one consent runtime (`createConsentProviderRuntime`) per mounted
 * provider and renders its kernel: the kernel goes into context, and
 * selector hooks subscribe to it through `useSyncExternalStore`. New
 * options reach the runtime through `update()`, which applies only what
 * changed; `mode`, `i18n`, `experiment`, `prefetch`, `persistence`,
 * `storageConfig` and `clearOnRevocation` are read once. While `enabled` is
 * `false` the runtime renders a separate permissive kernel, so toggling it
 * keeps the visitor's records.
 *
 * Pass `runtime` to render a runtime someone else created. The provider
 * then borrows its kernel and starts nothing — no second `init()`, no
 * second persistence handle, no second `window.c15t` — and does not
 * dispose it on unmount. Handing it a different runtime switches the tree
 * to that runtime's kernel; switching between a borrowed runtime and a
 * provider-built one still needs a remount.
 *
 * @example
 * ```tsx
 * import { createConsentRuntime } from '@c15t/core/runtime';
 *
 * const runtime = createConsentRuntime({ mode: hosted({ url: '/api/c15t' }) });
 * runtime.start();
 *
 * <ConsentProvider runtime={runtime} options={{ theme }}>
 *   <ConsentDialog />
 * </ConsentProvider>
 * ```
 */
// oxlint-disable-next-line complexity -- Provider selects owned or borrowed lifecycle and renders its contexts.
export const ConsentProvider = (props: ConsentProviderProps) => {
	const { children } = props;
	const options = (props.options ?? {}) as ConsentProviderOptions;
	// Read at mount: moving between a borrowed and a provider-built runtime
	// needs a remount. A borrowed runtime follows the prop.
	// oxlint-disable-next-line react/hook-use-state -- Read once, at mount.
	const [mountedRuntime] = useState(() => props.runtime);
	const owned = useOwnedRuntime(mountedRuntime ? undefined : options);
	const providerRuntime = owned?.entry.runtime;
	const borrowed = mountedRuntime
		? (props.runtime ?? mountedRuntime)
		: undefined;
	const runtime = (providerRuntime ?? borrowed) as ConsentRuntime;
	// A provider runtime swaps kernels when `enabled` changes.
	const kernel: ConsentKernel = useSyncExternalStore(
		providerRuntime ? providerRuntime.subscribe : subscribeNothing,
		() => runtime.kernel,
		() => runtime.kernel
	);
	// The runtime validated and assigns arms from its own experiment. A
	// borrowed runtime without one renders the options' experiment, read at
	// mount like everything else about it.
	// oxlint-disable-next-line react/hook-use-state -- Read once, at mount.
	const [borrowedExperiment] = useState(() =>
		mountedRuntime
			? (mountedRuntime.experiment ??
				hostExperiment(
					options.experiment,
					isPromiseLike(options.prefetch) ? undefined : options.prefetch
				))
			: undefined
	);
	const experiment = providerRuntime
		? providerRuntime.experiment
		: borrowedExperiment;

	const borrowedCategories = borrowed ? options.consentCategories : undefined;
	useEffect(() => {
		if (borrowed && borrowedCategories !== undefined) {
			borrowed.setConsentCategories(borrowedCategories);
		}
	}, [borrowed, borrowedCategories]);

	const { presentation } = options;
	const services = useMemo<ProviderServices>(
		() => ({
			clearRecords: () => runtime.clearRecords(),
			getConsentCategories: () => runtime.consentCategories,
			getPresentation: () =>
				applyExperimentAssignment(
					presentation,
					experiment,
					kernel.getSnapshot().experiment
				),
			setLanguage: (code: string) => runtime.setLanguage(code),
		}),
		[experiment, kernel, presentation, runtime]
	);

	// Development only. A borrowed runtime already runs the callbacks its
	// owner passed to `createConsentRuntime()`; attaching the provider's as
	// well would split one app's handlers across two places.
	const hasBorrowedCallbacks = !!borrowed && options.callbacks !== undefined;
	useEffect(() => {
		if (process.env.NODE_ENV === 'production' || !hasBorrowedCallbacks) {
			return;
		}
		console.warn(
			'c15t ConsentProvider: `options.callbacks` is ignored when you pass `runtime`. Pass them to createConsentRuntime({ callbacks }) instead.'
		);
	}, [hasBorrowedCallbacks]);

	// The arm's theme overrides ride on the host theme, so the theme context
	// follows the assignment.
	const assignment = useSyncExternalStore(
		(listener) => kernel.subscribe(listener),
		() => kernel.getSnapshot().experiment,
		() => kernel.getServerSnapshot().experiment
	);
	const userTheme = useMemo(
		() => applyExperimentTheme(options.theme, experiment, assignment),
		[options.theme, experiment, assignment]
	);
	// Development only: bundlers replace `process.env.NODE_ENV`, so production
	// builds drop the check. Tokens need `ConsentTheme` or a stylesheet now.
	useEffect(() => {
		if (process.env.NODE_ENV === 'production') {
			return;
		}
		const tokenKeys = [
			'colors',
			'dark',
			'motion',
			'radius',
			'shadows',
			'spacing',
			'typography',
		];
		if (
			!userTheme ||
			!tokenKeys.some((key) => key in userTheme) ||
			document.getElementById('c15t-theme')
		) {
			return;
		}
		console.warn(
			'c15t: `theme` tokens are no longer turned into CSS in the browser. Render <ConsentTheme theme={theme} /> on the server, or put the CSS from generateThemeCSS() in your stylesheet. See https://c15t.com/docs/frameworks/react/customize'
		);
	}, [userTheme]);

	const themeContextValue = useMemo(
		() => ({
			colorScheme: options.colorScheme,
			disableAnimation: options.disableAnimation,
			noStyle: options.noStyle,
			scrollLock: options.scrollLock,
			theme: userTheme,
			trapFocus: options.trapFocus,
		}),
		[
			userTheme,
			options.noStyle,
			options.disableAnimation,
			options.scrollLock,
			options.trapFocus,
			options.colorScheme,
		]
	);

	const uiConfigValue = useMemo<V3UIConfigValue>(
		() => ({
			// `theme.slots` style the same parts as `components`, which win
			// where both set the same attribute.
			components: applyThemeSlots(
				userTheme?.slots,
				options.components,
				'className'
			),
			experiment,
			legalLinks: options.legalLinks,
			preloadDialog: options.preloadDialog,
			presentation: options.presentation,
			theme: options.theme,
		}),
		[
			userTheme?.slots,
			options.components,
			experiment,
			options.legalLinks,
			options.preloadDialog,
			options.presentation,
			options.theme,
		]
	);

	useColorScheme(options.colorScheme);

	return (
		<KernelContext.Provider value={kernel}>
			<ProviderServicesContext.Provider value={services}>
				<V3ThemeProvider
					themeConfig={themeContextValue}
					uiConfig={uiConfigValue}
				>
					{owned ? (
						<OwnedRuntimeLifecycle
							entry={owned.entry}
							options={options}
							rebuild={owned.rebuild}
						/>
					) : null}
					{borrowed ? (
						<ExternalIABProvider runtime={borrowed}>
							{children}
						</ExternalIABProvider>
					) : (
						<StreamedPrefetchContext.Provider
							value={
								options.streamBanner === false
									? undefined
									: providerRuntime?.streamed
							}
						>
							{children}
						</StreamedPrefetchContext.Provider>
					)}
				</V3ThemeProvider>
			</ProviderServicesContext.Provider>
		</KernelContext.Provider>
	);
};
