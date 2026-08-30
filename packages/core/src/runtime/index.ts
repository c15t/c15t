import {
	normalizeI18nConfig,
	resolveTranslationInput,
} from '@c15t/translations';
import type { I18nConfig } from '@c15t/translations';

import { version } from '~/version';

import { clearClientRegistry, configureConsentManager } from '../client';
import type { ConsentManagerOptions } from '../client';
import { getMatchingPrefetchedInitialData } from '../libs/prefetch/prefetch';
import { createConsentManagerStore } from '../store';
import type { StoreOptions } from '../store/type';
import type { AllConsentNames, TranslationConfig } from '../types';

type ConsentManagerInstance = ReturnType<typeof configureConsentManager>;
type ConsentStoreInstance = ReturnType<typeof createConsentManagerStore>;

interface ConsentRuntimeDependencies {
	configureConsentManager: typeof configureConsentManager;
	createConsentManagerStore: typeof createConsentManagerStore;
	getMatchingPrefetchedInitialData: typeof getMatchingPrefetchedInitialData;
	clearClientRegistry: typeof clearClientRegistry;
}

const defaultConsentRuntimeDependencies: ConsentRuntimeDependencies = {
	configureConsentManager,
	createConsentManagerStore,
	getMatchingPrefetchedInitialData,
	clearClientRegistry,
};

const DEFAULT_BACKEND_URL = '/api/c15t';

const managerCache = new Map<string, ConsentManagerInstance>();
const storeCache = new Map<string, ConsentStoreInstance>();

type RuntimeMode = 'hosted' | 'c15t' | 'offline' | 'custom';

function normalizeRuntimeMode(
	mode?: RuntimeMode
): 'hosted' | 'offline' | 'custom' {
	if (mode === 'offline' || mode === 'custom') {
		return mode;
	}

	return 'hosted';
}

export type ConsentRuntimeOptions = ConsentManagerOptions &
	Partial<StoreOptions> & {
		/**
		 * Preferred i18n configuration in c15t v2.
		 */
		i18n?: Partial<I18nConfig>;
		/**
		 * @deprecated Use `i18n` instead.
		 */
		translations?: Partial<TranslationConfig>;
		consentCategories?: AllConsentNames[];
		/**
		 * Enables verbose runtime diagnostics.
		 */
		debug?: boolean;
	};

export interface ConsentRuntimePkgInfo {
	pkg: string;
	version: string;
}

export interface ConsentRuntimeResult {
	consentManager: ConsentManagerInstance;
	consentStore: ConsentStoreInstance;
	cacheKey: string;
}

function generateRuntimeCacheKey(options: {
	mode?: ConsentRuntimeOptions['mode'];
	backendURL?: string;
	endpointHandlers?: unknown;
	storageConfig?: ConsentRuntimeOptions['storageConfig'];
	defaultLanguage?: string;
	languageSetKey?: string;
	offlinePolicyKey?: string;
	headersKey?: string;
	enabled?: boolean;
}): string {
	const enabledKey = options.enabled === false ? 'disabled' : 'enabled';
	const normalizedMode = normalizeRuntimeMode(
		options.mode as RuntimeMode | undefined
	);

	const cacheParts = [
		normalizedMode,
		options.backendURL ?? 'default',
		options.endpointHandlers ? 'custom' : 'none',
		options.storageConfig?.storageKey ?? 'default',
		options.defaultLanguage ?? 'default',
		options.languageSetKey ?? 'default',
		options.offlinePolicyKey ?? 'default',
		options.headersKey ?? 'default',
		enabledKey,
	];

	return cacheParts.join(':');
}

/**
 * Stable cache-key fragment for custom HTTP headers, so hosted clients with
 * different headers never share a cached runtime.
 */
