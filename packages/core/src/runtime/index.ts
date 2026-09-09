/**
 * `@c15t/core/runtime` — the framework-agnostic consent runtime.
 *
 * A provider is two things: a kernel wired to every opt-in module, and a
 * component tree that renders it. This module is the first half. It builds
 * a kernel from the prepared server snapshot, then mounts persistence,
 * the script loader, network and iframe blockers, IAB, the callback bridge,
 * `window.c15t`
 * and the initial `init()` on `start()` — and undoes all of it on
 * `dispose()`.
 *
 * Framework packages own reactivity and rendering; they do not re-derive
 * any of this. Hosts without a component tree (an Astro page whose islands
 * cannot share context, a SvelteKit root layout) create one runtime and
 * hand it to whatever renders.
 *
 * @example
 * ```ts
 * import { createConsentRuntime } from '@c15t/core/runtime';
 * import { hosted } from '@c15t/core';
 *
 * const runtime = createConsentRuntime({
 *   mode: hosted({ url: '/api/c15t' }),
 *   pkg: '@c15t/astro',
 * });
 * runtime.start();
 * ```
 */
import { resolvePolicyRules } from '@c15t/schema/types';
import { deepMergeTranslations } from '@c15t/translations';
import type { I18nConfig } from '@c15t/translations';

import type { AllConsentNames } from '../consent/consent-types';
import { createConsentKernel } from '../kernel';
import { createIframeBlocker } from '../modules/iframe-blocker';
import { createNetworkBlocker } from '../modules/network-blocker';
import { createPersistence } from '../modules/persistence';
import type { PersistenceHandle } from '../modules/persistence';
import { createScriptLoader } from '../modules/script-loader';
import {
	createWindowDebug,
	resolveWindowDebugMode,
} from '../modules/window-debug';
import type { User } from '../options/user';
import { defaultTranslationConfig } from '../translations';
import type { ProviderTransportContext } from '../transports/mode';
import type {
	ConsentKernel,
	ConsentState,
	KernelConfig,
	KernelOverrides,
	KernelTranslations,
	KernelUser,
	TranslationsResponse,
} from '../types';
import { wireRuntimeCallbacks } from './callbacks';
import { isIABConfigured } from './iab-options';
import type {
	ConsentRuntime,
	ConsentRuntimeIABFactoryOptions,
	ConsentRuntimeIABHandle,
	ConsentRuntimeOptions,
	RuntimeIABOptions,
	RuntimePersistenceOptions,
} from './types';

export type {
	ConsentRuntime,
	ConsentRuntimeIABFactory,
	ConsentRuntimeIABFactoryOptions,
	ConsentRuntimeIABHandle,
	ConsentRuntimeOptions,
	RuntimeIABOptions,
	RuntimeNetworkBlockerOptions,
	RuntimePersistenceOptions,
	RuntimeScriptLoaderOptions,
} from './types';
export type { WireRuntimeCallbacksOptions } from './callbacks';
export { stringifyRuntimeError, wireRuntimeCallbacks } from './callbacks';
export type { IABModuleLoader, LazyIABFactory } from './lazy-iab';
export { isIABConfigured } from './iab-options';
export { createLazyIABFactory } from './lazy-iab';

/**
 * Every consent category granted.
 *
 * The snapshot a disabled runtime (`enabled: false`) reports, so anything
 * reading consent sees an unrestricted visitor. It does not make the
 * side-effecting modules run: `start()` mounts neither the script loader
 * nor the network blocker when disabled, so scripts in `options.scripts`
 * never execute and iframes are simply never blocked.
 */
export const ALL_CONSENTS_GRANTED: ConsentState = {
	experience: true,
	functionality: true,
	marketing: true,
	measurement: true,
	necessary: true,
};

const DEFAULT_TRANSLATIONS: KernelTranslations = {
	language: 'en',
	translations: defaultTranslationConfig.translations.en as never,
};

