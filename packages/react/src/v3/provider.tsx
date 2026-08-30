'use client';

import type {
	AllConsentNames,
	Callbacks,
	CustomClientOptions,
	I18nConfig,
	IABConfig,
	LegalLinks,
	NetworkBlockerConfig,
	OfflinePolicyConfig,
	PolicyConfig,
	SSRInitialData,
	StorageConfig,
	StoreOptions,
	TranslationConfig,
	User,
} from '@c15t/core';
import {
	buildSubjectPostBody,
	type ConsentKernel,
	type ConsentSnapshot,
	createConsentKernel,
	createHostedTransport,
	createOfflineTransport,
	type InitResponse,
	type KernelConfig,
	type KernelEvent,
	type KernelOverrides,
	type KernelTranslations,
	type KernelTransport,
	type KernelUser,
	mapInitOutputToInitResponse,
	type TranslationsResponse,
} from '@c15t/core/v3';
import type { Script } from '@c15t/core/v3/modules/script-loader';
import {
	createWindowDebug,
	resolveWindowDebugMode,
	type WindowDebugMode,
} from '@c15t/core/v3/modules/window-debug';
import { buildDefaultOptInPolicy, type InitOutput } from '@c15t/schema/types';
import { deepMergeTranslations, type Translations } from '@c15t/translations';
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
import type { ConsentManagerOptions } from './types/consent-manager';
import type { ReactComponentSlots } from './types/slots';
import type { Theme } from './types/theme';
import type { V3UIConfigValue } from './ui-config-context';
import { defaultTranslationConfig } from './utils/default-translation-config';

type ProviderMode = 'hosted' | 'offline' | 'custom' | 'c15t';

type ProviderIABOptions =
	| (Partial<Omit<IABProviderProps, 'children'>> &
			Partial<Pick<IABConfig, 'enabled' | 'cmpId' | 'cmpVersion' | 'vendors'>>)
	| false;

export interface ConsentProviderOptions extends Pick<
	ConsentManagerOptions,
	| 'colorScheme'
	| 'disableAnimation'
	| 'noStyle'
	| 'scrollLock'
	| 'theme'
	| 'trapFocus'
> {
	enabled?: boolean;
	mode?: ProviderMode;
	backendURL?: string;
	domain?: string;
	transport?: KernelTransport;
	headers?: Record<string, string>;
	customFetch?: typeof fetch;
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
	 * @deprecated Use top-level v3 provider options instead. Compatible store
	 * fields are read as fallbacks when the matching top-level option is absent.
	 */
	store?: StoreOptions;
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
	 * @deprecated Prefer hosted/offline v3 transports. Accepted for v2 fixture
	 * compatibility and bridged through a minimal custom transport.
	 */
	endpointHandlers?: CustomClientOptions['endpointHandlers'];
	/** @internal Adapter package name reported by `window.c15t`. */
	__debugPkg?: string;
}

export interface ConsentProviderProps {
	options: ConsentProviderOptions;
	children: ReactNode;
}

const ALL_CONSENTS_ON = {
	necessary: true,
	functionality: true,
	marketing: true,
	measurement: true,
	experience: true,
} as const;

const DEFAULT_TRANSLATIONS: KernelTranslations = {
	language: 'en',
	translations: defaultTranslationConfig.translations.en as never,
};

const LazyIABProvider = lazy(async () => {
	const module = await import('./iab-context');
	return { default: module.IABProvider };
});

function normalizeUser(
	user: ConsentProviderOptions['user']
): KernelUser | undefined {
	if (!user) return undefined;
	if ('externalId' in user) {
		return user;
	}
	return {
		externalId: user.id,
		identityProvider: user.identityProvider,
	};
}

function normalizeLegacyI18n(
	translations: Partial<TranslationConfig> | undefined
): Partial<I18nConfig> | undefined {
	if (!translations?.translations) return undefined;
	return {
		messages: translations.translations,
		locale: translations.defaultLanguage,
		detectBrowserLanguage:
			translations.disableAutoLanguageSwitch === undefined
				? undefined
				: !translations.disableAutoLanguageSwitch,
	};
}

function resolveProviderI18n(
	options: ConsentProviderOptions
): Partial<I18nConfig> | undefined {
	return (
		options.i18n ??
		options.store?.initialI18nConfig ??
		normalizeLegacyI18n(
			options.translations ?? options.store?.initialTranslationConfig
		)
	);
}

