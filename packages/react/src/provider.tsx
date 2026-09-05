'use client';

import type {
	AllConsentNames,
	Callbacks,
	ConsentKernel,
	ConsentSnapshot,
	I18nConfig,
	IABConfig,
	InitResponse,
	KernelConfig,
	KernelEvent,
	KernelOverrides,
	KernelTranslations,
	KernelTransport,
	KernelUser,
	LegalLinks,
	OfflinePolicyConfig,
	PolicyConfig,
	ProviderTransportContext,
	ProviderTransportFactory,
	SSRInitialData,
	StorageConfig,
	TranslationConfig,
	TranslationsResponse,
	User,
} from '@c15t/core';
import { createConsentKernel, mapInitOutputToInitResponse } from '@c15t/core';
import type { Script } from '@c15t/core/modules/script-loader';
import {
	createWindowDebug,
	resolveWindowDebugMode,
} from '@c15t/core/modules/window-debug';
import type { WindowDebugMode } from '@c15t/core/modules/window-debug';
import type { InitOutput } from '@c15t/schema/types';
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
	useSyncExternalStore,
} from 'react';

import { KernelContext } from './context';
import { useColorScheme } from './hooks/use-color-scheme';
import type { IABProviderProps } from './iab-context';
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
const loadThemeModule = () => import('@c15t/ui/theme');

type ProviderIABOptions =
	| (Partial<Omit<IABProviderProps, 'children'>> &
			Partial<Pick<IABConfig, 'enabled' | 'cmpId' | 'cmpVersion' | 'vendors'>>)
	| false;

type NormalizedIABOptions = Omit<IABProviderProps, 'children' | 'cmpId'> & {
	cmpId?: number;
};

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
	/**
	 * Transport factory the provider builds its kernel with. Required.
	 *
	 * Pass `hosted()` to talk to a c15t backend, `offline()` to resolve
	 * policies locally with no network, or `custom()` to supply your own
	 * kernel transport or v2 endpoint handlers. This is an initial-only
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
	prefetch?: KernelConfig;
	callbacks?: Callbacks;
	reloadOnConsentRevoked?: boolean;
	scripts?: Script[];
	scriptLoader?: UseScriptLoaderOptions;
	networkBlocker?: UseNetworkBlockerOptions | false;
	iab?: ProviderIABOptions;
	persistence?: boolean | UsePersistenceOptions;
	policies?: PolicyConfig[];
	i18n?: Partial<I18nConfig>;
	consentCategories?: AllConsentNames[];
	/** Per-component slot attribute overrides (shared contract with @c15t/vue). */
	components?: ReactComponentSlots;
	legalLinks?: LegalLinks;
	/**
	 * @deprecated Use `prefetch` with v3 server helpers. Kept so v2-shaped
	 * provider fixtures can be reused while migrating tests.
	 */
	ssrData?: Promise<SSRInitialData | undefined>;
	/**
	 * @deprecated Use `i18n` instead.
	 */
	translations?: Partial<TranslationConfig>;
	/**
	 * @deprecated Use `policies` for policy packs and `prefetch` for synthetic
	 * policy/init data.
	 */
	offlinePolicy?: OfflinePolicyConfig;
	/**
	 * @deprecated v3 hosted transport does not implement retry/backoff yet.
	 * Accepted for v2 fixture compatibility and ignored.
	 */
	retryConfig?: unknown;
	/**
	 * Adapter package name reported by `window.c15t`.
	 * @internal
	 */
	__debugPkg?: string;
}

export interface ConsentProviderProps {
	options: ConsentProviderOptions;
	children: ReactNode;
}

const ALL_CONSENTS_ON = {
	experience: true,
	functionality: true,
	marketing: true,
	measurement: true,
	necessary: true,
} as const;

const DEFAULT_TRANSLATIONS: KernelTranslations = {
	language: 'en',
	translations: defaultTranslationConfig.translations.en as never,
};

const LazyIABProvider = lazy(async () => {
	const module = await import('./iab-context');
	return { default: module.IABProvider };
});

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

