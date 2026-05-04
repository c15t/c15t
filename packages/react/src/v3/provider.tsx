'use client';

import { generateThemeCSS } from '@c15t/ui/theme';
import { deepMerge } from '@c15t/ui/utils';
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
} from 'c15t';
import { defaultTranslationConfig } from 'c15t';
import {
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
	type TranslationsResponse,
} from 'c15t/v3';
import type { Script } from 'c15t/v3/modules/script-loader';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useColorScheme } from '../hooks/use-color-scheme';
import type { ConsentManagerOptions } from '../types/consent-manager';
import { defaultTheme } from '../utils/theme-utils';
import { KernelContext } from './context';
import type { IABProviderProps } from './iab-context';
import { IABProvider } from './iab-context';
import {
	type UseNetworkBlockerOptions,
	type UsePersistenceOptions,
	type UseScriptLoaderOptions,
	useNetworkBlocker,
	usePersistence,
	useScriptLoader,
} from './module-hooks';
import { V3ThemeProvider } from './theme-provider';
import type { V3UIConfigValue } from './ui-config-context';

type ProviderMode = 'hosted' | 'offline' | 'custom' | 'c15t';

type ProviderIABOptions =
	| (Partial<Omit<IABProviderProps, 'children'>> &
			Partial<Pick<IABConfig, 'enabled' | 'cmpId' | 'cmpVersion' | 'vendors'>>)
	| false;

export interface ConsentProviderOptions
	extends Pick<
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
	const translations =
		i18n.messages[language] ??
		i18n.messages.en ??
		defaultTranslationConfig.translations.en;
	return {
		language,
		translations: translations as TranslationsResponse,
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
	if (!categories || categories.length === 0) return undefined;
	return {
		id: 'inline-consent-categories',
		model: 'opt-in',
		consent: {
			categories,
			scopeMode: 'permissive',
		},
		ui: {
			mode: 'banner',
		},
	};
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
	return {
		location: init.location as never,
		translations: init.translations as never,
		branding: init.branding as never,
		gvl: (data.gvl ?? init.gvl) as never,
		customVendors: init.customVendors as never,
		cmpId: init.cmpId as never,
		policy: init.policy as never,
		policyDecision: init.policyDecision as never,
		policySnapshotToken: init.policySnapshotToken as never,
		consents: init.consents as never,
		hasConsented: init.hasConsented as never,
	};
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
			return {
				location: init.location as never,
				translations: init.translations as never,
				branding: init.branding as never,
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
				body: {
					subjectId: payload.subjectId,
					externalSubjectId: payload.user?.externalId,
					identityProvider: payload.user?.identityProvider,
					domain:
						typeof window === 'undefined'
							? 'localhost'
							: window.location.hostname,
					type: 'cookie_banner',
					preferences: payload.consents,
					givenAt: Date.now(),
					jurisdictionModel: payload.model ?? undefined,
					uiSource: payload.uiSource ?? undefined,
					consentAction: payload.consentAction,
					policySnapshotToken: payload.policySnapshotToken ?? undefined,
					tcString: payload.tcString ?? undefined,
				},
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
		mode === 'custom' && options.endpointHandlers
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
					}));

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
	callbacksRef.current = callbacks;

	useEffect(() => {
		const subscriptions = [
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
			}),
			kernel.events.on('command:save:completed', ({ result }) => {
				if (!result.ok) return;
				const previous = saveStartedSnapshotRef.current;
				const next = kernel.getSnapshot();
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
}: {
	enabled: boolean;
	kernel: ConsentKernel;
}) {
	useEffect(() => {
		if (!enabled) return;
		void kernel.commands.init();
	}, [enabled, kernel]);
	return null;
}

function ScriptsMount({
	options,
	scripts,
}: {
	options?: UseScriptLoaderOptions;
	scripts: Script[];
}) {
	useScriptLoader(scripts, options);
	return null;
}

function NetworkBlockerMount({
	options,
}: {
	options: UseNetworkBlockerOptions;
}) {
	useNetworkBlocker(options);
	return null;
}

function PersistenceMount({ options }: { options?: UsePersistenceOptions }) {
	usePersistence(options);
	return null;
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
	const [kernel] = useState(() => createProviderKernel(options));
	const enabled = getEnabled(options);
	const reloadOnConsentRevoked =
		(options.reloadOnConsentRevoked ??
			options.store?.reloadOnConsentRevoked) !== false;
	const persistenceOptions = normalizePersistenceOptions(options);
	const iabOptions = normalizeIabOptions(getProviderIab(options));
	const scripts = getProviderScripts(options);
	const networkBlocker = getProviderNetworkBlocker(options);

	useProviderCallbacks(
		kernel,
		getProviderCallbacks(options),
		reloadOnConsentRevoked
	);
	useProviderOptionSync(kernel, options, enabled);

	// Merge the user's theme separately on its own reference so callers
	// passing a fresh `options` object each render (but a stable `theme`)
	// don't pay for a deepMerge on every render. generateThemeCSS below
	// also depends on this, so stabilizing the merge keeps the <style>
	// tag content stable.
	const userTheme = options.theme;
	const mergedTheme = useMemo(
		() => deepMerge(defaultTheme, userTheme ?? {}),
		[userTheme]
	);

	const themeContextValue = useMemo(
		() => ({
			theme: mergedTheme,
			noStyle: options.noStyle,
			disableAnimation: options.disableAnimation,
			scrollLock: options.scrollLock,
			trapFocus: options.trapFocus ?? true,
			colorScheme: options.colorScheme,
		}),
		[
			mergedTheme,
			options.noStyle,
			options.disableAnimation,
			options.scrollLock,
			options.trapFocus,
			options.colorScheme,
		]
	);

	const uiConfigValue = useMemo<V3UIConfigValue>(
		() => ({
			legalLinks: getProviderLegalLinks(options),
		}),
		[options]
	);

	const themeCSS = useMemo(() => {
		return generateThemeCSS(themeContextValue.theme);
	}, [themeContextValue.theme]);

	useColorScheme(options.colorScheme);

	const providerChildren = (
		<>
			<InitMount enabled={enabled} kernel={kernel} />
			{enabled && persistenceOptions ? (
				<PersistenceMount options={persistenceOptions} />
			) : null}
			{enabled && scripts && scripts.length > 0 ? (
				<ScriptsMount options={options.scriptLoader} scripts={scripts} />
			) : null}
			{enabled && networkBlocker ? (
				<NetworkBlockerMount options={networkBlocker} />
			) : null}
			{children}
		</>
	);

	return (
		<KernelContext.Provider value={kernel}>
			<V3ThemeProvider themeConfig={themeContextValue} uiConfig={uiConfigValue}>
				{themeCSS ? (
					<style
						id="c15t-theme"
						// biome-ignore lint/security/noDangerouslySetInnerHtml: Generated CSS variables
						dangerouslySetInnerHTML={{ __html: themeCSS }}
					/>
				) : null}
				{enabled && iabOptions ? (
					<IABProvider {...iabOptions}>{providerChildren}</IABProvider>
				) : (
					providerChildren
				)}
			</V3ThemeProvider>
		</KernelContext.Provider>
	);
}

/*
 * v3 ConsentProvider.
 * @deprecated use ConsentManager instead
 */
export function ConsentManagerProvider({
	options,
	children,
}: ConsentProviderProps) {
	return ConsentProvider({ options, children });
}