function resolveI18nTranslations(
	i18n: Partial<I18nConfig> | undefined
): KernelTranslations | undefined {
	if (!i18n?.messages) return undefined;
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
}

function getEnabled(options: ConsentProviderOptions): boolean {
	return options.enabled ?? options.store?.enabled ?? true;
}

function getStorageConfig(
	options: ConsentProviderOptions
): StorageConfig | undefined {
	return options.storageConfig ?? options.store?.storageConfig;
}

function getProviderCallbacks(
	options: ConsentProviderOptions
): Callbacks | undefined {
	return options.callbacks ?? options.store?.callbacks;
}

function getProviderScripts(
	options: ConsentProviderOptions
): Script[] | undefined {
	return options.scripts ?? options.store?.scripts;
}

function getProviderNetworkBlocker(
	options: ConsentProviderOptions
): UseNetworkBlockerOptions | NetworkBlockerConfig | false | undefined {
	return options.networkBlocker ?? options.store?.networkBlocker;
}

function getProviderIab(
	options: ConsentProviderOptions
): ProviderIABOptions | undefined {
	return (options.iab ?? options.store?.iab) as ProviderIABOptions | undefined;
}

function getProviderLegalLinks(
	options: ConsentProviderOptions
): LegalLinks | undefined {
	return options.legalLinks ?? options.store?.legalLinks;
}

function getProviderCategories(
	options: ConsentProviderOptions
): AllConsentNames[] | undefined {
	return (
		options.consentCategories ??
		options.store?.initialConsentCategories ??
		undefined
	);
}

function getProviderPolicies(
	options: ConsentProviderOptions
): PolicyConfig[] | undefined {
	return (
		options.policies ??
		options.offlinePolicy?.policyPacks ??
		options.store?.offlinePolicy?.policyPacks
	);
}

function getProviderOfflinePolicy(
	options: ConsentProviderOptions
): OfflinePolicyConfig | undefined {
	return options.offlinePolicy ?? options.store?.offlinePolicy;
}

function buildInlinePolicy(categories: AllConsentNames[] | undefined) {
	return buildDefaultOptInPolicy(categories);
}

function buildNoBannerPolicy(): KernelConfig['initialPolicy'] {
	return {
		id: 'no_banner',
		model: 'none',
		ui: {
			mode: 'none',
		},
	};
}

function mapSSRInitialData(
	data: SSRInitialData | undefined
): InitResponse | null {
	if (!data?.init) return null;
	const init = data.init as Record<string, unknown>;
	return mapInitOutputToInitResponse(
		{
			...init,
			gvl: data.gvl ?? init.gvl,
		} as InitOutput,
		{}
	);
}

function withSSRData(
	transport: KernelTransport,
	ssrData: ConsentProviderOptions['ssrData']
): KernelTransport {
	if (!ssrData) return transport;
	let used = false;
	return {
		...transport,
		async init(ctx) {
			if (!used) {
				used = true;
				const mapped = mapSSRInitialData(await ssrData);
				if (mapped) return mapped as never;
			}
			return transport.init?.(ctx) ?? {};
		},
	};
}

function createCustomTransport(
	endpointHandlers: CustomClientOptions['endpointHandlers']
): KernelTransport {
	return {
		async init() {
			if (!endpointHandlers.init) return {};
			const response = await endpointHandlers.init();
			if (!response.ok || !response.data) {
				throw response.error ?? new Error('c15t custom transport: init failed');
			}
			const init = response.data as Record<string, unknown>;
			if (init.location && init.translations && init.branding) {
				return mapInitOutputToInitResponse(init as InitOutput, {});
			}
			return {
				resolvedOverrides: init.resolvedOverrides as never,
				consents: init.consents as never,
				hasConsented: init.hasConsented as never,
				subjectId: init.subjectId as never,
				location: init.location as never,
				translations: init.translations as never,
				branding:
					init.branding === 'none' ? undefined : (init.branding as never),
				gvl: init.gvl as never,
				customVendors: init.customVendors as never,
				cmpId: init.cmpId as never,
				policy: init.policy as never,
				policyDecision: init.policyDecision as never,
				policySnapshotToken: init.policySnapshotToken as never,
			};
		},
		async save(payload) {
			const response = await endpointHandlers.setConsent({
				body: buildSubjectPostBody(payload, {
					domain:
						typeof window === 'undefined'
							? 'localhost'
							: window.location.hostname,
				}),
			});
			return {
				ok: response.ok,
				subjectId: response.data?.subjectId,
			};
		},
	};
}

