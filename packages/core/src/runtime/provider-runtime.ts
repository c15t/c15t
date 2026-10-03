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
 * both build modules through replaceable handles, so a module whose
 * options changed is rebuilt without touching the others.
 */
import type { AllConsentNames } from '../consent/consent-types';
import { hostExperiment } from '../libs/experiment';
import { extractConsentNamesFromCondition } from '../libs/has';
import { declareOwnedVendors, resolveVendors } from '../libs/vendors';
import { holdNetworkRequests, NOT_HELD } from '../modules/network-blocker/hold';
import type { NetworkBlockerHandle } from '../modules/network-blocker/types';
import type { ScriptLoaderHandle } from '../modules/script-loader/types';
import type { KernelUser } from '../types';
import { assembleConsentRuntime, storageFor } from './assemble';
import { normalizeKernelUser } from './runtime-kernel';
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
	'storageConfig',
	'user',
	'vendors',
]);

const isPromiseLike = function isPromiseLike<Value>(
	value: Value | PromiseLike<Value> | undefined
): value is PromiseLike<Value> {
	return typeof (value as PromiseLike<Value> | undefined)?.then === 'function';
};

/** The prefetch known now: none while a promise is still pending. */
const syncPrefetch = function syncPrefetch(
	prefetch: ConsentProviderRuntimeOptions['prefetch']
): RuntimePrefetch | undefined {
	return isPromiseLike(prefetch) ? undefined : prefetch;
};

