'use client';

import type {
	AllConsentNames,
	ClearOnRevocationConfig,
	ConsentPresentation,
	Callbacks,
	ConsentKernel,
	I18nConfig,
	KernelTransport,
	InitContext,
	InitResponse,
	KernelConfig,
	KernelEvent,
	KernelOverrides,
	KernelTranslations,
	KernelUser,
	LegalLinks,
	ProviderTransportContext,
	ProviderTransportFactory,
	StorageConfig,
	TranslationsResponse,
	User,
} from '@c15t/core';
import { createConsentKernel, kernelConfigToInitResponse } from '@c15t/core';
import type { createClearOnRevocation } from '@c15t/core/modules/clear-on-revocation';
import type { Script } from '@c15t/core/modules/script-loader';
import {
	createWindowDebug,
	resolveWindowDebugMode,
} from '@c15t/core/modules/window-debug';
import type { WindowDebugMode } from '@c15t/core/modules/window-debug';
import type { ConsentRuntime } from '@c15t/core/runtime';
import { resolvePolicyRules } from '@c15t/schema/types';
import { deepMergeTranslations } from '@c15t/translations';
import type { Translations } from '@c15t/translations';
import type { ReactNode } from 'react';
import {
	lazy,
	Suspense,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';

import { KernelContext, ProviderServicesContext } from './context';
import { useColorScheme } from './hooks/use-color-scheme';
import type {
	UseNetworkBlockerOptions,
	UsePersistenceOptions,
	UseScriptLoaderOptions,
} from './module-hooks';
import { usePersistence } from './module-hooks/persistence';
import { V3ThemeProvider } from './theme-provider';
import type { ReactUIOptions } from './types/consent-manager';
import type { ReactComponentSlots } from './types/slots';
import type { Theme } from './types/theme';
import type { V3UIConfigValue } from './ui-config-context';
import { defaultTranslationConfig } from './utils/default-translation-config';

const loadNetworkBlockerModule = () =>
	import('@c15t/core/modules/network-blocker');
const loadScriptLoaderModule = () => import('@c15t/core/modules/script-loader');
const loadClearOnRevocationModule = () =>
	import('@c15t/core/modules/clear-on-revocation');
const loadThemeModule = () => import('@c15t/ui/theme');

/** Events emitted by the mounted provider without snapshot-derived consent aliases. */
export type ConsentProviderCallbacks = Pick<
	Callbacks,
	'onChoiceRecorded' | 'onPermissionsChanged' | 'onError'
>;
/** Prepared policy and records; legacy consent projections are not provider inputs. */
export type ConsentProviderPrefetch = Omit<
	KernelConfig,
	'initialDraft' | 'transport'
>;

export interface ConsentProviderOptions extends Pick<
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
	 * Content Security Policy nonce applied to DOM nodes c15t injects.
	 *
	 * @remarks
	 * Set this when your CSP uses a nonce-based policy instead of
	 * `'unsafe-inline'`. The provider forwards it to the injected theme
	 * `<style>` element and to every `<script>` element created by the
	 * script loader. A per-script `nonce` still takes precedence.
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
	storageConfig?: StorageConfig;
	user?: User | KernelUser;
	overrides?: KernelOverrides;
	/**
	 * Server-resolved kernel configuration, usually from a framework server
	 * helper such as `prefetchInitialConsent()` or `readInitialConsentConfig()`.
	 *
	 * Pass the resolved `KernelConfig` and the provider builds its kernel
	 * from it synchronously: a config carrying a policy renders the banner
	 * on first paint.
	 *
	 * Pass the pending `Promise<KernelConfig>` instead and the provider
	 * mounts at once with a provisional policy, so `children` render (and
	 * the static shell can prerender) while the consent data streams in.
	 * Consent surfaces stay hidden until the promise resolves; its first
	 * `init()` then applies the resolved config in place of the transport's
	 * network init. A config that resolves without a policy (persisted
	 * consents, geo, language only) is applied to the kernel and the
	 * transport init runs as usual; a rejected promise is logged outside
	 * production and falls through to the transport init. Initial-only:
	 * remount the provider to change it.
	 *
	 * @example
	 * ```tsx
	 * // app/layout.tsx — stays synchronous, so the shell prerenders.
	 * const config = prefetchInitialConsent({ backendURL });
	 * return (
	 *   <ConsentProvider options={{ mode: hosted({ url }), prefetch: config }}>
	 *     {children}
	 *   </ConsentProvider>
	 * );
	 * ```
	 */
	prefetch?: ConsentProviderPrefetch | Promise<ConsentProviderPrefetch>;
	callbacks?: ConsentProviderCallbacks;
	/**
	 * Remove configured browser data when its consent permission is revoked.
	 * Initial-only: remount the provider to replace its cleanup configuration.
	 */
	clearOnRevocation?: ClearOnRevocationConfig;
	scripts?: Script[];
	scriptLoader?: UseScriptLoaderOptions;
	networkBlocker?: UseNetworkBlockerOptions | false;
	persistence?: boolean | UsePersistenceOptions;
	i18n?: Partial<I18nConfig>;
	consentCategories?: AllConsentNames[];
	/** Per-component slot attribute overrides (shared contract with @c15t/vue). */
	components?: ReactComponentSlots;
	legalLinks?: LegalLinks;
	/**
	 * Adapter package name reported by `window.c15t`.
	 * @internal
	 */
	__debugPkg?: string;
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
	'mode'
> & {
	mode?: ConsentProviderOptions['mode'];
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
const LazyExternalIABProvider = lazy(async () => {
	const module = await import('./external-iab-context');
	return { default: module.ExternalIABProvider };
});

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

const DEFAULT_TRANSLATIONS: KernelTranslations = {
	language: 'en',
	translations: defaultTranslationConfig.translations.en as never,
};

const normalizeUser = function normalizeUser(
	user: ConsentProviderOptions['user']
): KernelUser | undefined {
	if (!user) {
		return undefined;
	}
	if ('externalId' in user) {
		return user;
	}
	return {
		externalId: user.id,
		identityProvider: user.identityProvider,
	};
};

const resolveI18nTranslations = function resolveI18nTranslations(
	i18n: Partial<I18nConfig> | undefined
): KernelTranslations | undefined {
	if (!i18n?.messages) {
		return undefined;
	}
	const language =
		i18n.locale ?? defaultTranslationConfig.defaultLanguage ?? 'en';
	const fallbackTranslations = defaultTranslationConfig.translations
		.en as TranslationsResponse;
	const selected =
		i18n.messages[language] ?? i18n.messages.en ?? fallbackTranslations;
	const base =
		defaultTranslationConfig.translations[
			language as keyof typeof defaultTranslationConfig.translations
		] ?? fallbackTranslations;
	return {
		language,
		translations: deepMergeTranslations(
			base as Translations,
			selected as Partial<Translations>
		) as TranslationsResponse,
	};
};

const getEnabled = function getEnabled(
	options: ConsentProviderOptions
): boolean {
	return options.enabled ?? true;
};

/**
 * What a first-init source resolved to: an init response to apply instead
 * of calling the transport, or the context the transport should be called
 * with when the source had no policy to offer.
 */
interface FirstInitResolution {
	response?: InitResponse | null;
	context?: InitContext;
}

type FirstInitSource = (ctx: InitContext) => Promise<FirstInitResolution>;

/**
 * Wrap a transport so its first `init()` is answered by `source` — a
 * server-supplied payload that arrives asynchronously (a pending
 * `prefetch` promise, or the deprecated `ssrData`). When the source yields
 * no response the real transport init runs with the context the source
 * returned. Later inits (overrides changes, `enabled` flips, retries) go
 * straight to the transport.
 */
const withFirstInitSource = function withFirstInitSource(
	transport: KernelTransport,
	source: FirstInitSource
): KernelTransport {
	let used = false;
	return {
		...transport,
		async init(ctx) {
			if (used) {
				return transport.init?.(ctx) ?? {};
			}
			used = true;
			const resolution = await source(ctx);
			if (resolution.response) {
				return resolution.response;
			}
			return transport.init?.(resolution.context ?? ctx) ?? {};
		},
	};
};

const isPromiseLike = function isPromiseLike<Value>(
	value: Value | PromiseLike<Value> | undefined
): value is PromiseLike<Value> {
	return typeof (value as PromiseLike<Value> | undefined)?.then === 'function';
};

/**
 * The part of `prefetch` available at kernel construction: the config
 * itself when it was passed resolved, an empty config while a promise is
 * still pending.
 */
const resolveSyncPrefetch = function resolveSyncPrefetch(
	options: ConsentProviderOptions
): KernelConfig {
	const { prefetch } = options;
	if (!prefetch || isPromiseLike(prefetch)) {
		return {};
	}
	return prefetch;
};

const hasKeys = function hasKeys(
	value: KernelOverrides | undefined
): value is KernelOverrides {
	return value !== undefined && Object.keys(value).length > 0;
};

const warnPrefetchRejected = function warnPrefetchRejected(error: unknown) {
	const nodeEnv = (globalThis as { process?: { env?: { NODE_ENV?: string } } })
		.process?.env?.NODE_ENV;
	if (nodeEnv === 'production') {
		return;
	}
	console.warn(
		'c15t ConsentProvider: the `prefetch` promise rejected; falling back to the transport init.',
		error
	);
};

/**
 * Apply the baseline fields of a policy-less prefetch (persisted consents,
 * subject, geo/language) to a live kernel. Done through the setters rather
 * than the init path so a returning visitor's stored choice holds even if
 * the transport init that follows fails.
 */
const applyBaselinePrefetch = function applyBaselinePrefetch(
	kernel: ConsentKernel,
	config: KernelConfig,
	providerOverrides: KernelOverrides | undefined,
	recordsGeneration: number | undefined
) {
	const overrides = {
		...(config.initialOverrides ?? {}),
		...(providerOverrides ?? {}),
	};
	if (hasKeys(overrides)) {
		kernel.set.overrides(overrides);
	}
	if (
		config.initialRecords &&
		kernel.getRecordsGeneration() === recordsGeneration
	) {
		kernel.hydrate(config.initialRecords);
	}
};

/**
 * First-init source for a pending `prefetch` promise. A resolved config
 * with a policy becomes the init response outright (no network init); a
 * policy-less config is applied as a baseline and the transport init runs
 * with its overrides. Provider `overrides` win over the server's, matching
 * the synchronous prefetch merge.
 */
const createPrefetchSource = function createPrefetchSource(
	prefetch: Promise<KernelConfig>,
	providerOverrides: KernelOverrides | undefined,
	getKernel: () => ConsentKernel | null
): FirstInitSource {
	return async (ctx) => {
		const recordsGeneration = getKernel()?.getRecordsGeneration();
		let config: KernelConfig;
		try {
			config = (await prefetch) ?? {};
		} catch (error) {
			warnPrefetchRejected(error);
			return {};
		}

		const response = kernelConfigToInitResponse(config);
		if (response) {
			const resolvedOverrides = {
				...(response.resolvedOverrides ?? {}),
				...(providerOverrides ?? {}),
			};
			if (hasKeys(resolvedOverrides)) {
				response.resolvedOverrides = resolvedOverrides;
			}
			return { response };
		}

		const kernel = getKernel();
		if (kernel) {
			applyBaselinePrefetch(
				kernel,
				config,
				providerOverrides,
				recordsGeneration
			);
		}
		return {
			context: {
				overrides: {
					...ctx.overrides,
					...(config.initialOverrides ?? {}),
					...(providerOverrides ?? {}),
				},
				user: ctx.user,
			},
		};
	};
};

const withPrefetchPromise = function withPrefetchPromise(
	transport: KernelTransport,
	options: ConsentProviderOptions,
	getKernel: () => ConsentKernel | null
): KernelTransport {
	const { prefetch } = options;
	if (!isPromiseLike(prefetch)) {
		return transport;
	}
	return withFirstInitSource(
		transport,
		createPrefetchSource(
			Promise.resolve(prefetch),
			options.overrides,
			getKernel
		)
	);
};

const getProviderMode = function getProviderMode(
	options: ConsentProviderOptions
): ProviderTransportFactory {
	if (typeof options.mode !== 'function') {
		throw new Error(
			'c15t ConsentProvider: `mode` is required. Use hosted(), offline(), or custom().'
		);
	}
	return options.mode;
};

const resolveInitialPolicyPending = function resolveInitialPolicyPending(
	enabled: boolean,
	prefetch: KernelConfig
): boolean {
	return (
		prefetch.initialPolicyPending ??
		(enabled && !prefetch.initialPolicyResolution)
	);
};

const createProviderKernel = function createProviderKernel(
	options: ConsentProviderOptions
): ConsentKernel {
	const enabled = getEnabled(options);
	const prefetch = resolveSyncPrefetch(options);
	const i18nTranslations =
		resolveI18nTranslations(options.i18n) ?? DEFAULT_TRANSLATIONS;

	const transportContext: ProviderTransportContext = {
		consentCategories: options.consentCategories,
		prefetch,
		translations: i18nTranslations,
	};
	const baseTransport = getProviderMode(options)(transportContext);

	// The prefetch source needs the kernel it is about to feed (baseline
	// setters on a policy-less config), but the transport must exist before
	// the kernel does. Late-bind it: init only runs once the kernel exists.
	const kernelRef: { current: ConsentKernel | null } = { current: null };
	const transport = withPrefetchPromise(
		baseTransport,
		options,
		() => kernelRef.current
	);

	// oxlint-disable-next-line sort-keys -- Preserve declaration order, interface shape, and public compatibility.
	const kernel = createConsentKernel({
		...prefetch,
		initialRecords: enabled ? prefetch.initialRecords : undefined,
		initialPrivacySignals: enabled ? prefetch.initialPrivacySignals : undefined,
		// An empty shell has no expiring records to evaluate. A stable seed
		// avoids reading the clock during Next.js static prerender; init
		// takes the real clock after mount. Prepared records retain their clock.
		now:
			prefetch.now ??
			prefetch.initialRecords?.now ??
			(prefetch.initialRecords ? undefined : 0),
		transport,
		initialPolicyResolution: enabled
			? prefetch.initialPolicyResolution
			: DISABLED_RESOLUTION,
		initialOverrides: {
			...(prefetch.initialOverrides ?? {}),
			...(options.overrides ?? {}),
		},
		initialUser: normalizeUser(options.user) ?? prefetch.initialUser,
		initialTranslations: prefetch.initialTranslations ?? i18nTranslations,
		// The synthetic categories fallback is a placeholder for whatever the
		// transport's init resolves — mark it provisional so no surface renders
		// copy/actions that init may replace (mid-read copy swap, CLS, consent
		// recorded against a placeholder policy). Real initial policies
		// (prefetch/SSR/offline config) stay authoritative and render at once.
		initialPolicyPending: resolveInitialPolicyPending(enabled, prefetch),
	});
	kernelRef.current = kernel;
	return kernel;
};

const stringifyError = function stringifyError(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	if (typeof error === 'string') {
		return error;
	}
	try {
		return JSON.stringify(error);
	} catch {
		return String(error);
	}
};

const useProviderCallbacks = function useProviderCallbacks(
	kernel: ConsentKernel,
	callbacks: ConsentProviderCallbacks | undefined
) {
	const callbacksRef = useRef(callbacks);

	useEffect(() => {
		callbacksRef.current = callbacks;
	}, [callbacks]);

	useEffect(() => {
		const subscriptions = [
			kernel.events.on(
				'choice:recorded',
				({ snapshot, confirmed, actionAt }) => {
					callbacksRef.current?.onChoiceRecorded?.({
						actionAt,
						confirmed,
						snapshot,
					});
				}
			),
			kernel.events.on('permissions:changed', ({ snapshot, previous }) => {
				callbacksRef.current?.onPermissionsChanged?.({ previous, snapshot });
			}),

			kernel.events.on(
				'command:error',
				(event: Extract<KernelEvent, { type: 'command:error' }>) => {
					callbacksRef.current?.onError?.({
						error: stringifyError(event.error),
					});
				}
			),
		];

		return () => {
			for (const unsubscribe of subscriptions) {
				unsubscribe();
			}
		};
	}, [kernel]);
};

const serializeInitialOnlyOptions = function serializeInitialOnlyOptions(
	options: ConsentProviderOptions
): string {
	return JSON.stringify({
		i18n: options.i18n,
		mode: options.mode?.kind,
	});
};

const useProviderOptionSync = function useProviderOptionSync(
	kernel: ConsentKernel,
	options: ConsentProviderOptions,
	enabled: boolean,
	owns: boolean
) {
	const previousEnabledRef = useRef(enabled);
	const previousUserRef = useRef<string | null>(null);
	const previousOverridesRef = useRef<string | null>(null);
	const initialOnlyRef = useRef<string | null>(null);

	useEffect(() => {
		if (!owns) {
			return;
		}
		const nextUser = normalizeUser(options.user);
		const serialized = JSON.stringify(nextUser ?? null);
		if (previousUserRef.current === null) {
			previousUserRef.current = serialized;
			return;
		}
		if (previousUserRef.current !== serialized) {
			previousUserRef.current = serialized;
			if (nextUser) {
				void (async () => {
					try {
						await kernel.commands.identify(nextUser);
					} catch {
						// Provider callbacks receive the command:error event.
					}
				})();
			}
		}
	}, [kernel, options.user, owns]);

	useEffect(() => {
		if (!owns) {
			return;
		}
		const serialized = JSON.stringify(options.overrides ?? {});
		if (previousOverridesRef.current === null) {
			previousOverridesRef.current = serialized;
			return;
		}
		if (previousOverridesRef.current !== serialized) {
			previousOverridesRef.current = serialized;
			kernel.set.overrides(options.overrides ?? {});
			if (enabled) {
				void kernel.commands.init();
			}
		}
	}, [enabled, kernel, options.overrides, owns]);

	useEffect(() => {
		if (!owns || previousEnabledRef.current === enabled) {
			return;
		}
		previousEnabledRef.current = enabled;
		if (enabled) {
			return;
		}
		kernel.set.activeUI('none');
	}, [enabled, kernel, owns]);

	useEffect(() => {
		const nodeEnv = (
			globalThis as { process?: { env?: { NODE_ENV?: string } } }
		).process?.env?.NODE_ENV;
		if (nodeEnv === 'production') {
			return;
		}
		const serialized = serializeInitialOnlyOptions(options);
		if (initialOnlyRef.current === null) {
			initialOnlyRef.current = serialized;
			return;
		}
		if (initialOnlyRef.current !== serialized) {
			initialOnlyRef.current = serialized;
			console.warn(
				'c15t ConsentProvider: mode and i18n are initial-only options. Remount the provider to apply changes.'
			);
		}
	}, [options]);
};

const ProviderCallbacksMount = ({
	kernel,
	callbacks,
}: {
	kernel: ConsentKernel;
	callbacks?: ConsentProviderCallbacks;
}) => {
	useProviderCallbacks(kernel, callbacks);
	return null;
};

const InitMount = ({
	enabled,
	kernel,
	prepared,
}: {
	enabled: boolean;
	kernel: ConsentKernel;
	prepared: boolean;
}) => {
	const initialized = useRef(false);
	const hydrated = useRef(false);
	useEffect(() => {
		if (!enabled) {
			initialized.current = false;
			return;
		}
		if (initialized.current) {
			return;
		}
		initialized.current = true;
		if (prepared) {
			kernel.hydrate({
				now: hydrated.current
					? Date.now()
					: kernel.getServerSnapshot().evaluatedAt,
			});
			hydrated.current = true;
			const { gpc } = kernel.getSnapshot().privacySignals;
			if (gpc.detected && gpc.active) {
				// Hydration stays read-only; activate the detected signal through
				// the public setter after the prepared snapshot has committed.
				kernel.set.privacySignals({ gpc: true });
			}
		} else {
			kernel.commands.init();
		}
	}, [enabled, kernel, prepared]);
	return null;
};

const EMPTY_SCRIPTS: Script[] = [];

const ScriptsAndCleanupMount = ({
	clearOnRevocation,
	storageConfig,
	nonce,
	options,
	scripts = EMPTY_SCRIPTS,
}: {
	clearOnRevocation?: ClearOnRevocationConfig;
	storageConfig?: StorageConfig;
	nonce?: string;
	options?: UseScriptLoaderOptions;
	scripts?: Script[];
}) => {
	const kernel = useContext(KernelContext);
	const handleRef = useRef<{
		dispose: () => void;
		updateScripts: (scripts: Script[]) => void;
	} | null>(null);
	const cleanupRef = useRef<{ dispose: () => void } | null>(null);
	const cleanupFactoryRef = useRef<{
		config: ClearOnRevocationConfig;
		create: typeof createClearOnRevocation;
	} | null>(null);
	const latestCleanupRef = useRef({ config: clearOnRevocation, storageConfig });
	const [needsScriptLoader, setNeedsScriptLoader] = useState(
		scripts.length > 0
	);
	const latestScriptsRef = useRef(scripts);
	const latestOptionsRef = useRef(options);
	const latestNonceRef = useRef(nonce);
	if (scripts.length > 0 && !needsScriptLoader) {
		setNeedsScriptLoader(true);
	}

	useEffect(() => {
		latestCleanupRef.current = { config: clearOnRevocation, storageConfig };
		latestScriptsRef.current = scripts;
		latestOptionsRef.current = options;
		latestNonceRef.current = nonce;
	}, [clearOnRevocation, storageConfig, nonce, options, scripts]);

	// When scripts first appear, reattach cleanup after their loader so
	// revocation callbacks finish before browser data is removed.
	useEffect(() => {
		if (!kernel) {
			return;
		}
		let disposed = false;
		void (async () => {
			if (needsScriptLoader) {
				const { createScriptLoader } = await loadScriptLoaderModule();
				if (disposed) {
					return;
				}
				handleRef.current = createScriptLoader({
					kernel,
					nonce: latestNonceRef.current,
					onDebug: latestOptionsRef.current?.onDebug,
					scripts: latestScriptsRef.current,
				});
			}
			const { config } = latestCleanupRef.current;
			if (config) {
				const { createClearOnRevocation } = await loadClearOnRevocationModule();
				if (disposed) {
					return;
				}
				cleanupFactoryRef.current = { config, create: createClearOnRevocation };
				cleanupRef.current = createClearOnRevocation({
					config,
					kernel,
					storageConfig: latestCleanupRef.current.storageConfig,
				});
			}
		})();
		return () => {
			disposed = true;
			cleanupRef.current?.dispose();
			cleanupRef.current = null;
			cleanupFactoryRef.current = null;
			handleRef.current?.dispose();
			handleRef.current = null;
		};
	}, [kernel, needsScriptLoader]);

	const protectedStorageKey = storageConfig?.storageKey;
	useEffect(() => {
		const factory = cleanupFactoryRef.current;
		if (!kernel || !factory) {
			return;
		}
		cleanupRef.current?.dispose();
		cleanupRef.current = factory.create({
			config: factory.config,
			kernel,
			storageConfig: { storageKey: protectedStorageKey },
		});
	}, [kernel, protectedStorageKey]);

	useEffect(() => {
		handleRef.current?.updateScripts(scripts);
	}, [scripts]);

	return null;
};

const NetworkBlockerMount = ({
	options,
}: {
	options: UseNetworkBlockerOptions;
}) => {
	const kernel = useContext(KernelContext);
	const handleRef = useRef<{
		dispose: () => void;
		updateRules: (rules: UseNetworkBlockerOptions['rules']) => void;
		setEnabled: (enabled: boolean) => void;
	} | null>(null);
	const latestOptionsRef = useRef(options);

	useEffect(() => {
		latestOptionsRef.current = options;
	}, [options]);

	useEffect(() => {
		if (!kernel) {
			return;
		}
		let disposed = false;
		void (async () => {
			const { createNetworkBlocker } = await loadNetworkBlockerModule();
			if (disposed) {
				return;
			}
			const latest = latestOptionsRef.current;
			const created = createNetworkBlocker({
				enabled: latest.enabled,
				kernel,
				logBlockedRequests: latest.logBlockedRequests,
				onRequestBlocked: latest.onRequestBlocked,
				rules: latest.rules,
			});
			handleRef.current = created;
		})();
		return () => {
			disposed = true;
			handleRef.current?.dispose();
			handleRef.current = null;
		};
	}, [kernel]);

	useEffect(() => {
		handleRef.current?.updateRules(options.rules);
	}, [options.rules]);

	useEffect(() => {
		if (options.enabled !== undefined) {
			handleRef.current?.setEnabled(options.enabled);
		}
	}, [options.enabled]);

	return null;
};

const PersistenceMount = ({
	options,
	clearRef,
}: {
	options?: UsePersistenceOptions;
	clearRef: { current: (() => void) | null };
}) => {
	const handle = usePersistence(options);
	useEffect(() => {
		clearRef.current = handle.clear;
		return () => {
			clearRef.current = null;
		};
	}, [handle, clearRef]);
	return null;
};

const WindowDebugMount = ({
	pkg,
	mode,
}: {
	pkg: string;
	mode: WindowDebugMode;
}) => {
	useEffect(() => {
		// The module is tiny and dependency-free; `createWindowDebug` itself
		// guards against pages that made `window.c15t` non-writable.
		const handle = createWindowDebug({ mode, pkg });
		return () => handle.dispose();
	}, [mode, pkg]);

	return null;
};

const WindowKernelMount = ({ kernel }: { kernel: ConsentKernel }) => {
	useEffect(() => {
		const browserWindow = window as Window & {
			c15tKernel?: ConsentKernel;
		};
		const previousKernel = browserWindow.c15tKernel;
		browserWindow.c15tKernel = kernel;

		return () => {
			if (browserWindow.c15tKernel !== kernel) {
				return;
			}
			if (previousKernel) {
				browserWindow.c15tKernel = previousKernel;
				return;
			}
			delete browserWindow.c15tKernel;
		};
	}, [kernel]);

	return null;
};

/**
 * Emits the `--c15t-*` custom properties the prebuilt styles read. Without a
 * user theme the UI package's default theme is used, so components are
 * never left without colours; a stylesheet can still override any token.
 */
const ThemeStyleMount = ({
	nonce,
	theme,
}: {
	nonce?: string;
	theme?: Theme;
}) => {
	const [themeCSS, setThemeCSS] = useState('');

	useEffect(() => {
		let disposed = false;
		void (async () => {
			const { defaultTheme, generateThemeCSS } = await loadThemeModule();
			if (!disposed) {
				setThemeCSS(generateThemeCSS((theme ?? defaultTheme) as never));
			}
		})();

		return () => {
			disposed = true;
		};
	}, [theme]);

	if (!themeCSS) {
		return null;
	}

	return (
		<style
			id="c15t-theme"
			nonce={nonce}
			// oxlint-disable-next-line react/no-danger -- Generated CSS variables
			dangerouslySetInnerHTML={{ __html: themeCSS }}
		/>
	);
};

const normalizePersistenceOptions = function normalizePersistenceOptions(
	options: ConsentProviderOptions
): UsePersistenceOptions | false {
	if (options.persistence === false) {
		return false;
	}
	const { storageConfig } = options;
	const prepared = !!resolveSyncPrefetch(options).initialRecords;
	if (options.persistence === true || options.persistence === undefined) {
		return { skipHydration: prepared, storageConfig };
	}
	return {
		...options.persistence,
		skipHydration: options.persistence.skipHydration ?? prepared,
		storageConfig: options.persistence.storageConfig ?? storageConfig,
	};
};

/**
 * v3 ConsentProvider.
 *
 * Retains the enabled kernel while disabled mode uses a separate permissive
 * kernel, so toggling enabled preserves recorded choices. Provides the active
 * kernel via context and wires the curated v2-like options surface to v3
 * modules. It does not mirror the
 * snapshot into React state; selector hooks still subscribe directly to
 * the kernel through `useSyncExternalStore`.
 *
 * Pass `runtime` to render a runtime someone else created. The provider
 * then borrows its kernel and mounts none of the side-effecting modules —
 * no second `init()`, no second persistence handle, no second `window.c15t`
 * — and does not dispose it on unmount.
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
export const ConsentProvider = (props: ConsentProviderProps) => {
	const { children } = props;
	const options = (props.options ?? {}) as ConsentProviderOptions;
	const enabled = getEnabled(options);
	const [owned, setOwned] = useState(() => ({
		clearOnRevocation: options.clearOnRevocation,
		disabledKernel: props.runtime
			? undefined
			: createProviderKernel({ ...options, enabled: false }),
		external: props.runtime,
		kernel:
			props.runtime?.kernel ??
			createProviderKernel({ ...options, enabled: true }),
	}));
	void setOwned;
	const {
		clearOnRevocation: initialClearOnRevocation,
		external: externalRuntime,
	} = owned;
	const kernel = enabled
		? owned.kernel
		: (owned.disabledKernel ?? owned.kernel);
	const ownsRuntime = externalRuntime === undefined;
	const clearRef = useRef<(() => void) | null>(null);
	const services = useMemo(
		() => ({
			clearRecords: () => {
				if (externalRuntime) {
					externalRuntime.clearRecords();
					return;
				}
				if (clearRef.current) {
					clearRef.current();
				} else {
					kernel.hydrate({
						choice: null,
						noticeDismissal: null,
						optOutDirectives: [],
						subject: null,
					});
					kernel.events.emit({ type: 'records:cleared' });
				}
			},
			getConsentCategories: () => {
				const { scope } = kernel.getSnapshot().policyRule;
				const configured = options.consentCategories;
				return [
					'necessary' as const,
					...scope.filter(
						(name) => !configured?.length || configured.includes(name)
					),
				];
			},
			getPresentation: () => options.presentation,
		}),
		[kernel, options.consentCategories, options.presentation, externalRuntime]
	);
	const persistenceOptions = normalizePersistenceOptions(options);
	const { scripts, networkBlocker } = options;
	const windowDebugPkg = options.__debugPkg ?? '@c15t/react';
	// `mode` is optional when a runtime is handed in — its owner picked the
	// transport, and this provider mounts no `window.c15t` either way.
	const windowDebugMode = ownsRuntime
		? resolveWindowDebugMode(options.mode)
		: 'hosted';

	useProviderOptionSync(owned.kernel, options, enabled, ownsRuntime);
	const lifecycle = useRef(0);
	useEffect(() => {
		if (!ownsRuntime) {
			return;
		}
		lifecycle.current += 1;
		const generation = lifecycle.current;
		return () => {
			queueMicrotask(() => {
				if (lifecycle.current === generation) {
					owned.kernel.dispose();
					owned.disabledKernel?.dispose();
				}
			});
		};
	}, [owned, ownsRuntime]);

	const userTheme = options.theme;

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
			components: options.components,
			legalLinks: options.legalLinks,
			presentation: options.presentation,
		}),
		[options.components, options.legalLinks, options.presentation]
	);

	useColorScheme(options.colorScheme);

	// Everything below `WindowKernelMount` is a side-effecting module the
	// runtime already mounts. A borrowed runtime renders none of it.
	const providerChildren = (
		<>
			{ownsRuntime ? (
				<>
					<ProviderCallbacksMount
						kernel={kernel}
						callbacks={options.callbacks}
					/>
					<WindowDebugMount
						pkg={windowDebugPkg}
						mode={windowDebugMode}
					/>
					<WindowKernelMount kernel={kernel} />
					{enabled && persistenceOptions ? (
						<PersistenceMount
							options={persistenceOptions}
							clearRef={clearRef}
						/>
					) : null}
					<InitMount
						enabled={enabled}
						prepared={!!resolveSyncPrefetch(options).initialPolicyResolution}
						kernel={kernel}
					/>
					{(scripts && scripts.length > 0) ||
					(enabled && initialClearOnRevocation) ? (
						<ScriptsAndCleanupMount
							clearOnRevocation={enabled ? initialClearOnRevocation : undefined}
							storageConfig={
								persistenceOptions
									? persistenceOptions.storageConfig
									: options.storageConfig
							}
							nonce={options.nonce}
							options={options.scriptLoader}
							scripts={scripts}
						/>
					) : null}
					{enabled && networkBlocker ? (
						<NetworkBlockerMount options={networkBlocker} />
					) : null}
				</>
			) : null}
			{externalRuntime ? (
				<Suspense fallback={children}>
					<LazyExternalIABProvider runtime={externalRuntime}>
						{children}
					</LazyExternalIABProvider>
				</Suspense>
			) : (
				children
			)}
		</>
	);

	return (
		<KernelContext.Provider value={kernel}>
			<ProviderServicesContext.Provider value={services}>
				<V3ThemeProvider
					themeConfig={themeContextValue}
					uiConfig={uiConfigValue}
				>
					<ThemeStyleMount
						nonce={options.nonce}
						theme={userTheme}
					/>
					{providerChildren}
				</V3ThemeProvider>
			</ProviderServicesContext.Provider>
		</KernelContext.Provider>
	);
};