/**
 * Normalizes the two accepted subject shapes into the kernel's `KernelUser`.
 *
 * v2 callers pass `{ id, identityProvider }`; v3 callers pass
 * `{ externalId, identityProvider }`.
 *
 * @param user - The configured subject, if any.
 * @returns The kernel-shaped user, or `undefined` when none was supplied.
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

/**
 * Resolves `i18n` into the kernel's initial translations.
 *
 * The selected locale's bundled translations are the base; the caller's
 * `messages` for that locale are merged over them, so a partial override
 * keeps every default it did not mention. A locale on its own selects the
 * bundled translations for that locale — `i18n` is documented as locale
 * *and* message overrides, and a caller who names a locale means it.
 *
 * @param i18n - Locale and message overrides, if any.
 * @returns Kernel translations, or `undefined` when `i18n` says nothing.
 */
export const resolveRuntimeTranslations = function resolveRuntimeTranslations(
	i18n: Partial<I18nConfig> | undefined
): KernelTranslations | undefined {
	if (!(i18n?.messages || i18n?.locale)) {
		return undefined;
	}
	const language =
		i18n.locale ?? defaultTranslationConfig.defaultLanguage ?? 'en';
	const fallbackTranslations = defaultTranslationConfig.translations
		.en as TranslationsResponse;
	const base = (defaultTranslationConfig.translations[
		language as keyof typeof defaultTranslationConfig.translations
	] ?? fallbackTranslations) as TranslationsResponse;
	if (!i18n.messages) {
		return { language, translations: base };
	}
	const selected =
		i18n.messages[language] ?? i18n.messages.en ?? fallbackTranslations;
	return {
		language,
		translations: deepMergeTranslations(
			base as never,
			selected as never
		) as TranslationsResponse,
	};
};

const DISABLED_RESOLUTION = resolvePolicyRules({
	countryCode: null,
	regionCode: null,
	rules: [
		{
			id: 'disabled',
			match: { fallback: true },
			model: 'opt-out',
			prompt: 'none',
		},
	],
});

const normalizePersistenceOptions = function normalizePersistenceOptions(
	options: ConsentRuntimeOptions
): RuntimePersistenceOptions | false {
	if (options.persistence === false) {
		return false;
	}
	const { storageConfig } = options;
	if (options.persistence === true || options.persistence === undefined) {
		return { storageConfig };
	}
	return {
		skipHydration: options.persistence.skipHydration,
		storageConfig: options.persistence.storageConfig ?? storageConfig,
	};
};

/**
 * Whether a prefetch already carries a server-resolved policy.
 *
 * A resolved prefetch is what `/init` would have returned: the policy, the
 * decision that produced it, and no provisional marker. The kernel is
 * built from it, so calling `init()` again on `start()` would re-fetch the
 * same answer and cost every SSR page one request. Frameworks that render
 * with a prefetch (SvelteKit `loadConsent`, the Astro middleware, Nuxt)
 * therefore skip the initial call; `reinit()`, a language or override
 * change, and any app without a prefetch still go to the backend.
 *
 * @param prefetch - The runtime's `prefetch` option, if any.
 * @returns `true` when init would be redundant.
 */
export const hasResolvedPrefetch = function hasResolvedPrefetch(
	prefetch: KernelConfig | undefined
): boolean {
	return Boolean(
		prefetch?.initialPolicyResolution && prefetch.initialPolicyPending !== true
	);
};

const requireTransportFactory = function requireTransportFactory(
	options: ConsentRuntimeOptions
) {
	if (typeof options.mode !== 'function') {
		throw new Error(
			'c15t v3 ConsentManagerProvider: `mode` is required. Use hosted(), offline(), or custom().'
		);
	}
	return options.mode;
};

/**
 * Builds the runtime's kernel without touching the DOM.
 *
 * Exported so servers can construct the same kernel a browser runtime
 * would and serialize its snapshot.
 *
 * @param options - The runtime options.
 * @returns A fresh, unstarted consent kernel.
 * @throws {Error} When `mode` is not a transport factory.
 */