function generateHeadersKey(
	headers?: Record<string, string>
): string | undefined {
	if (!headers) {
		return undefined;
	}

	const entries = Object.entries(headers).sort(([a], [b]) =>
		a.localeCompare(b)
	);

	if (entries.length === 0) {
		return undefined;
	}

	return entries.map(([key, value]) => `${key}=${value}`).join(',');
}

export function getOrCreateConsentRuntime(
	options: ConsentRuntimeOptions,
	pkgInfo?: ConsentRuntimePkgInfo,
	dependencies: ConsentRuntimeDependencies = defaultConsentRuntimeDependencies
): ConsentRuntimeResult {
	const optionBag = options as ConsentRuntimeOptions & {
		headers?: Record<string, string>;
		customFetch?: typeof fetch;
		retryConfig?: unknown;
		endpointHandlers?: unknown;
	};
	type InternalStoreOptions = StoreOptions & {
		__internal?: {
			backendURL?: string;
			requestCredentials?: RequestCredentials;
		};
	};

	const {
		mode,
		backendURL,
		store,
		i18n,
		translations,
		storageConfig,
		enabled,
		iab,
		offlinePolicy,
		consentCategories,
		debug,
		headers,
		nonce,
		customFetch: _unusedCustomFetch,
		retryConfig: _unusedRetryConfig,
		endpointHandlers: _unusedEndpointHandlers,
		...storeOptionOverrides
	} = optionBag;

	const {
		initialI18nConfig: _unusedTopLevelInitialI18nConfig,
		initialTranslationConfig: _unusedTopLevelInitialTranslationConfig,
		ssrData: topLevelSSRData,
		config: topLevelConfig,
		...cleanStoreOptionOverrides
	} = storeOptionOverrides as Partial<StoreOptions>;

	const {
		initialI18nConfig: _unusedStoreInitialI18nConfig,
		initialTranslationConfig: _unusedStoreInitialTranslationConfig,
		ssrData: storeSSRData,
		config: storeConfig,
		...storeWithoutTranslationInputs
	} = store ?? {};

	const preferredLegacyTranslationConfig =
		translations ?? store?.initialTranslationConfig;
	const preferredI18nConfig = i18n ?? store?.initialI18nConfig;

	const normalizedInitialTranslationConfig = resolveTranslationInput(
		preferredLegacyTranslationConfig,
		preferredI18nConfig
	);
	const normalizedI18nConfig = normalizedInitialTranslationConfig
		? normalizeI18nConfig(normalizedInitialTranslationConfig)
		: undefined;
	const normalizedLanguageSet = normalizedI18nConfig
		? Object.keys(normalizedI18nConfig.messages).sort()
		: [];
	const resolvedIab = iab ?? storeWithoutTranslationInputs.iab;
	const resolvedOfflinePolicy =
		offlinePolicy ?? storeWithoutTranslationInputs.offlinePolicy;
	const resolvedStorageConfig =
		storageConfig ?? storeWithoutTranslationInputs.storageConfig;
	const resolvedEnabled = enabled ?? storeWithoutTranslationInputs.enabled;
	// A top-level `nonce` wins over `store.nonce` so the value the provider
	// applies to the theme stylesheet always matches the one scripts receive.
	const resolvedNonce = nonce ?? storeWithoutTranslationInputs.nonce;
	const resolvedBackendURL = backendURL || DEFAULT_BACKEND_URL;
	const explicitSSRData = topLevelSSRData ?? storeSSRData;

	const cacheKey = generateRuntimeCacheKey({
		mode,
		backendURL,
		endpointHandlers:
			'endpointHandlers' in options ? options.endpointHandlers : undefined,
		storageConfig: resolvedStorageConfig,
		defaultLanguage: normalizedI18nConfig?.locale,
		languageSetKey:
			normalizedLanguageSet.length > 0
				? normalizedLanguageSet.join(',')
				: undefined,
		offlinePolicyKey: resolvedOfflinePolicy
			? JSON.stringify(resolvedOfflinePolicy)
			: undefined,
		headersKey: generateHeadersKey(headers),
		enabled: resolvedEnabled,
	});

	let consentManager = managerCache.get(cacheKey);
	if (!consentManager) {
		const normalizedStoreOptions = {
			...storeWithoutTranslationInputs,
			initialTranslationConfig: normalizedInitialTranslationConfig,
			iab: resolvedIab,
			offlinePolicy: resolvedOfflinePolicy,
		};

		if (mode === 'offline') {
			consentManager = dependencies.configureConsentManager({
				mode: 'offline',
				store: normalizedStoreOptions,
				storageConfig: resolvedStorageConfig,
			});
		} else if (mode === 'custom' && 'endpointHandlers' in options) {
			consentManager = dependencies.configureConsentManager({
				mode: 'custom',
				endpointHandlers: options.endpointHandlers,
				store: normalizedStoreOptions,
				storageConfig: resolvedStorageConfig,
			});
		} else {
			consentManager = dependencies.configureConsentManager({
				mode: mode === 'c15t' ? 'c15t' : 'hosted',
				backendURL: backendURL || DEFAULT_BACKEND_URL,
				headers,
				store: normalizedStoreOptions,
				storageConfig: resolvedStorageConfig,
			});
		}

		managerCache.set(cacheKey, consentManager);
	}

	let consentStore = storeCache.get(cacheKey);

	if (!consentStore) {
		const normalizedMode = normalizeRuntimeMode(
			mode as RuntimeMode | undefined
		);
		const userConfig = storeConfig ?? topLevelConfig;
		const autoPrefetchedSSRData =
			normalizedMode === 'hosted' &&
			typeof window !== 'undefined' &&
			!explicitSSRData
				? dependencies.getMatchingPrefetchedInitialData({
						backendURL: resolvedBackendURL,
						overrides: options.overrides,
						credentials: 'include',
					})
				: undefined;
		const resolvedSSRData = explicitSSRData ?? autoPrefetchedSSRData;
		const meta = { ...(userConfig?.meta ?? {}) };
		if (normalizedMode === 'hosted') {
			meta.backendURL = resolvedBackendURL;
			meta.requestCredentials = 'include';
		}

		consentStore = dependencies.createConsentManagerStore(consentManager, {
			config: {
				...(userConfig ?? {}),
				pkg: pkgInfo?.pkg || 'c15t',
				version: pkgInfo?.version || version,
				mode: normalizedMode,
				meta,
			},
			...cleanStoreOptionOverrides,
			...storeWithoutTranslationInputs,
			iab: resolvedIab,
			offlinePolicy: resolvedOfflinePolicy,
			storageConfig: resolvedStorageConfig,
			enabled: resolvedEnabled,
			nonce: resolvedNonce,
			initialTranslationConfig: normalizedInitialTranslationConfig,
			initialConsentCategories: consentCategories,
			ssrData: resolvedSSRData,
			debug,
			__internal:
				normalizedMode === 'hosted'
					? {
							backendURL: resolvedBackendURL,
							requestCredentials: 'include',
						}
					: undefined,
		} as InternalStoreOptions);

		storeCache.set(cacheKey, consentStore);
	} else if (consentStore.getState().nonce !== resolvedNonce) {
		// A nonce is per-request, so a cached store can outlive the one it was
		// created with. Sync it rather than adding the nonce to the cache key:
		// keying on it would allocate a fresh manager and store for every request
		// during SSR, and neither cache evicts. Leaving it stale would let the
		// theme stylesheet and injected scripts carry different nonces.
		consentStore.setState({ nonce: resolvedNonce });
	}

	return {
		consentManager,
		consentStore,
		cacheKey,
	};
}

export function clearConsentRuntimeCache(
	dependencies: Pick<
		ConsentRuntimeDependencies,
		'clearClientRegistry'
	> = defaultConsentRuntimeDependencies
): void {
	managerCache.clear();
	storeCache.clear();
	dependencies.clearClientRegistry();
}
