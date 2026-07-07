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
import type {
	KernelConfig,
	KernelOverrides,
	KernelTransport,
	KernelUser,
} from 'c15t/v3';
import type { Script } from 'c15t/v3/modules/script-loader';
import type { ReactNode } from 'react';
import type { IABProviderProps } from '../iab-context';
import type {
	UseNetworkBlockerOptions,
	UsePersistenceOptions,
	UseScriptLoaderOptions,
} from '../module-hooks';
import type { ConsentManagerOptions } from '../types/consent-manager';
import type { ReactComponentSlots } from '../types/slots';

export type ProviderMode = 'hosted' | 'offline' | 'custom' | 'c15t';

export type ProviderIABOptions =
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
}

export interface ConsentProviderProps {
	options: ConsentProviderOptions;
	children: ReactNode;
}

export function normalizeUser(
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

export function resolveProviderI18n(
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

export function getEnabled(options: ConsentProviderOptions): boolean {
	return options.enabled ?? options.store?.enabled ?? true;
}

export function getStorageConfig(
	options: ConsentProviderOptions
): StorageConfig | undefined {
	return options.storageConfig ?? options.store?.storageConfig;
}

export function getProviderCallbacks(
	options: ConsentProviderOptions
): Callbacks | undefined {
	return options.callbacks ?? options.store?.callbacks;
}

export function getProviderScripts(
	options: ConsentProviderOptions
): Script[] | undefined {
	return options.scripts ?? options.store?.scripts;
}

export function getProviderNetworkBlocker(
	options: ConsentProviderOptions
): UseNetworkBlockerOptions | NetworkBlockerConfig | false | undefined {
	return options.networkBlocker ?? options.store?.networkBlocker;
}

export function getProviderIab(
	options: ConsentProviderOptions
): ProviderIABOptions | undefined {
	return (options.iab ?? options.store?.iab) as ProviderIABOptions | undefined;
}

export function getProviderLegalLinks(
	options: ConsentProviderOptions
): LegalLinks | undefined {
	return options.legalLinks ?? options.store?.legalLinks;
}

export function getProviderCategories(
	options: ConsentProviderOptions
): AllConsentNames[] | undefined {
	return (
		options.consentCategories ??
		options.store?.initialConsentCategories ??
		undefined
	);
}

export function getProviderPolicies(
	options: ConsentProviderOptions
): PolicyConfig[] | undefined {
	return (
		options.policies ??
		options.offlinePolicy?.policyPacks ??
		options.store?.offlinePolicy?.policyPacks
	);
}

export function getProviderOfflinePolicy(
	options: ConsentProviderOptions
): OfflinePolicyConfig | undefined {
	return options.offlinePolicy ?? options.store?.offlinePolicy;
}

export function normalizePersistenceOptions(
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

export function normalizeIabOptions(
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