// oxlint-disable-next-line complexity -- Preserve established branch order and control flow.
export const createRuntimeKernel = function createRuntimeKernel(
	options: ConsentRuntimeOptions
): ConsentKernel {
	const enabled = options.enabled ?? true;
	const prefetch = options.prefetch ?? {};
	const i18nTranslations =
		resolveRuntimeTranslations(options.i18n) ?? DEFAULT_TRANSLATIONS;

	const transportContext: ProviderTransportContext = {
		consentCategories: options.consentCategories,
		iabEnabled: isIABConfigured(options.iab),
		policyRules: options.policyRules,
		prefetch,
		translations: i18nTranslations,
	};
	const transport = requireTransportFactory(options)(transportContext);

	return createConsentKernel({
		...prefetch,
		initialOverrides: {
			...(prefetch.initialOverrides ?? {}),
			...(options.overrides ?? {}),
		},
		initialPolicyPending:
			prefetch.initialPolicyPending ??
			(enabled && !prefetch.initialPolicyResolution),
		initialPolicyResolution: enabled
			? prefetch.initialPolicyResolution
			: DISABLED_RESOLUTION,
		initialTranslations: prefetch.initialTranslations ?? i18nTranslations,
		initialUser: normalizeKernelUser(options.user) ?? prefetch.initialUser,
		now:
			prefetch.now ??
			prefetch.initialRecords?.now ??
			(prefetch.initialRecords ? undefined : 0),
		transport,
	});
};

const normalizeIABOptions = function normalizeIABOptions(
	kernel: ConsentKernel,
	iab: RuntimeIABOptions | undefined
): Omit<ConsentRuntimeIABFactoryOptions, 'kernel'> | null {
	if (iab === false || !iab || iab.enabled === false) {
		return null;
	}
	const currentIab = kernel.getSnapshot().iab;
	const cmpId = iab.cmpId ?? currentIab?.cmpId;
	if (typeof cmpId !== 'number') {
		return null;
	}
	return {
		cmpId,
		cmpVersion:
			typeof iab.cmpVersion === 'string'
				? Number(iab.cmpVersion)
				: iab.cmpVersion,
		customVendors: iab.customVendors ?? currentIab?.customVendors,
		gvl: iab.gvl ?? currentIab?.gvl ?? undefined,
		gvlURL: iab.gvlURL,
		isServiceSpecific: iab.isServiceSpecific,
		publisherCountryCode: iab.publisherCountryCode,
		vendors: iab.vendors,
	};
};

/**
 * Creates a consent runtime: a kernel plus every opt-in module, wired.
 *
 * Construction preserves the prepared server snapshot. Storage hydration and
 * browser privacy-signal activation happen on start.
 *
 * Nothing else happens until {@link ConsentRuntime.start} is called.
 *
 * @param options - The runtime configuration.
 * @returns The runtime handle.
 * @throws {Error} When `mode` is not a transport factory.
 *
 * @example
 * ```ts
 * const runtime = createConsentRuntime({
 *   createIAB,
 *   iab: { cmpId: 123 },
 *   mode: hosted({ url: '/api/c15t' }),
 *   scripts: [{ category: 'measurement', id: 'ga', src: '...' }],
 * });
 * runtime.start();
 * // ... later
 * runtime.dispose();
 * ```
 */
