import { type I18nConfig } from '@c15t/translations';
import { type ConsentManagerOptions, configureConsentManager } from '../client';
import { createConsentManagerStore } from '../store';
import type { StoreOptions } from '../store/type';
import type { AllConsentNames, TranslationConfig } from '../types';
type ConsentManagerInstance = ReturnType<typeof configureConsentManager>;
type ConsentStoreInstance = ReturnType<typeof createConsentManagerStore>;
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
export declare function getOrCreateConsentRuntime(
	options: ConsentRuntimeOptions,
	pkgInfo?: ConsentRuntimePkgInfo
): ConsentRuntimeResult;
export declare function clearConsentRuntimeCache(): void;
export {};
