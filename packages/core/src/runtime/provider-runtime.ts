/**
 * The runtime a framework provider renders: a consent runtime whose
 * options follow the component's props.
 *
 * It adds three things a page-level host does not need, so that host never
 * loads them:
 *
 * - `update(options)`: compares a component's new options with the last
 *   set and applies only what changed;
 * - the `enabled` toggle: a disabled provider renders a separate permissive
 *   runtime, so turning `enabled` off and on keeps the visitor's records;
 * - a streamed `prefetch`: a promise whose result answers the first
 *   `init()`.
 *
 * Two runtimes do the work. The main one holds the records and policy and
 * runs while enabled. The permissive one exists only while disabled and
 * mounts nothing but the script loader. Both read their options through a
 * live view, so modules mounted on `start()` see the latest props, and
 * both mount modules through slots, so the update module can rebuild one
 * whose options changed without touching the others.
 */
import type { AllConsentNames } from '../consent/consent-types';
import { extractConsentNamesFromCondition } from '../libs/has';
import { isProductionBuild } from '../libs/is-production';
import { declareOwnedVendors, resolveVendors } from '../libs/vendors';
import { holdNetworkRequests, NOT_HELD } from '../modules/network-blocker/hold';
import type { NetworkHold } from '../modules/network-blocker/hold';
import { assembleConsentRuntime } from './assemble';
import { afterModuleLoaded } from './lazy-module';
import type * as ProviderUpdateModule from './provider-update';
import type { ProviderUpdateHost } from './provider-update';
import { createRuntimeKernel, normalizeKernelUser } from './runtime-kernel';
import type {
	ConsentProviderRuntime,
	ConsentProviderRuntimeOptions,
	ConsentRuntime,
	ConsentRuntimeModules,
	ConsentRuntimeOptions,
	ConsentRuntimeUpdate,
	RuntimePrefetch,
} from './types';

type Callbacks = NonNullable<ConsentRuntimeUpdate['callbacks']>;

/** Options a running provider runtime follows. Everything else is read once. */
const LIVE_OPTIONS = new Set<PropertyKey>([
	'consentCategories',
	'iframeBlocker',
	'networkBlocker',
	'nonce',
	'overrides',
	'reloadOnConsentRevoked',
	'scriptLoader',
	'scripts',
	'user',
	'vendors',
]);

/** Overrides compared without regard to key order. */
const overridesKey = function overridesKey(
	overrides: ConsentRuntimeUpdate['overrides']
): string {
	return JSON.stringify(Object.entries(overrides ?? {}).sort());
};

/**
 * Whether any option is a new value. `update()` loads the update module
 * only then: a provider that hands back the options it already gave (Svelte's
 * update effect also runs on mount) downloads nothing. The module compares
 * values itself, so a new object holding the same values loads it and
 * changes nothing.
 */
const changed = function changed(
	applied: ConsentRuntimeUpdate,
	next: ConsentRuntimeUpdate
): boolean {
	for (const key in { ...applied, ...next }) {
		if (applied[key as 'user'] !== next[key as 'user']) {
			return true;
		}
	}
	return false;
};

/** The scripts and rules whose slugs declare vendors. */
const ownersOf = function ownersOf(options: ConsentRuntimeUpdate) {
	return [
		...(options.scripts ?? []),
		...(options.networkBlocker ? (options.networkBlocker.rules ?? []) : []),
	];
};

/**
 * A module the provider can rebuild: the factory, what is mounted now and
 * the options it was mounted with. The runtime keeps the stand-in handle
 * and disposes it on stop; the update module swaps what is behind it.
 * @internal
 */
export interface ModuleSlot<Options, Handle extends { dispose: () => void }> {
	/** The factory a runtime mounts through; returns the stand-in. */
	create: (options: Options) => Handle;
	factory: (options: Options) => Handle;
	/** The module now mounted, if any. */
	inner: Handle | null;
	/** The options it was last mounted with. */
	last: Options | null;
	/** The handle the runtime holds; forwards to `inner`. */
	standIn: Handle;
}

const moduleSlot = function moduleSlot<
	Options,
	Handle extends { dispose: () => void },
