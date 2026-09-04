/**
 * Page-level consent runtime — interim local shim.
 *
 * Astro is an MPA and islands never share a component tree, so there is no
 * provider to hang the kernel off. One runtime is created per page by the
 * script the integration injects, and every island, inline `<script>` and
 * framework surface reads that one object.
 *
 * @remarks
 * This mirrors the settled `createConsentRuntime` contract from
 * `@c15t/core/runtime` — same factory signature, same handle shape, same
 * injected `createIAB` factory, same lifecycle split between construction
 * (SSR-safe, plus early cookie hydration in the browser) and `start()`.
 * When that module lands, `packages/astro/src/runtime/index.ts` is deleted
 * and the imports move to `@c15t/core/runtime`; nothing else changes.
 */

import { createConsentKernel } from '@c15t/core';
import type {
	AllConsentNames,
	ConsentKernel,
	ConsentState,
	KernelConfig,
	KernelOverrides,
	KernelTranslations,
	KernelUser,
	PolicyConfig,
	ProviderTransportContext,
	ProviderTransportFactory,
	Script,
	StorageConfig,
	Unsubscribe,
	User,
} from '@c15t/core';
import { createPersistence } from '@c15t/core/modules/persistence';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import {
	createWindowDebug,
	resolveWindowDebugMode,
} from '@c15t/core/modules/window-debug';

/** Every category granted. Used when the runtime is disabled. */
export const ALL_CONSENTS_GRANTED: ConsentState = {
	experience: true,
	functionality: true,
	marketing: true,
	measurement: true,
	necessary: true,
};

/** The IAB handle surface the runtime exposes. */
export interface ConsentRuntimeIABHandle {
	dispose: () => void;
	[key: string]: unknown;
}

/** Options passed to an injected IAB factory. */
export interface ConsentRuntimeIABFactoryOptions {
	kernel: ConsentKernel;
	cmpId: number;
	[key: string]: unknown;
}

/**
 * `createIAB` from `@c15t/iab`.
 *
 * IAB is injected rather than imported: `@c15t/iab` depends on
 * `@c15t/core`, so core cannot depend back on it.
 */
export type ConsentRuntimeIABFactory = (
	options: ConsentRuntimeIABFactoryOptions
) => ConsentRuntimeIABHandle;

/** IAB configuration accepted by the runtime. */
export interface RuntimeIABOptions {
	enabled?: boolean;
	cmpId?: number;
	cmpVersion?: number;
	gvl?: unknown;
	[key: string]: unknown;
}

/** Persistence configuration accepted by the runtime. */
export interface RuntimePersistenceOptions {
	skipHydration?: boolean;
	storageConfig?: StorageConfig;
}

/** Options for {@link createConsentRuntime}. */
export interface ConsentRuntimeOptions {
	/** Set `false` to grant everything and never show a surface. */
	enabled?: boolean;
	/** Transport factory. Required. Build it with `hosted()`/`offline()`/`custom()`. */
	mode: ProviderTransportFactory;
	/** Cookie/localStorage configuration. */
	storageConfig?: StorageConfig;
	/** External identity to associate consent with. */
	user?: User | KernelUser;
	/** Request-level overrides layered over the prefetched ones. */
	overrides?: KernelOverrides;
	/** Server-resolved kernel configuration inlined into the page. */
	prefetch?: KernelConfig;
	/** Consent-gated scripts. */
	scripts?: Script[];
	/** IAB TCF configuration. `false` disables it. */
	iab?: RuntimeIABOptions | false;
	/** `false` disables persistence entirely. */
	persistence?: boolean | RuntimePersistenceOptions;
	/** Policy packs for local resolution. */
	policies?: PolicyConfig[];
	/** Categories the surfaces offer. */
	consentCategories?: AllConsentNames[];
	/** Translations used when the transport supplies none. */
	translations?: KernelTranslations;
	/** IAB factory. Without it, IAB stays unmounted. */
	createIAB?: ConsentRuntimeIABFactory;
	/** Label reported through `window.c15t`. */
	pkg?: string;
}

