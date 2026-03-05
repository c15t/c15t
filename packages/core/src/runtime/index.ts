import {
	type I18nConfig,
	normalizeI18nConfig,
	resolveTranslationInput,
} from '@c15t/translations';
import { version } from '~/version';
import {
	type ConsentManagerOptions,
	clearClientRegistry,
	configureConsentManager,
} from '../client';
import { createConsentManagerStore } from '../store';
import type { StoreOptions } from '../store/type';
import type { AllConsentNames, TranslationConfig } from '../types';

type ConsentManagerInstance = ReturnType<typeof configureConsentManager>;
type ConsentStoreInstance = ReturnType<typeof createConsentManagerStore>;

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
		enabledKey,
	];

	return cacheParts.join(':');
}

export function getOrCreateConsentRuntime(
	options: ConsentRuntimeOptions,
	pkgInfo?: ConsentRuntimePkgInfo
): ConsentRuntimeResult {
	const optionBag = options as ConsentRuntimeOptions & {
		headers?: Record<string, string>;
		customFetch?: typeof fetch;
		retryConfig?: unknown;
		endpointHandlers?: unknown;
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
		headers: _unusedHeaders,
		customFetch: _unusedCustomFetch,
		retryConfig: _unusedRetryConfig,
		endpointHandlers: _unusedEndpointHandlers,
		...storeOptionOverrides
	} = optionBag;

	const {
		initialI18nConfig: _unusedTopLevelInitialI18nConfig,
		initialTranslationConfig: _unusedTopLevelInitialTranslationConfig,
		...cleanStoreOptionOverrides
	} = storeOptionOverrides as Partial<StoreOptions>;

	const {
		initialI18nConfig: _unusedStoreInitialI18nConfig,
		initialTranslationConfig: _unusedStoreInitialTranslationConfig,
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
			consentManager = configureConsentManager({
				mode: 'offline',
				store: normalizedStoreOptions,
				storageConfig: resolvedStorageConfig,
			});
		} else if (mode === 'custom' && 'endpointHandlers' in options) {
			consentManager = configureConsentManager({
				mode: 'custom',
				endpointHandlers: options.endpointHandlers,
				store: normalizedStoreOptions,
				storageConfig: resolvedStorageConfig,
			});
		} else {
			consentManager = configureConsentManager({
				mode: mode === 'c15t' ? 'c15t' : 'hosted',
				backendURL: backendURL || DEFAULT_BACKEND_URL,
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

		consentStore = createConsentManagerStore(consentManager, {
			config: {
				pkg: pkgInfo?.pkg || 'c15t',
				version: pkgInfo?.version || version,
				mode: normalizedMode,
			},
			...cleanStoreOptionOverrides,
			...storeWithoutTranslationInputs,
			iab: resolvedIab,
			offlinePolicy: resolvedOfflinePolicy,
			storageConfig: resolvedStorageConfig,
			enabled: resolvedEnabled,
			initialTranslationConfig: normalizedInitialTranslationConfig,
			initialConsentCategories: consentCategories,
			debug,
		});

		storeCache.set(cacheKey, consentStore);
	}

	return {
		consentManager,
		consentStore,
		cacheKey,
	};
}

export function clearConsentRuntimeCache(): void {
	managerCache.clear();
	storeCache.clear();
	clearClientRegistry();
}