const normalizeLegacyI18n = function normalizeLegacyI18n(
	translations: Partial<TranslationConfig> | undefined
): Partial<I18nConfig> | undefined {
	if (!translations?.translations) {
		return undefined;
	}
	return {
		detectBrowserLanguage:
			translations.disableAutoLanguageSwitch === undefined
				? undefined
				: !translations.disableAutoLanguageSwitch,
		locale: translations.defaultLanguage,
		messages: translations.translations,
	};
};

const resolveProviderI18n = function resolveProviderI18n(
	options: ConsentProviderOptions
): Partial<I18nConfig> | undefined {
	return options.i18n ?? normalizeLegacyI18n(options.translations);
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

const buildNoBannerPolicy =
	function buildNoBannerPolicy(): KernelConfig['initialPolicy'] {
		return {
			id: 'no_banner',
			model: 'none',
			ui: {
				mode: 'none',
			},
		};
	};

const mapSSRInitialData = function mapSSRInitialData(
	data: SSRInitialData | undefined
): InitResponse | null {
	if (!data?.init) {
		return null;
	}
	const init = data.init as Record<string, unknown>;
	return mapInitOutputToInitResponse(
		{
			...init,
			gvl: data.gvl ?? init.gvl,
		} as InitOutput,
		{}
	);
};

const withSSRData = function withSSRData(
	transport: KernelTransport,
	ssrData: ConsentProviderOptions['ssrData']
): KernelTransport {
	if (!ssrData) {
		return transport;
	}
	let used = false;
	return {
		...transport,
		async init(ctx) {
			if (!used) {
				used = true;
				const mapped = mapSSRInitialData(await ssrData);
				if (mapped) {
					return mapped as never;
				}
			}
			return transport.init?.(ctx) ?? {};
		},
	};
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

const resolveInitialPolicyProvisional =
	function resolveInitialPolicyProvisional(
		enabled: boolean,
		prefetch: KernelConfig,
		offlinePolicy: OfflinePolicyConfig | undefined
	): boolean {
		return (
			prefetch.initialPolicyProvisional ??
			(enabled && !prefetch.initialPolicy && !offlinePolicy?.policy)
		);
	};

const createProviderKernel = function createProviderKernel(
	options: ConsentProviderOptions
): ConsentKernel {
	const enabled = getEnabled(options);
	const prefetch = options.prefetch ?? {};
	const { offlinePolicy } = options;
	const i18nTranslations =
		resolveI18nTranslations(resolveProviderI18n(options)) ??
		DEFAULT_TRANSLATIONS;

	const transportContext: ProviderTransportContext = {
		consentCategories: options.consentCategories,
		offlinePolicy,
		policies: options.policies,
		prefetch,
		translations: i18nTranslations,
	};
	const baseTransport = getProviderMode(options)(transportContext);

	const transport = withSSRData(baseTransport, options.ssrData);

	// oxlint-disable-next-line sort-keys -- Preserve declaration order, interface shape, and public compatibility.
	return createConsentKernel({
		...prefetch,
		transport,
		initialConsents: enabled
			? (prefetch.initialConsents ?? undefined)
			: ALL_CONSENTS_ON,
		initialOverrides: {
			...(prefetch.initialOverrides ?? {}),
			...(options.overrides ?? {}),
		},
		initialUser: normalizeUser(options.user) ?? prefetch.initialUser,
		initialTranslations: prefetch.initialTranslations ?? i18nTranslations,
		initialPolicy:
			enabled === false
				? (prefetch.initialPolicy ?? buildNoBannerPolicy())
				: (prefetch.initialPolicy ?? offlinePolicy?.policy),
		// The synthetic categories fallback is a placeholder for whatever the
		// transport's init resolves — mark it provisional so no surface renders
		// copy/actions that init may replace (mid-read copy swap, CLS, consent
		// recorded against a placeholder policy). Real initial policies
		// (prefetch/SSR/offline config) stay authoritative and render at once.
		initialPolicyProvisional: resolveInitialPolicyProvisional(
			enabled,
			prefetch,
			offlinePolicy
		),
		initialPolicyDecision:
			prefetch.initialPolicyDecision ?? offlinePolicy?.policyDecision,
		initialPolicySnapshotToken:
			prefetch.initialPolicySnapshotToken ?? offlinePolicy?.policySnapshotToken,
	});
};

const snapshotConsentsChanged = function snapshotConsentsChanged(
	previous: ConsentSnapshot,
	next: ConsentSnapshot
): boolean {
	return Object.keys(next.consents).some(
		(key) =>
			next.consents[key as AllConsentNames] !==
			previous.consents[key as AllConsentNames]
	);
};

const categoriesWithValue = function categoriesWithValue(
	snapshot: ConsentSnapshot,
	value: boolean
) {
	return Object.entries(snapshot.consents)
		.filter(([, enabled]) => enabled === value)
		.map(([category]) => category as AllConsentNames);
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

const hasRevokedConsent = function hasRevokedConsent(
	previous: ConsentSnapshot,
	next: ConsentSnapshot
) {
	if (!previous.hasConsented) {
		return false;
	}
	return Object.keys(previous.consents).some((key) => {
		const category = key as AllConsentNames;
		if (category === 'necessary') {
			return false;
		}
		return previous.consents[category] && !next.consents[category];
	});
};

const useProviderCallbacks = function useProviderCallbacks(
	kernel: ConsentKernel,
	callbacks: Callbacks | undefined,
	reloadOnConsentRevoked: boolean
) {
	const callbacksRef = useRef(callbacks);
	const saveStartedSnapshotRef = useRef<ConsentSnapshot | null>(null);
	const saveNotifiedRef = useRef(false);

	useEffect(() => {
		callbacksRef.current = callbacks;
	}, [callbacks]);

	useEffect(() => {
		const notifyConsentSaved = (
			previous: ConsentSnapshot | null,
			next: ConsentSnapshot
		) => {
			callbacksRef.current?.onConsentSet?.({
				preferences: next.consents as never,
			});
			if (previous && snapshotConsentsChanged(previous, next)) {
				callbacksRef.current?.onConsentChanged?.({
					allowedCategories: categoriesWithValue(next, true),
					deniedCategories: categoriesWithValue(next, false),
					preferences: next.consents as never,
					previousAllowedCategories: categoriesWithValue(previous, true),
					previousDeniedCategories: categoriesWithValue(previous, false),
					previousPreferences: previous.consents as never,
				});
				if (reloadOnConsentRevoked && hasRevokedConsent(previous, next)) {
					callbacksRef.current?.onBeforeConsentRevocationReload?.({
						preferences: next.consents as never,
					});
					if (typeof window !== 'undefined') {
						window.location.reload();
					}
				}
			}
		};

		const subscriptions = [
			kernel.subscribe((next) => {
				const previous = saveStartedSnapshotRef.current;
				if (!previous || saveNotifiedRef.current || previous === next) {
					return;
				}
				saveNotifiedRef.current = true;
				notifyConsentSaved(previous, next);
			}),
			kernel.events.on('init:applied', ({ snapshot }) => {
				const decision = snapshot.policyDecision as {
					jurisdiction?: unknown;
				} | null;
				callbacksRef.current?.onBannerFetched?.({
					jurisdiction:
						typeof decision?.jurisdiction === 'string'
							? (decision.jurisdiction as never)
							: ('NONE' as never),
					location: {
						countryCode: snapshot.location?.countryCode ?? null,
						regionCode: snapshot.location?.regionCode ?? null,
					},
					translations: snapshot.translations ?? {
						...DEFAULT_TRANSLATIONS,
					},
				});
			}),
			kernel.events.on('command:save:started', () => {
				saveStartedSnapshotRef.current = kernel.getSnapshot();
				saveNotifiedRef.current = false;
			}),
			kernel.events.on('command:save:completed', ({ result }) => {
				if (!result.ok) {
					return;
				}
				if (saveNotifiedRef.current) {
					saveStartedSnapshotRef.current = null;
					return;
				}
				const previous = saveStartedSnapshotRef.current;
				const next = kernel.getSnapshot();
				notifyConsentSaved(previous, next);
				saveStartedSnapshotRef.current = null;
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
	}, [kernel, reloadOnConsentRevoked]);
};

const serializeInitialOnlyOptions = function serializeInitialOnlyOptions(
	options: ConsentProviderOptions
): string {
	return JSON.stringify({
		i18n: options.i18n,
		mode: options.mode?.kind,
		offlinePolicy: options.offlinePolicy,
		policies: options.policies,
		ssrData: Boolean(options.ssrData),
		translations: options.translations,
	});
};

const useProviderOptionSync = function useProviderOptionSync(
	kernel: ConsentKernel,
	options: ConsentProviderOptions,
	enabled: boolean
) {
	const previousEnabledRef = useRef(enabled);
	const previousUserRef = useRef<string | null>(null);
	const previousOverridesRef = useRef<string | null>(null);
	const initialOnlyRef = useRef<string | null>(null);

	useEffect(() => {
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
	}, [kernel, options.user]);

	useEffect(() => {
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
	}, [enabled, kernel, options.overrides]);

	useEffect(() => {
		if (previousEnabledRef.current === enabled) {
			return;
		}
		previousEnabledRef.current = enabled;
		if (enabled) {
			return;
		}
		kernel.set.consent(ALL_CONSENTS_ON);
		kernel.set.activeUI('none');
		kernel.set.hasConsented(true);
	}, [enabled, kernel]);

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
				'c15t ConsentProvider: mode, policies, i18n/translations, offlinePolicy, and ssrData are initial-only options. Remount the provider to apply changes.'
			);
		}
	}, [options]);
};

const InitMount = ({
	enabled,
	kernel,
	eagerInit = false,
}: {
	enabled: boolean;
	kernel: ConsentKernel;
	eagerInit?: boolean;
}) => {
	const skippedEagerRef = useRef(false);
	useEffect(() => {
		if (!enabled) {
			return;
		}
		// The provider may have dispatched init at kernel creation (eager,
		// render-time) — skip this effect's first pass so init fires exactly
		// once, while later `enabled` flips still re-init.
		if (eagerInit && !skippedEagerRef.current) {
			skippedEagerRef.current = true;
			return;
		}
		void kernel.commands.init();
	}, [enabled, kernel, eagerInit]);
	return null;
};

const ScriptsMount = ({
	options,
	scripts,
}: {
	options?: UseScriptLoaderOptions;
	scripts: Script[];
}) => {
	const kernel = useContext(KernelContext);
	const handleRef = useRef<{
		dispose: () => void;
		updateScripts: (scripts: Script[]) => void;
	} | null>(null);
	const latestScriptsRef = useRef(scripts);
	const latestOptionsRef = useRef(options);

	useEffect(() => {
		latestScriptsRef.current = scripts;
		latestOptionsRef.current = options;
	}, [options, scripts]);

	useEffect(() => {
		if (!kernel) {
			return;
		}
		let disposed = false;
		void (async () => {
			const { createScriptLoader } = await loadScriptLoaderModule();
			if (disposed) {
				return;
			}
			const created = createScriptLoader({
				kernel,
				onDebug: latestOptionsRef.current?.onDebug,
				scripts: latestScriptsRef.current,
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

const PersistenceMount = ({ options }: { options?: UsePersistenceOptions }) => {
	usePersistence(options);
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
const ThemeStyleMount = ({ theme }: { theme?: Theme }) => {
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
			// oxlint-disable-next-line react/no-danger -- Generated CSS variables
			dangerouslySetInnerHTML={{ __html: themeCSS }}
		/>
	);
};

const IABGate = ({
	enabled,
	initialModel,
	kernel,
	options,
	children,
}: {
	enabled: boolean;
	initialModel?: string | null;
	kernel: ConsentKernel;
	options: NormalizedIABOptions | null;
	children: ReactNode;
}) => {
	const snapshot = useSyncExternalStore(
		(listener) => kernel.subscribe(listener),
		() => kernel.getSnapshot(),
		() => kernel.getServerSnapshot()
	);
	const { model } = snapshot;
	const shouldLoadIAB =
		model === 'iab' ||
		model === null ||
		(model === undefined && initialModel === 'iab');
	const cmpId = options?.cmpId ?? snapshot.iab?.cmpId;

	if (!enabled || !options || !shouldLoadIAB || typeof cmpId !== 'number') {
		return children;
	}
	const gvl = options.gvl === undefined ? snapshot.iab?.gvl : options.gvl;
	const customVendors = options.customVendors ?? snapshot.iab?.customVendors;

	return (
		<Suspense fallback={children}>
			<LazyIABProvider
				{...options}
				cmpId={cmpId}
				customVendors={customVendors}
				gvl={gvl}
			>
				{children}
			</LazyIABProvider>
		</Suspense>
	);
};

const normalizePersistenceOptions = function normalizePersistenceOptions(
	options: ConsentProviderOptions
): UsePersistenceOptions | false {
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

const normalizeIabOptions = function normalizeIabOptions(
	iab: ProviderIABOptions | undefined
): NormalizedIABOptions | null {
	if (iab === false || !iab || iab.enabled === false) {
		return null;
	}
	return {
		...iab,
		cmpVersion:
			typeof iab.cmpVersion === 'string'
				? Number(iab.cmpVersion)
				: iab.cmpVersion,
	};
};

/**
 * v3 ConsentProvider.
 *
 * Creates one kernel per mount, provides it via context, and wires the
 * curated v2-like options surface to v3 modules. It does not mirror the
 * snapshot into React state; selector hooks still subscribe directly to
 * the kernel through `useSyncExternalStore`.
 */
export const ConsentProvider = ({
	options,
	children,
}: ConsentProviderProps) => {
	const [providerKernelState, setProviderKernelState] = useState(() => {
		const created = createProviderKernel(options);
		// Kick the init roundtrip off during first client render so its
		// network latency overlaps hydration instead of following it — with
		// the banner gated on init resolution (authoritative-only rendering),
		// dispatching init from a post-hydration effect would serialize
		// throttled hydration and the backend roundtrip back-to-back.
		const shouldEagerInit =
			typeof window !== 'undefined' && getEnabled(options);
		if (shouldEagerInit) {
			void created.commands.init();
		}
		return { eagerInit: shouldEagerInit, kernel: created };
	});
	void setProviderKernelState;
	const { kernel, eagerInit } = providerKernelState;
	const enabled = getEnabled(options);
	const reloadOnConsentRevoked = options.reloadOnConsentRevoked !== false;
	const persistenceOptions = normalizePersistenceOptions(options);
	const iabOptions = normalizeIabOptions(options.iab);
	const { scripts, networkBlocker } = options;
	const windowDebugPkg = options.__debugPkg ?? '@c15t/react';
	const windowDebugMode = resolveWindowDebugMode(options.mode);

	useProviderCallbacks(kernel, options.callbacks, reloadOnConsentRevoked);
	useProviderOptionSync(kernel, options, enabled);
	useEffect(() => () => kernel.dispose(), [kernel]);

	const userTheme = options.theme;

	const themeContextValue = useMemo(
		() => ({
			colorScheme: options.colorScheme,
			disableAnimation: options.disableAnimation,
			noStyle: options.noStyle,
			scrollLock: options.scrollLock,
			theme: userTheme,
			trapFocus: options.trapFocus ?? true,
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
		}),
		[options.components, options.legalLinks]
	);

	useColorScheme(options.colorScheme);

	const providerChildren = (
		<>
			<InitMount
				enabled={enabled}
				kernel={kernel}
				eagerInit={eagerInit}
			/>
			<WindowDebugMount
				pkg={windowDebugPkg}
				mode={windowDebugMode}
			/>
			<WindowKernelMount kernel={kernel} />
			{enabled && persistenceOptions ? (
				<PersistenceMount options={persistenceOptions} />
			) : null}
			{enabled && scripts && scripts.length > 0 ? (
				<ScriptsMount
					options={options.scriptLoader}
					scripts={scripts}
				/>
			) : null}
			{enabled && networkBlocker ? (
				<NetworkBlockerMount options={networkBlocker} />
			) : null}
			{children}
		</>
	);

	return (
		<KernelContext.Provider value={kernel}>
			<V3ThemeProvider
				themeConfig={themeContextValue}
				uiConfig={uiConfigValue}
			>
				<ThemeStyleMount theme={userTheme} />
				<IABGate
					enabled={enabled}
					initialModel={
						options.prefetch?.initialPolicy?.model ??
						options.offlinePolicy?.policy?.model
					}
					kernel={kernel}
					options={iabOptions}
				>
					{providerChildren}
				</IABGate>
			</V3ThemeProvider>
		</KernelContext.Provider>
	);
};
