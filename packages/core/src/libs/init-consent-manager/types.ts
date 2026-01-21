/**
 * Types for the consent manager initialization.
 *
 * @packageDocumentation
 */

import type { InitOutput } from '@c15t/schema/types';
import type { TranslationConfig } from '@c15t/translations';
import type { StoreApi } from 'zustand/vanilla';
import type { ConsentManagerInterface } from '../../client/client-factory';
import type { ConsentStoreState, SSRInitialData } from '../../store/type';

/**
 * Consent banner response type alias.
 */
export type ConsentBannerResponse = InitOutput;

/**
 * Configuration for initializing the consent manager.
 */
export interface InitConsentManagerConfig {
	/** The consent manager client for API calls */
	manager: ConsentManagerInterface;

	/** SSR-prefetched data (init + optional GVL) */
	initialData?: Promise<SSRInitialData | undefined>;

	/** Initial translation configuration to merge with server response */
	initialTranslationConfig?: Partial<TranslationConfig>;

	/** Store state getter */
	get: StoreApi<ConsentStoreState>['getState'];

	/** Store state setter */
	set: StoreApi<ConsentStoreState>['setState'];
}

/**
 * Subset of config for functions that only need store access.
 */
export type StoreAccess = Pick<InitConsentManagerConfig, 'get' | 'set'>;
