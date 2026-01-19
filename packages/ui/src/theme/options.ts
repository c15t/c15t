import type {
	AllConsentNames,
	ConsentManagerOptions as CoreOptions,
	StoreOptions,
	TranslationConfig,
} from 'c15t';
import type { UIOptions } from '../theme/types';

/**
 * Store-related options that are common across UI implementations.
 */
export type CommonInlineStoreOptions = Pick<
	StoreOptions,
	| 'enabled'
	| 'callbacks'
	| 'scripts'
	| 'legalLinks'
	| 'storageConfig'
	| 'user'
	| 'overrides'
	| 'networkBlocker'
>;

/**
 * Base configuration options for framework-agnostic consent managers.
 */
export type BaseConsentManagerOptions = CoreOptions &
	CommonInlineStoreOptions &
	UIOptions & {
		/**
		 * Translation configuration to seed the store with.
		 */
		translations?: Partial<TranslationConfig>;

		/**
		 * Consent categories to show in the consent banner.
		 */
		consentCategories?: AllConsentNames[];
	};