/** The externally owned runtime handed to UI surfaces. */
export interface ConsentRuntime {
	/** The one kernel for this page. */
	readonly kernel: ConsentKernel;
	/** IAB handle, once the kernel reports a `cmpId`. `null` when disabled. */
	readonly iab: ConsentRuntimeIABHandle | null;
	/** Categories the surfaces should offer. */
	readonly consentCategories: AllConsentNames[];
	/** Whether {@link ConsentRuntime.start} has run. */
	readonly started: boolean;
	/** Mount side effects and run the first init. Idempotent. */
	start: () => void;
	/** Tear everything down in reverse order; the kernel goes last. */
	dispose: () => void;
	/**
	 * Associate consent with an external identity. Never rejects.
	 *
	 * @param user - The external user, in v2 or kernel shape.
	 */
	identify: (user: User | KernelUser | undefined) => Promise<void>;
	/**
	 * Replace the request-level overrides.
	 *
	 * @param overrides - The new overrides.
	 */
	setOverrides: (overrides: KernelOverrides) => void;
	/** Re-run init and settle `activeUI`. */
	reinit: () => Promise<void>;
	/**
	 * Replace the configured categories.
	 *
	 * @param categories - The new category list.
	 */
	setConsentCategories: (categories: AllConsentNames[]) => void;
	/**
	 * Observe IAB handle availability.
	 *
	 * @param listener - Called when the handle appears or is torn down.
	 * @returns An unsubscribe function.
	 */
	onIABChange: (
		listener: (handle: ConsentRuntimeIABHandle | null) => void
	) => Unsubscribe;
	/**
	 * Swap the consent-gated script list.
	 *
	 * @param scripts - The new scripts.
	 */
	updateScripts: (scripts: Script[]) => void;
}

/**
 * Normalize a v2 `{ id }` user into the kernel's `{ externalId }` shape.
 *
 * @param user - A v2 or kernel user.
 * @returns The kernel user, or `undefined`.
 */
export const normalizeKernelUser = function normalizeKernelUser(
	user: User | KernelUser | undefined
): KernelUser | undefined {
	if (!user) {
		return undefined;
	}
	if ('externalId' in user) {
		return user;
	}
	const legacy = user as User;
	return {
		externalId: legacy.id,
		identityProvider: legacy.identityProvider,
	};
};

const normalizePersistence = function normalizePersistence(
	options: ConsentRuntimeOptions
): RuntimePersistenceOptions | false {
	if (options.persistence === false) {
		return false;
	}
	if (options.persistence === true || options.persistence === undefined) {
		return { storageConfig: options.storageConfig };
	}
	return {
		skipHydration: options.persistence.skipHydration,
		storageConfig: options.persistence.storageConfig ?? options.storageConfig,
	};
};

/**
 * Build the kernel for a runtime without mounting any side effects.
 *
 * @param options - Runtime options.
 * @returns A kernel seeded from the prefetched configuration.
 */
export const createRuntimeKernel = function createRuntimeKernel(
	options: ConsentRuntimeOptions
): ConsentKernel {
	const prefetch = options.prefetch ?? {};
	const enabled = options.enabled !== false;
	const transportContext: ProviderTransportContext = {
		consentCategories: options.consentCategories,
		policies: options.policies,
		prefetch,
		translations: options.translations ?? {
			language: 'en',
			translations: {} as KernelTranslations['translations'],
		},
	};
	return createConsentKernel({
		...prefetch,
		initialConsents: enabled
			? (prefetch.initialConsents ?? undefined)
			: ALL_CONSENTS_GRANTED,
		initialOverrides: {
			...(prefetch.initialOverrides ?? {}),
			...(options.overrides ?? {}),
		},
		initialTranslations:
			prefetch.initialTranslations ?? options.translations ?? undefined,
		initialUser: normalizeKernelUser(options.user) ?? prefetch.initialUser,
		transport: options.mode(transportContext),
	});
};

/**
 * Create the page-level consent runtime.
 *
 * Construction is SSR-safe. In the browser it also hydrates persisted
 * consent immediately, so `kernel.getSnapshot()` is correct before
 * {@link ConsentRuntime.start} runs and a returning visitor never sees a
 * banner flash.
 *
 * @param options - Transport, prefetched config and module configuration.
 * @returns A runtime that owns the kernel for this page.
 * @example
 * ```ts
 * import { createIAB } from '@c15t/iab';
 *
 * const runtime = createConsentRuntime({
 *   mode,
 *   prefetch,
 *   createIAB,
 *   pkg: '@c15t/astro',
 * });
 * runtime.start();
 * ```
 */
