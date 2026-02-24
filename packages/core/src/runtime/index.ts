import {
	type I18nConfig,
	normalizeI18nConfig,
	type TranslationInputConfig,
	toTranslationConfig,
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
	enabled?: boolean;
}): string {
	const enabledKey = options.enabled === false ? 'disabled' : 'enabled';

	return `${options.mode ?? 'c15t'}:${options.backendURL ?? 'default'}:${options.endpointHandlers ? 'custom' : 'none'}:${options.storageConfig?.storageKey ?? 'default'}:${options.defaultLanguage ?? 'default'}:${options.languageSetKey ?? 'default'}:${enabledKey}`;
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
		consentCategories,
		debug,
		headers: _unusedHeaders,
		customFetch: _unusedCustomFetch,
		retryConfig: _unusedRetryConfig,
		endpointHandlers: _unusedEndpointHandlers,
		...storeOptionOverrides
	} = optionBag;

	const {
		initialI18nConfig: _unusedStoreInitialI18nConfig,
		initialTranslationConfig: _unusedStoreInitialTranslationConfig,
		...storeWithoutTranslationInputs
	} = store ?? {};

	const preferredLegacyTranslationConfig =
		translations ?? store?.initialTranslationConfig;
	const preferredI18nConfig = i18n ?? store?.initialI18nConfig;

	const translationInput: TranslationInputConfig | undefined =
		preferredLegacyTranslationConfig || preferredI18nConfig
			? {
					...(preferredLegacyTranslationConfig ?? {}),
					...(preferredI18nConfig ? { i18n: preferredI18nConfig } : {}),
				}
			: undefined;

	const normalizedI18nConfig = translationInput
		? normalizeI18nConfig(translationInput)
		: undefined;
	const normalizedInitialTranslationConfig = normalizedI18nConfig
		? toTranslationConfig({
				messages: normalizedI18nConfig.messages,
				locale: normalizedI18nConfig.locale,
				detectBrowserLanguage: normalizedI18nConfig.detectBrowserLanguage,
			})
		: undefined;
	const normalizedLanguageSet = normalizedI18nConfig
		? Object.keys(normalizedI18nConfig.messages).sort()
		: [];
	const resolvedIab = iab ?? storeWithoutTranslationInputs.iab;
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
		enabled: resolvedEnabled,
	});

	let consentManager = managerCache.get(cacheKey);
	if (!consentManager) {
		const normalizedStoreOptions = {
			...storeWithoutTranslationInputs,
			initialTranslationConfig: normalizedInitialTranslationConfig,
			iab: resolvedIab,
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
				mode: 'c15t',
				backendURL: backendURL || DEFAULT_BACKEND_URL,
				store: normalizedStoreOptions,
				storageConfig: resolvedStorageConfig,
			});
		}

		managerCache.set(cacheKey, consentManager);
	}

	let consentStore = storeCache.get(cacheKey);

	if (!consentStore) {
		consentStore = createConsentManagerStore(consentManager, {
			config: {
				pkg: pkgInfo?.pkg || 'c15t',
				version: pkgInfo?.version || version,
				mode: mode || 'Unknown',
			},
			...storeOptionOverrides,
			...storeWithoutTranslationInputs,
			iab: resolvedIab,
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