function createStaticOfflineTransport(
	prefetch: KernelConfig,
	offlinePolicy: OfflinePolicyConfig | undefined,
	translations: KernelTranslations
): KernelTransport | null {
	const policy = prefetch.initialPolicy ?? offlinePolicy?.policy;
	if (!policy) return null;
	return {
		async init(ctx) {
			return {
				location: {
					countryCode: ctx.overrides.country ?? null,
					regionCode: ctx.overrides.region ?? null,
				},
				translations:
					prefetch.initialTranslations ??
					(ctx.overrides.language
						? { ...translations, language: ctx.overrides.language }
						: translations),
				branding: prefetch.initialBranding ?? 'c15t',
				policy,
				policyDecision:
					prefetch.initialPolicyDecision ?? offlinePolicy?.policyDecision,
				policySnapshotToken:
					prefetch.initialPolicySnapshotToken ??
					offlinePolicy?.policySnapshotToken,
			};
		},
		async save(payload) {
			return { ok: true, subjectId: payload.subjectId };
		},
	};
}

function createProviderKernel(options: ConsentProviderOptions): ConsentKernel {
	const enabled = getEnabled(options);
	const mode: ProviderMode =
		options.mode ?? (options.backendURL ? 'hosted' : 'offline');
	const prefetch = options.prefetch ?? {};
	const offlinePolicy = getProviderOfflinePolicy(options);
	const i18nTranslations =
		resolveI18nTranslations(resolveProviderI18n(options)) ??
		DEFAULT_TRANSLATIONS;

	const staticOfflineTransport = createStaticOfflineTransport(
		prefetch,
		offlinePolicy,
		i18nTranslations
	);

	const baseTransport =
		options.transport ??
		(mode === 'custom' && options.endpointHandlers
			? createCustomTransport(options.endpointHandlers)
			: mode === 'hosted' || mode === 'c15t'
				? createHostedTransport({
						backendURL: options.backendURL ?? '/api/c15t',
						domain: options.domain,
						headers: options.headers,
						fetch: options.customFetch,
					})
				: (staticOfflineTransport ??
					createOfflineTransport({
						policyPacks: getProviderPolicies(options),
						translations: i18nTranslations,
					})));

	const transport = withSSRData(baseTransport, options.ssrData);

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
				: (prefetch.initialPolicy ??
					offlinePolicy?.policy ??
					(buildInlinePolicy(
						getProviderCategories(options)
					) as KernelConfig['initialPolicy'])),
		// The synthetic categories fallback is a placeholder for whatever the
		// transport's init resolves — mark it provisional so no surface renders
		// copy/actions that init may replace (mid-read copy swap, CLS, consent
		// recorded against a placeholder policy). Real initial policies
		// (prefetch/SSR/offline config) stay authoritative and render at once.
		initialPolicyProvisional:
			enabled !== false && !prefetch.initialPolicy && !offlinePolicy?.policy,
		initialPolicyDecision:
			prefetch.initialPolicyDecision ?? offlinePolicy?.policyDecision,
		initialPolicySnapshotToken:
			prefetch.initialPolicySnapshotToken ?? offlinePolicy?.policySnapshotToken,
	});
}

function snapshotConsentsChanged(
	previous: ConsentSnapshot,
	next: ConsentSnapshot
): boolean {
	return Object.keys(next.consents).some(
		(key) =>
			next.consents[key as AllConsentNames] !==
			previous.consents[key as AllConsentNames]
	);
}

function categoriesWithValue(snapshot: ConsentSnapshot, value: boolean) {
	return Object.entries(snapshot.consents)
		.filter(([, enabled]) => enabled === value)
		.map(([category]) => category as AllConsentNames);
}

function stringifyError(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (typeof error === 'string') return error;
	try {
		return JSON.stringify(error);
	} catch {
		return String(error);
	}
}

function hasRevokedConsent(previous: ConsentSnapshot, next: ConsentSnapshot) {
	if (!previous.hasConsented) return false;
	return Object.keys(previous.consents).some((key) => {
		const category = key as AllConsentNames;
		if (category === 'necessary') return false;
		return previous.consents[category] && !next.consents[category];
	});
}