>(factory: (options: Options) => Handle): ModuleSlot<Options, Handle> {
	const slot = { factory, inner: null, last: null } as ModuleSlot<
		Options,
		Handle
	>;
	slot.standIn = new Proxy({} as Handle, {
		get: (_target, method) => {
			const { inner } = slot;
			// Symbols are not methods: a lazy module's load signal, for one.
			if (typeof method === 'symbol') {
				return (inner as Record<PropertyKey, unknown> | null)?.[method];
			}
			if (method === 'dispose') {
				return () => {
					slot.inner?.dispose();
					slot.inner = null;
				};
			}
			return (...args: unknown[]) =>
				(
					slot.inner as Record<PropertyKey, (...a: unknown[]) => unknown> | null
				)?.[method]?.(...args);
		},
	});
	slot.create = (options) => {
		slot.last = options;
		slot.inner = factory(options);
		return slot.standIn;
	};
	return slot;
};

/**
 * Creates the runtime a framework provider renders.
 *
 * Everything {@link ConsentRuntime} does, plus `update()` for new props,
 * the `enabled` toggle and a `prefetch` that may still be a promise. The
 * caller passes the module factories: `defaultRuntimeModules` to import
 * every module up front, or its own mix with `lazyRuntimeModule` to load
 * some on demand.
 *
 * @param options - The provider's options at mount.
 * @param modules - The module factories to mount.
 * @returns The provider runtime.
 * @throws {Error} When `mode` is not a transport factory.
 *
 * @example
 * ```ts
 * import {
 *   createConsentProviderRuntime,
 *   defaultRuntimeModules,
 * } from '@c15t/core/runtime';
 *
 * const runtime = createConsentProviderRuntime(props.options, defaultRuntimeModules);
 * onMount(() => {
 *   runtime.start();
 *   return () => runtime.dispose();
 * });
 * $effect(() => runtime.update(props.options));
 * ```
 */