const isProduction = function isProduction(): boolean {
	return (
		(globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env
			?.NODE_ENV === 'production'
	);
};

const warnInDevelopment = function warnInDevelopment(message: string): void {
	if (!isProduction()) {
		console.warn(message);
	}
};

/** Every field `identify()` sends, in a fixed order. */
const userKey = function userKey(user: KernelUser | undefined): string {
	return JSON.stringify(
		user && [
			user.externalId,
			user.externalIdType,
			user.identityProvider,
			user.properties,
		]
	);
};

/** Overrides compared without regard to key order. */
const overridesKey = function overridesKey(
	overrides: ConsentRuntimeUpdate['overrides']
): string {
	return JSON.stringify(Object.entries(overrides ?? {}).sort());
};

/** The scripts and rules whose slugs declare vendors. */
const ownersOf = function ownersOf(options: ConsentRuntimeUpdate) {
	return [
		...(options.scripts ?? []),
		...(options.networkBlocker ? (options.networkBlocker.rules ?? []) : []),
	];
};

const vendorsKey = function vendorsKey(options: ConsentRuntimeUpdate): string {
	return JSON.stringify([
		options.vendors ?? [],
		ownersOf(options).map((owner) => [owner.vendor ?? null, owner.category]),
	]);
};

const initialOnlyKey = function initialOnlyKey(
	options: ConsentRuntimeUpdate
): string {
	return JSON.stringify([
		options.mode?.kind,
		options.i18n,
		hostExperiment(options.experiment, syncPrefetch(options.prefetch)),
	]);
};

interface Replaceable<Options, Handle extends { dispose: () => void }> {
	/** The factory a runtime mounts through. */
	create: (options: Options) => Handle;
	/** The module now mounted, if any. */
	current: () => Handle | null;
	/**
	 * Build the module again with changed options, or mount it when no
	 * runtime has. `null` unmounts it.
	 */
	replace: (changes: Partial<Options> | null) => void;
}

/**
 * A module factory whose mounted module the provider can rebuild.
 *
 * The runtime keeps the stand-in handle and disposes it on stop; the
 * provider swaps what is behind it. A module the runtime never mounted
 * (configured after `start()`) is mounted here and torn down by `stop`.
 */
const replaceable = function replaceable<
	Options,
	Handle extends { dispose: () => void },
>(
	factory: (options: Options) => Handle,
	initialOptions: () => NoInfer<Options>,
	onDispose: (dispose: () => void) => void
): Replaceable<Options, Handle> {
	let inner: Handle | null = null;
	let last: Options | null = null;
	const standIn = new Proxy({} as Handle, {
		get: (_target, method) =>
			method === 'dispose'
				? () => {
						inner?.dispose();
						inner = null;
					}
				: (...args: unknown[]) =>
						(
							inner as Record<PropertyKey, (...a: unknown[]) => unknown> | null
						)?.[method]?.(...args),
	});
	return {
		create(options) {
			last = options;
			inner = factory(options);
			return standIn;
		},
		current: () => inner,
		replace(changes) {
			const mountedByRuntime = last !== null && inner !== null;
			inner?.dispose();
			inner = null;
			if (!changes) {
				return;
			}
			const options = { ...(last ?? initialOptions()), ...changes };
			last = options;
			inner = factory(options);
			if (!mountedByRuntime) {
				onDispose(standIn.dispose);
			}
		},
	};
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
			const pending = on && isPromiseLike(initial.prefetch);
			if (pending && !streamPrefetch) {
				warnInDevelopment(
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
						// overrides changed before start, the prefetch answers for
						// other inputs: start asks the backend instead.
						const prefetch = syncPrefetch(initial.prefetch);
						return prefetch && overridesChanged
							? { ...prefetch, initialPolicyPending: true }
							: prefetch;
					}
					const source = LIVE_OPTIONS.has(key) ? current : initial;
					return source[key as keyof ConsentRuntimeUpdate];
				},
			});
			const track = (dispose: () => void) => extras.push(dispose);
			const kernelOf = () => (built.runtime as ConsentRuntime).kernel;
			const scripts = replaceable(
				modules.createScriptLoader,
				() => ({
					kernel: kernelOf(),
					nonce: current.nonce,
					onDebug: current.scriptLoader?.onDebug,
					scripts: [],
				}),
				track
			);
			const network = replaceable(
				modules.createNetworkBlocker,
				() => ({ hold: NOT_HELD, kernel: kernelOf(), rules: [] }),
				track
			);
			const iframes = replaceable(
				modules.createIframeBlocker,
				() => ({ kernel: kernelOf() }),
				track
			);
			const cleanup = replaceable(
				modules.createClearOnRevocation,
				() => ({
					config: initial.clearOnRevocation ?? {},
					kernel: kernelOf(),
				}),
				track
			);
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
			return { ...assembled, cleanup, iframes, network, scripts, stop, track };
		};
		type Built = ReturnType<typeof build>;

		const main = build(true);
		main.runtime.onIABChange(notify);
		let permissive: Built | null = null;
		if (!enabled) {
			// The main runtime stays detached until it runs.
			main.stop();
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
				permissive = build(false);
				if (started) {
					permissive.runtime.start();
				}
			}
			notify();
		};

		/** Re-declare vendors after the vendors, scripts or rules changed. */
		const redeclareVendors = function redeclareVendors(): void {
			const { kernel } = main.runtime;
			const owners = ownersOf(current);
			// Resolved against the backend entries the kernel already holds, so
			// a script that starts naming a backend vendor's slug attaches to
			// that entry as an owner and survives the backend dropping it.
			const declared = resolveVendors({
				config: current.vendors,
				existing: (kernel.getSnapshot().vendors?.declared ?? []).flatMap(
					(vendor) => {
						// A backend copy a config entry shadows counts too:
						// replacing the config source restores it.
						const manifest =
							vendor.source === 'manifest' ? vendor : vendor.shadowed;
						if (manifest?.source !== 'manifest') {
							return [];
						}
						const { ownerCategory: _stale, ...rest } = manifest;
						return [rest];
					}
				),
				onWarn: warnInDevelopment,
			});
			// The provider owns the config source outright: a vendor the host
			// removed disappears, and a backend entry a config copy shadowed
			// comes back. Its owners are then declared under its own token.
			kernel.set.vendors({ declared }, { replaceSource: 'config' });
			declareOwnedVendors(kernel, owners, ownerSource);
			kernel.set.registerConsentCategories(
				[...declared, ...owners].flatMap((declaration) =>
					extractConsentNamesFromCondition(declaration.category)
				)
			);
		};

		/** Bring a started runtime's modules up to the new options. */
		// oxlint-disable-next-line complexity -- One comparison per live module option.
		const syncModules = function syncModules(
			target: Built,
			previous: ConsentRuntimeUpdate
		): void {
			if (current.scripts !== previous.scripts) {
				const loader: ScriptLoaderHandle | null = target.scripts.current();
				if (loader) {
					loader.updateScripts(current.scripts ?? []);
				} else if (current.scripts?.length) {
					target.scripts.replace({ scripts: current.scripts });
					// Data clearing subscribes after the loader, so revocation
					// callbacks finish before browser data is removed.
					if (target.cleanup.current()) {
						target.cleanup.replace({});
					}
				}
			}
			if (!enabled) {
				// Only the script loader runs while disabled.
				return;
			}
			const before = previous.networkBlocker || undefined;
			const after = current.networkBlocker || undefined;
			const blocker: NetworkBlockerHandle | null = target.network.current();
			if (after && blocker) {
				if (after.rules !== before?.rules) {
					blocker.updateRules(after.rules);
				}
				if (after.enabled !== undefined && after.enabled !== before?.enabled) {
					blocker.setEnabled(after.enabled);
				}
			} else if (after) {
				// Hold matching requests until the blocker, possibly lazy, lands.
				const hold =
					after.enabled === false ? NOT_HELD : holdNetworkRequests(after.rules);
				target.network.replace({ ...after, hold });
				// A blocker that never loaded never took the hold over: fail
				// what it held closed. A no-op once it did.
				target.track(() => hold.block());
			} else if (blocker) {
				target.network.replace(null);
			}
			const iframeOn = current.iframeBlocker !== false;
			if (
				iframeOn !== Boolean(target.iframes.current()) ||
				(current.iframeBlocker || undefined)?.disableAutomaticBlocking !==
					(previous.iframeBlocker || undefined)?.disableAutomaticBlocking
			) {
				target.iframes.replace(
					iframeOn
						? {
								disableAutomaticBlocking: (current.iframeBlocker || undefined)
									?.disableAutomaticBlocking,
							}
						: null
				);
			}
			if (
				target.cleanup.current() &&
				storageFor(current)?.storageKey !== storageFor(previous)?.storageKey
			) {
				target.cleanup.replace({ storageConfig: storageFor(current) });
			}
		};

		const setConsentCategories = function setConsentCategories(
			categories: AllConsentNames[] | undefined
		): void {
			// Both kernels, so a list set while disabled is in place once the
			// provider is enabled again.
			main.runtime.setConsentCategories(categories);
			permissive?.runtime.setConsentCategories(categories);
		};

		const runtime: ConsentRuntime = main.runtime;
		// Records, identity, IAB, iframes and storage belong to the main
		// runtime whatever `enabled` is; those members come from it unchanged.
		const provider: Omit<
			ConsentProviderRuntime,
			| 'clearRecords'
			| 'experiment'
			| 'iab'
			| 'identify'
			| 'onIABChange'
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
			resetVendorDraft: () => active().runtime.resetVendorDraft(),
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
			},
			setOverrides(overrides) {
				runtime.setOverrides(overrides);
				overridesChanged ||= !started;
			},
			stageVendorConsent: (vendorId, granted) =>
				active().runtime.stageVendorConsent(vendorId, granted),
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
			// oxlint-disable-next-line complexity -- One comparison per live option.
			update(next) {
				if (disposed) {
					return;
				}
				const previous = current;
				current = { ...next, mode: next.mode ?? initial.mode };
				if (
					!isProduction() &&
					initialOnlyKey(current) !== initialOnlyKey(previous)
				) {
					console.warn(
						'c15t: `mode`, `i18n` and `experiment` are read once. Create a new runtime (remount the provider) to change them.'
					);
				}
				const user = normalizeKernelUser(current.user);
				if (userKey(user) !== userKey(normalizeKernelUser(previous.user))) {
					void runtime.identify(user);
				}
				if (
					overridesKey(current.overrides) !== overridesKey(previous.overrides)
				) {
					runtime.setOverrides(current.overrides ?? {});
					overridesChanged ||= !started;
					if (started && enabled) {
						void runtime.reinit();
					}
				}
				if (
					JSON.stringify(current.consentCategories) !==
					JSON.stringify(previous.consentCategories)
				) {
					setConsentCategories(current.consentCategories);
				}
				if (vendorsKey(current) !== vendorsKey(previous)) {
					redeclareVendors();
				}
				const nextEnabled = current.enabled ?? true;
				if (nextEnabled !== enabled) {
					// Mounts every module again from the new options.
					setEnabled(nextEnabled);
				} else if (started) {
					syncModules(active(), previous);
				}
			},
		};
		return Object.setPrototypeOf(provider, runtime) as ConsentProviderRuntime;
	};