// oxlint-disable-next-line max-lines-per-function -- One cohesive lifecycle: construct, start, dispose.
export const createConsentRuntime = function createConsentRuntime(
	options: ConsentRuntimeOptions
): ConsentRuntime {
	const enabled = options.enabled ?? true;
	const persistenceOptions = normalizePersistenceOptions(options);
	const kernel = createRuntimeKernel(options);

	let consentCategories: AllConsentNames[] = options.consentCategories ?? [];
	let iabHandle: ConsentRuntimeIABHandle | null = null;
	let started = false;
	let disposed = false;

	const iabListeners = new Set<
		(handle: ConsentRuntimeIABHandle | null) => void
	>();
	const emitIAB = function emitIAB(handle: ConsentRuntimeIABHandle | null) {
		iabHandle = handle;
		for (const listener of iabListeners) {
			listener(handle);
		}
	};

	// Teardown runs in reverse push order, so the kernel — pushed first —
	// is disposed last, after every module that reads from it.
	const disposers: (() => void)[] = [() => kernel.dispose()];
	disposers.push(
		wireRuntimeCallbacks({
			callbacks: options.callbacks,
			kernel,
		})
	);

	let persistenceHandle: PersistenceHandle | null = null;

	const runInit = async function runInit(): Promise<void> {
		if (disposed) {
			return;
		}
		await kernel.commands.init();
	};

	const startPersistence = function startPersistence() {
		if (!(enabled && persistenceOptions)) {
			return;
		}
		const persistence = createPersistence({
			kernel,
			skipHydration:
				persistenceOptions.skipHydration ??
				Boolean(options.prefetch?.initialRecords),
			storageConfig: persistenceOptions.storageConfig,
		});
		persistenceHandle = persistence;
		disposers.push(() => {
			persistence.dispose();
			persistenceHandle = null;
		});
	};

	const startIAB = function startIAB() {
		const { createIAB } = options;
		if (!(enabled && createIAB && options.iab)) {
			return;
		}
		let mounted = false;
		const mountWhenReady = function mountWhenReady() {
			if (mounted) {
				return;
			}
			const iabOptions = normalizeIABOptions(kernel, options.iab);
			if (!iabOptions) {
				return;
			}
			mounted = true;
			const handle = createIAB({ ...iabOptions, kernel });
			emitIAB(handle);
			disposers.push(() => {
				handle.dispose();
				mounted = false;
				emitIAB(null);
			});
		};

		mountWhenReady();
		// A hosted backend can return `cmpId` and the GVL from `/init`, so
		// keep watching until the snapshot carries enough to mount.
		disposers.push(kernel.subscribe(mountWhenReady));
	};

	return {
		clearRecords() {
			if (persistenceHandle) {
				persistenceHandle.clear();
				return;
			}
			kernel.hydrate({
				choice: null,
				noticeDismissal: null,
				optOutDirectives: [],
				subject: null,
			});
			kernel.events.emit({ type: 'records:cleared' });
		},
		get consentCategories() {
			return consentCategories;
		},
		dispose() {
			disposed = true;
			started = false;
			for (const dispose of disposers.reverse()) {
				dispose();
			}
			disposers.length = 0;
			iabListeners.clear();
			iabHandle = null;
			persistenceHandle = null;
		},
		get iab() {
			return iabHandle;
		},
		async identify(user) {
			const nextUser = normalizeKernelUser(user);
			if (!nextUser) {
				return;
			}
			try {
				await kernel.commands.identify(nextUser);
			} catch {
				// Surfaced through the `command:error` event and `onError`.
			}
		},
		kernel,
		onIABChange(listener) {
			iabListeners.add(listener);
			return function unsubscribeIAB() {
				iabListeners.delete(listener);
			};
		},
		async reinit() {
			if (!enabled || disposed) {
				return;
			}
			await runInit();
		},
		setConsentCategories(categories) {
			consentCategories = categories;
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
				mode: resolveWindowDebugMode(requireTransportFactory(options)),
				pkg: options.pkg ?? '@c15t/core',
			});
			disposers.push(() => windowDebug.dispose());

			startPersistence();

			// A server-resolved prefetch already holds the init answer; asking
			// for it again is one request per page load on every SSR route.
			if (enabled && !hasResolvedPrefetch(options.prefetch)) {
				void runInit();
			} else if (enabled) {
				kernel.hydrate({ now: kernel.getServerSnapshot().evaluatedAt });
				const { gpc } = kernel.getSnapshot().privacySignals;
				if (gpc.detected && gpc.active) {
					kernel.set.privacySignals({ gpc: true });
				}
				// The prefetch stands in for the response, so replay the event
				// the applied response would have raised. Subscribers receive
				// the server's policy without a second request.
				kernel.events.emit({
					snapshot: kernel.getSnapshot(),
					type: 'init:applied',
				});
			}

			if (enabled && options.scripts && options.scripts.length > 0) {
				const loader = createScriptLoader({
					kernel,
					onDebug: options.scriptLoader?.onDebug,
					scripts: options.scripts,
				});
				disposers.push(() => loader.dispose());
			}

			if (enabled && options.networkBlocker) {
				const blocker = createNetworkBlocker({
					enabled: options.networkBlocker.enabled,
					kernel,
					logBlockedRequests: options.networkBlocker.logBlockedRequests,
					onRequestBlocked: options.networkBlocker.onRequestBlocked,
					rules: options.networkBlocker.rules,
				});
				disposers.push(() => blocker.dispose());
			}

			if (enabled && options.iframeBlocker !== false) {
				const blocker = createIframeBlocker({
					kernel,
					...(options.iframeBlocker ?? {}),
				});
				disposers.push(() => blocker.dispose());
			}

			startIAB();
		},
		get started() {
			return started;
		},
	};
};