export const createConsentRuntime = function createConsentRuntime(
	options: ConsentRuntimeOptions
): ConsentRuntime {
	const kernel = createRuntimeKernel(options);
	const enabled = options.enabled !== false;
	const persistenceOptions = normalizePersistence(options);

	let started = false;
	let disposed = false;
	let iabHandle: ConsentRuntimeIABHandle | null = null;
	let scriptLoader: ReturnType<typeof createScriptLoader> | null = null;
	let categories: AllConsentNames[] = options.consentCategories ?? [];
	let earlyPersistence: ReturnType<typeof createPersistence> | null = null;
	const disposers: (() => void)[] = [];
	const iabListeners = new Set<
		(handle: ConsentRuntimeIABHandle | null) => void
	>();

	const setIAB = function setIAB(handle: ConsentRuntimeIABHandle | null) {
		iabHandle = handle;
		for (const listener of iabListeners) {
			listener(handle);
		}
	};

	// Hydrating at construction — not in `start()` — is what keeps a
	// returning visitor from seeing the banner flash before the first frame.
	if (
		enabled &&
		persistenceOptions &&
		persistenceOptions.skipHydration !== true &&
		typeof document !== 'undefined' &&
		typeof localStorage !== 'undefined'
	) {
		earlyPersistence = createPersistence({
			kernel,
			storageConfig: persistenceOptions.storageConfig,
		});
		if (kernel.getSnapshot().hasConsented) {
			kernel.set.activeUI('none');
		}
	}

	if (!enabled) {
		kernel.set.consent(ALL_CONSENTS_GRANTED);
		kernel.set.hasConsented(true);
		kernel.set.activeUI('none');
	}

	const mountIAB = function mountIAB() {
		if (iabHandle || !options.createIAB) {
			return;
		}
		const { iab } = options;
		if (!iab || iab.enabled === false) {
			return;
		}
		const current = kernel.getSnapshot().iab;
		const cmpId = iab.cmpId ?? current?.cmpId;
		if (typeof cmpId !== 'number') {
			return;
		}
		const handle = options.createIAB({
			...iab,
			cmpId,
			gvl: iab.gvl ?? current?.gvl ?? undefined,
			kernel,
		});
		setIAB(handle);
		disposers.push(() => {
			handle.dispose();
			setIAB(null);
		});
	};

	return {
		get consentCategories() {
			return categories;
		},
		dispose() {
			disposed = true;
			for (const dispose of disposers.reverse()) {
				dispose();
			}
			disposers.length = 0;
			iabListeners.clear();
			scriptLoader = null;
			started = false;
			kernel.dispose();
		},
		get iab() {
			return iabHandle;
		},
		async identify(user: User | KernelUser | undefined) {
			const normalized = normalizeKernelUser(user);
			if (!normalized) {
				return;
			}
			try {
				await kernel.commands.identify(normalized);
			} catch {
				// The kernel emits `command:error`; identify never rejects.
			}
		},
		kernel,
		onIABChange(listener) {
			iabListeners.add(listener);
			return () => iabListeners.delete(listener);
		},
		async reinit() {
			if (!enabled) {
				return;
			}
			await kernel.commands.init();
			if (kernel.getSnapshot().hasConsented) {
				kernel.set.activeUI('none');
			}
		},
		setConsentCategories(next: AllConsentNames[]) {
			categories = next;
		},
		setOverrides(overrides: KernelOverrides) {
			kernel.set.overrides(overrides);
		},
		start() {
			if (started || disposed || typeof document === 'undefined') {
				return;
			}
			started = true;

			const windowDebug = createWindowDebug({
				mode: resolveWindowDebugMode(options.mode),
				pkg: options.pkg ?? '@c15t/astro',
			});
			disposers.push(() => windowDebug.dispose());

			if (enabled && persistenceOptions) {
				const persistence =
					earlyPersistence ??
					createPersistence({
						kernel,
						skipHydration: true,
						storageConfig: persistenceOptions.storageConfig,
					});
				disposers.push(() => {
					persistence.dispose();
					earlyPersistence = null;
				});
			}

			if (enabled && options.scripts && options.scripts.length > 0) {
				const loader = createScriptLoader({
					kernel,
					scripts: options.scripts,
				});
				scriptLoader = loader;
				disposers.push(() => loader.dispose());
			}

			if (enabled && options.iab && options.iab.enabled !== false) {
				mountIAB();
				// A hosted `/init` can be what supplies the cmpId, so keep
				// watching until one arrives.
				disposers.push(kernel.subscribe(mountIAB));
			}

			if (enabled) {
				void (async () => {
					await kernel.commands.init();
					if (kernel.getSnapshot().hasConsented) {
						kernel.set.activeUI('none');
					}
				})();
			}
		},
		get started() {
			return started;
		},
		updateScripts(scripts: Script[]) {
			scriptLoader?.updateScripts(scripts);
		},
	};
};
