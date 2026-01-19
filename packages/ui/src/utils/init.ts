import { configureConsentManager, createConsentManagerStore } from 'c15t';
import type { BaseConsentManagerOptions } from '../theme/options';
import { generateCacheKey, ManagerRegistry } from './manager';

// Persistence across framework lifecycles
// Using ReturnType to avoid explicit dependency on Zustand's StoreApi in this file
const storeCache = new ManagerRegistry<
	ReturnType<typeof createConsentManagerStore>
>();
const managerCache = new ManagerRegistry<
	ReturnType<typeof configureConsentManager>
>();

/**
 * Result of the consent manager initialization.
 */
export interface InitResult {
	consentManager: ReturnType<typeof configureConsentManager>;
	consentStore: ReturnType<typeof createConsentManagerStore>;
	cacheKey: string;
}

/**
 * Initializes or retrieves the consent manager and store.
 * Framework-agnostic.
 */
export function initConsentManager(
	options: BaseConsentManagerOptions,
	pkgInfo: { pkg: string; version: string }
): InitResult {
	const { mode, backendURL, store, translations, storageConfig, enabled } =
		options;

	const cacheKey = generateCacheKey({
		mode: mode || 'c15t',
		backendURL: backendURL || '/api/c15t',
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
				backendURL: backendURL || '/api/c15t',
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
				pkg: pkgInfo.pkg,
				version: pkgInfo.version,
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

/**
 * Clears the consent manager caches.
 */
export function clearConsentManagerCache() {
	storeCache.clear();
	managerCache.clear();
}