// oxlint-disable-next-line max-lines-per-function -- One cohesive lifecycle around two runtimes.
export const createConsentProviderRuntime =
	function createConsentProviderRuntime(
		options: ConsentProviderRuntimeOptions,
		modules: ConsentRuntimeModules
	): ConsentProviderRuntime {
		const initial = options;
		// The prefetch known now: none while a promise is still pending.
		const knownPrefetch =
			typeof (initial.prefetch as PromiseLike<unknown> | undefined)?.then ===
			'function'
				? undefined
				: (initial.prefetch as RuntimePrefetch | undefined);
		let current: ConsentRuntimeUpdate = options;
		let enabled = options.enabled ?? true;
		let started = false;
		let disposed = false;
		let overridesChanged = false;
		const listeners = new Set<() => void>();
		const notify = function notify() {
			for (const listener of listeners) {
				listener();
			}
		};
		// The provider's own scripts and rules are one owner of their vendor
		// slugs among several modules; see `declareOwnedVendors`.
		const ownerSource = Symbol('consent-provider');
		// Callbacks are read when an event fires.
		const callbacks = new Proxy({} as Callbacks, {
			get: (_target, name) => current.callbacks?.[name as keyof Callbacks],
		});

		/** One runtime, its live option view and its replaceable modules. */
		const build = function build(on: boolean) {
			// Modules mounted after `start()` that the runtime does not know of.
			let extras: (() => void)[] = [];
			// Filled in below; the streamed mode and the module defaults read
			// it only after construction.
			const built: { runtime?: ConsentRuntime } = {};
			const { streamPrefetch } = modules;
			// A promise: the only prefetch not known now.
			const pending = on && initial.prefetch !== knownPrefetch;
			if (pending && !streamPrefetch && !isProductionBuild()) {
				console.warn(
					'c15t: `prefetch` is a promise, but the runtime was created without `streamPrefetch` in its modules. It is ignored and the runtime requests the policy itself.'
				);
			}
			const mode =
				pending && streamPrefetch
					? streamPrefetch(
							initial.mode,
							initial.prefetch as PromiseLike<RuntimePrefetch>,
							initial,
							() => built.runtime?.kernel
						)
					: initial.mode;
			const view = new Proxy({} as ConsentRuntimeOptions, {
				get: (_target, key) => {
					if (key === 'enabled') {
						return on;
					}
					if (key === 'callbacks') {
						return callbacks;
					}
					if (key === 'mode') {
						return mode;
					}
					if (key === 'prefetch') {
						// A pending prefetch is streamed into the first init. Once
						// overrides or the language changed before start or while
						// disabled, the prefetch answers for other inputs: start
						// asks the backend instead.
						return knownPrefetch && overridesChanged
							? { ...knownPrefetch, initialPolicyPending: true }
							: knownPrefetch;
					}
					const source = LIVE_OPTIONS.has(key) ? current : initial;
					return source[key as keyof ConsentRuntimeUpdate];
				},
			});
			const track = (dispose: () => void) => extras.push(dispose);
			const scripts = moduleSlot(modules.createScriptLoader);
			const network = moduleSlot(modules.createNetworkBlocker);
			const iframes = moduleSlot(modules.createIframeBlocker);
			const cleanup = moduleSlot(modules.createClearOnRevocation);
			const assembled = assembleConsentRuntime(view, {
				...modules,
				createClearOnRevocation: cleanup.create,
				createIframeBlocker: iframes.create,
				createNetworkBlocker: network.create,
				createScriptLoader: scripts.create,
			});
			built.runtime = assembled.runtime;
			const stop = () => {
				for (const dispose of extras.reverse()) {
					dispose();
				}
				extras = [];
				assembled.stop();
			};
			return {
				...assembled,
				cleanup,
				iframes,
				network,
				scripts,
				stop,
				track,
				view,
			};
		};
		type Built = ReturnType<typeof build>;

		const main = build(true);
		main.runtime.subscribe(notify);
		// Only a prefetch the runtime streams into its first init: without
		// `streamPrefetch` the promise is ignored, the runtime's own init
		// carries its own journey, and the save must carry that one too.
		if (
			modules.streamPrefetch &&
			initial.prefetch &&
			initial.prefetch !== knownPrefetch
		) {
			// A streamed state carries the journey the server started. It
			// lands before the first save: no prompt shows until it does.
			void (async () => {
				try {
					const streamed = await (initial.prefetch as PromiseLike<
						RuntimePrefetch | undefined
					>);
					main.adoptJourney(
						streamed?.journey === null ? null : streamed?.journey?.id
					);
				} catch {
					// The stream failed; the runtime keeps its own journey.
				}
			})();
		}
		let permissive: Built | null = null;
		if (!enabled) {
			// The main runtime stays detached until it runs, and holds nothing
			// meanwhile: a disabled provider grants every category.
			main.stop();
			main.releaseHold();
			permissive = build(false);
		}
		const active = (): Built => permissive ?? main;

		const setEnabled = function setEnabled(next: boolean): void {
			if (disposed || next === enabled) {
				return;
			}
			enabled = next;
			if (next) {
				permissive?.stop();
				permissive?.runtime.dispose();
				permissive = null;
				if (started) {
					main.runtime.start();
				}
			} else {
				// Coming back, the visitor finds the prompt closed.
				main.runtime.kernel.set.activeUI('none');
				main.stop();
				main.releaseHold();
				permissive = build(false);
				if (started) {
					permissive.runtime.start();
				}
			}
			notify();
		};

		const setConsentCategories = function setConsentCategories(
			categories: AllConsentNames[] | undefined
		): void {
			// Both kernels, so a list set while disabled is in place once the
			// provider is enabled again.
			main.runtime.setConsentCategories(categories);
			permissive?.runtime.setConsentCategories(categories);
		};

		// The rest of `update()` (identity, categories, vendors, modules)
		// loads with the first update, so a provider whose options never
		// change after mount ships none of it in its first-load chunk. Its
		// module imports nothing the first-load chunk has: it gets those
		// through the host, so a bundler does not split them out.
		let applied: ConsentRuntimeUpdate = options;
		let updater: Promise<typeof ProviderUpdateModule> | undefined;
		const host: ProviderUpdateHost = {
			active: () => active(),
			get enabled() {
				return enabled;
			},
			initial,
			main,
			ownerSource,
			tools: {
				afterModuleLoaded,
				declareOwnedVendors,
				extractConsentNamesFromCondition,
				holdNetworkRequests,
				normalizeKernelUser,
				notHeld: NOT_HELD,
				resolveVendors,
			},
		};
		/**
		 * Load the update module and apply what changed. `hold` holds the
		 * requests new network rules match until the blocker has them; it is
		 * released through the updated blocker, or fails closed when the
		 * update never applies.
		 */
		const applyUpdate = async function applyUpdate(
			hold: NetworkHold | undefined
		): Promise<void> {
			// With nothing new, a hold here is for rules an earlier update set
			// and this one put back before it applied; the blocker still has
			// these.
			if (changed(applied, current)) {
				let apply: typeof ProviderUpdateModule.applyProviderUpdate;
				try {
					updater ??= import('./provider-update');
					apply = (await updater).applyProviderUpdate;
				} catch (error) {
					// The next update imports again: one failed chunk request
					// does not fail every later one.
					updater = undefined;
					hold?.block();
					throw error;
				}
				if (disposed) {
					hold?.block();
					return;
				}
				if (applied !== current) {
					const previous = applied;
					applied = current;
					apply(host, previous, current, started);
				}
			}
			hold?.release()();
		};

		// A host that passes `preloadScriptLoader` lets the runtime start
		// the script loader's download now, before `start()` mounts it. It
		// reads the options through the active runtime's view, as `start()`
		// does: live ones from the latest update, the rest as first given.
		modules.preloadScriptLoader?.(
			() =>
				started || disposed
					? undefined
					: [active().runtime.kernel, active().view],
			initial.prefetch,
			createRuntimeKernel,
			modules.createPersistence
		);

		const runtime: ConsentRuntime = main.runtime;
		// Records, identity, IAB, iframes and storage belong to the main
		// runtime whatever `enabled` is; those members come from it unchanged.
		const provider: Omit<
			ConsentProviderRuntime,
			| 'clearRecords'
			| 'experiment'
			| 'iab'
			| 'identify'
			| 'processIframes'
			| 'reconcileStorage'
		> = {
			get consentCategories() {
				return active().runtime.consentCategories;
			},
			dispose() {
				disposed = true;
				started = false;
				permissive?.stop();
				permissive?.runtime.dispose();
				permissive = null;
				main.stop();
				runtime.dispose();
				listeners.clear();
			},
			get enabled() {
				return enabled;
			},
			get kernel() {
				return active().runtime.kernel;
			},
			async reinit() {
				if (enabled) {
					await runtime.reinit();
				}
			},
			setConsentCategories,
			setEnabled,
			setLanguage(language) {
				if (enabled) {
					runtime.setLanguage(language);
					return;
				}
				// No policy to fetch while disabled; the main runtime asks once
				// it runs again.
				runtime.kernel.set.language(language);
				active().runtime.kernel.set.language(language);
				overridesChanged = true;
			},
			setOverrides(overrides) {
				runtime.setOverrides(overrides);
				overridesChanged ||= !started || !enabled;
			},
			start() {
				if (started || disposed || typeof document === 'undefined') {
					return;
				}
				started = true;
				active().runtime.start();
				// The kernel already carries these owners from construction;
				// registering them keeps them when another module re-declares.
				declareOwnedVendors(runtime.kernel, ownersOf(current), ownerSource);
			},
			get started() {
				return started;
			},
			subscribe(listener) {
				listeners.add(listener);
				return function unsubscribe() {
					listeners.delete(listener);
				};
			},
			update(next) {
				if (disposed) {
					return Promise.resolve();
				}
				const previous = current;
				current = { ...next, mode: next.mode ?? initial.mode };
				// Overrides decide what `start()` does with the prefetch, and the
				// toggle swaps the kernel the host renders, so both apply now.
				if (
					overridesKey(current.overrides) !== overridesKey(previous.overrides)
				) {
					runtime.setOverrides(current.overrides ?? {});
					if (started && enabled) {
						void runtime.reinit();
					} else {
						// The next `start()` asks the backend instead of adopting
						// the prefetch.
						overridesChanged = true;
					}
				}
				// Mounts every module again from the new options.
				setEnabled(current.enabled ?? true);
				// Categories decide what is granted, so they apply now too.
				if (
					JSON.stringify(current.consentCategories) !==
					JSON.stringify(previous.consentCategories)
				) {
					setConsentCategories(current.consentCategories);
				}
				// New or wider network rules reach the blocker with the update
				// module. Until then, hold what they match, as the runtime holds
				// requests from construction until the blocker loads.
				const before = previous.networkBlocker || undefined;
				const after = current.networkBlocker || undefined;
				const hold =
					started &&
					enabled &&
					after &&
					after.enabled !== false &&
					(after.rules !== before?.rules || before?.enabled === false)
						? holdNetworkRequests(after.rules)
						: undefined;
				return applyUpdate(hold);
			},
		};
		return Object.setPrototypeOf(provider, runtime) as ConsentProviderRuntime;
	};