function useProviderCallbacks(
	kernel: ConsentKernel,
	callbacks: Callbacks | undefined,
	reloadOnConsentRevoked: boolean
) {
	const callbacksRef = useRef(callbacks);
	const saveStartedSnapshotRef = useRef<ConsentSnapshot | null>(null);
	const saveNotifiedRef = useRef(false);
	callbacksRef.current = callbacks;

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
					preferences: next.consents as never,
					previousPreferences: previous.consents as never,
					allowedCategories: categoriesWithValue(next, true),
					deniedCategories: categoriesWithValue(next, false),
					previousAllowedCategories: categoriesWithValue(previous, true),
					previousDeniedCategories: categoriesWithValue(previous, false),
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
				if (!result.ok) return;
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
}

function serializeInitialOnlyOptions(options: ConsentProviderOptions): string {
	return JSON.stringify({
		backendURL: options.backendURL,
		domain: options.domain,
		mode: options.mode,
		headers: options.headers,
		hasCustomFetch: Boolean(options.customFetch),
		policies: options.policies,
		i18n: options.i18n,
		translations: options.translations,
		offlinePolicy: options.offlinePolicy,
		ssrData: Boolean(options.ssrData),
		storeOfflinePolicy: options.store?.offlinePolicy,
		storeInitialI18nConfig: options.store?.initialI18nConfig,
		storeInitialTranslationConfig: options.store?.initialTranslationConfig,
	});
}

function useProviderOptionSync(
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
				void kernel.commands.identify(nextUser);
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
		if (previousEnabledRef.current === enabled) return;
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
		if (nodeEnv === 'production') return;
		const serialized = serializeInitialOnlyOptions(options);
		if (initialOnlyRef.current === null) {
			initialOnlyRef.current = serialized;
			return;
		}
		if (initialOnlyRef.current !== serialized) {
			initialOnlyRef.current = serialized;
			console.warn(
				'c15t v3 ConsentProvider: backendURL, domain, mode, headers, customFetch, policies, i18n/translations, offlinePolicy, and ssrData are initial-only options. Remount the provider to apply changes.'
			);
		}
	}, [options]);
}

