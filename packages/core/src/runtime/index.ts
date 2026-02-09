import { version } from '~/version';
import { type ConsentManagerOptions, configureConsentManager } from '../client';
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
		translations?: Partial<TranslationConfig>;
		consentCategories?: AllConsentNames[];
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
	enabled?: boolean;
}): string {
	const enabledKey = options.enabled === false ? 'disabled' : 'enabled';

	return `${options.mode ?? 'c15t'}:${options.backendURL ?? 'default'}:${options.endpointHandlers ? 'custom' : 'none'}:${options.storageConfig?.storageKey ?? 'default'}:${options.defaultLanguage ?? 'default'}:${enabledKey}`;
}

export function getOrCreateConsentRuntime(
	options: ConsentRuntimeOptions,
	pkgInfo?: ConsentRuntimePkgInfo
): ConsentRuntimeResult {
	const { mode, backendURL, store, translations, storageConfig, enabled, iab } =
		options;

	const cacheKey = generateRuntimeCacheKey({
		mode,
		backendURL,
		endpointHandlers:
			'endpointHandlers' in options ? options.endpointHandlers : undefined,
		storageConfig,
		defaultLanguage: translations?.defaultLanguage,
		enabled,
	});

	let consentManager = managerCache.get(cacheKey);
	if (!consentManager) {
		const normalizedStoreOptions = {
			...store,
			initialTranslationConfig: translations,
			iab,
		};

		if (mode === 'offline') {
			consentManager = configureConsentManager({
				mode: 'offline',
				store: normalizedStoreOptions,
				storageConfig,
			});
		} else if (mode === 'custom' && 'endpointHandlers' in options) {
			consentManager = configureConsentManager({
				mode: 'custom',
				endpointHandlers: options.endpointHandlers,
				store: normalizedStoreOptions,
				storageConfig,
			});
		} else {
			consentManager = configureConsentManager({
				mode: 'c15t',
				backendURL: backendURL || DEFAULT_BACKEND_URL,
				store: normalizedStoreOptions,
				storageConfig,
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
			...options,
			...store,
			initialTranslationConfig: translations,
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
}