function InitMount({
	enabled,
	kernel,
	eagerInit = false,
}: {
	enabled: boolean;
	kernel: ConsentKernel;
	eagerInit?: boolean;
}) {
	const skippedEagerRef = useRef(false);
	useEffect(() => {
		if (!enabled) return;
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
}

function ScriptsMount({
	options,
	scripts,
}: {
	options?: UseScriptLoaderOptions;
	scripts: Script[];
}) {
	const kernel = useContext(KernelContext);
	const handleRef = useRef<{
		dispose(): void;
		updateScripts(scripts: Script[]): void;
	} | null>(null);
	const latestScriptsRef = useRef(scripts);
	const latestOptionsRef = useRef(options);

	latestScriptsRef.current = scripts;
	latestOptionsRef.current = options;

	useEffect(() => {
		if (!kernel) return;
		let disposed = false;
		void import('@c15t/core/v3/modules/script-loader').then(
			({ createScriptLoader }) => {
				if (disposed) return;
				const created = createScriptLoader({
					kernel,
					scripts: latestScriptsRef.current,
					onDebug: latestOptionsRef.current?.onDebug,
				});
				handleRef.current = created;
			}
		);
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
}

function NetworkBlockerMount({
	options,
}: {
	options: UseNetworkBlockerOptions;
}) {
	const kernel = useContext(KernelContext);
	const handleRef = useRef<{
		dispose(): void;
		updateRules(rules: UseNetworkBlockerOptions['rules']): void;
		setEnabled(enabled: boolean): void;
	} | null>(null);
	const latestOptionsRef = useRef(options);
	latestOptionsRef.current = options;

	useEffect(() => {
		if (!kernel) return;
		let disposed = false;
		void import('@c15t/core/v3/modules/network-blocker').then(
			({ createNetworkBlocker }) => {
				if (disposed) return;
				const latest = latestOptionsRef.current;
				const created = createNetworkBlocker({
					kernel,
					rules: latest.rules,
					enabled: latest.enabled,
					logBlockedRequests: latest.logBlockedRequests,
					onRequestBlocked: latest.onRequestBlocked,
				});
				handleRef.current = created;
			}
		);
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
}

function PersistenceMount({ options }: { options?: UsePersistenceOptions }) {
	usePersistence(options);
	return null;
}

function WindowDebugMount({
	pkg,
	mode,
}: {
	pkg: string;
	mode: WindowDebugMode;
}) {
	useEffect(() => {
		// The module is tiny and dependency-free; `createWindowDebug` itself
		// guards against pages that made `window.c15t` non-writable.
		const handle = createWindowDebug({ pkg, mode });
		return () => handle.dispose();
	}, [mode, pkg]);

	return null;
}

function ThemeStyleMount({ theme }: { theme?: Theme }) {
	const [themeCSS, setThemeCSS] = useState('');

	useEffect(() => {
		if (!theme) {
			setThemeCSS('');
			return;
		}

		let disposed = false;
		void import('@c15t/ui/theme').then(({ generateThemeCSS }) => {
			if (!disposed) {
				setThemeCSS(generateThemeCSS(theme as never));
			}
		});

		return () => {
			disposed = true;
		};
	}, [theme]);

	if (!themeCSS) return null;

	return (
		<style
			id="c15t-theme"
			// oxlint-disable-next-line react/no-danger -- Generated CSS variables
			dangerouslySetInnerHTML={{ __html: themeCSS }}
		/>
	);
}

function IABGate({
	enabled,
	initialModel,
	kernel,
	options,
	children,
}: {
	enabled: boolean;
	initialModel?: string | null;
	kernel: ConsentKernel;
	options: Omit<IABProviderProps, 'children'> | null;
	children: ReactNode;
}) {
	const model = useSyncExternalStore(
		(listener) => kernel.subscribe(listener),
		() => kernel.getSnapshot().model,
		() => kernel.getServerSnapshot().model
	);
	const shouldLoadIAB =
		model === 'iab' || (model == null && initialModel === 'iab');

	if (!enabled || !options || !shouldLoadIAB) {
		return <>{children}</>;
	}

	return (
		<Suspense fallback={<>{children}</>}>
			<LazyIABProvider {...options}>{children}</LazyIABProvider>
		</Suspense>
	);
}

function normalizePersistenceOptions(
	options: ConsentProviderOptions
): UsePersistenceOptions | false {
	if (options.persistence === false) return false;
	const storageConfig = getStorageConfig(options);
	if (options.persistence === true || options.persistence === undefined) {
		return { storageConfig };
	}
	return {
		storageConfig: options.persistence.storageConfig ?? storageConfig,
		skipHydration: options.persistence.skipHydration,
	};
}

function normalizeIabOptions(
	iab: ProviderIABOptions | undefined
): Omit<IABProviderProps, 'children'> | null {
	if (iab === false || !iab || iab.enabled === false) return null;
	const cmpId = iab.cmpId;
	if (typeof cmpId !== 'number') return null;
	return {
		...iab,
		cmpId,
		cmpVersion:
			typeof iab.cmpVersion === 'string'
				? Number(iab.cmpVersion)
				: iab.cmpVersion,
	};
}

/**
 * v3 ConsentProvider.
 *
 * Creates one kernel per mount, provides it via context, and wires the
 * curated v2-like options surface to v3 modules. It does not mirror the
 * snapshot into React state; selector hooks still subscribe directly to
 * the kernel through `useSyncExternalStore`.
 */
export function ConsentProvider({ options, children }: ConsentProviderProps) {
	const [{ kernel, eagerInit }] = useState(() => {
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
		return { kernel: created, eagerInit: shouldEagerInit };
	});
	const enabled = getEnabled(options);
	const reloadOnConsentRevoked =
		(options.reloadOnConsentRevoked ??
			options.store?.reloadOnConsentRevoked) !== false;
	const persistenceOptions = normalizePersistenceOptions(options);
	const iabOptions = normalizeIabOptions(getProviderIab(options));
	const scripts = getProviderScripts(options);
	const networkBlocker = getProviderNetworkBlocker(options);
	const windowDebugPkg = options.__debugPkg ?? '@c15t/react';
	const windowDebugMode = resolveWindowDebugMode(options);

	useProviderCallbacks(
		kernel,
		getProviderCallbacks(options),
		reloadOnConsentRevoked
	);
	useProviderOptionSync(kernel, options, enabled);

	const userTheme = options.theme;

	const themeContextValue = useMemo(
		() => ({
			theme: userTheme,
			noStyle: options.noStyle,
			disableAnimation: options.disableAnimation,
			scrollLock: options.scrollLock,
			trapFocus: options.trapFocus ?? true,
			colorScheme: options.colorScheme,
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
			legalLinks: getProviderLegalLinks(options),
		}),
		[options]
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
						getProviderOfflinePolicy(options)?.policy?.model
					}
					kernel={kernel}
					options={iabOptions}
				>
					{providerChildren}
				</IABGate>
			</V3ThemeProvider>
		</KernelContext.Provider>
	);
}
