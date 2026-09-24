/**
 * Types for the consent manager initialization.
 *
 * @packageDocumentation
 */

import type { TranslationConfig } from '@c15t/translations';
import type { StoreApi } from 'zustand/vanilla';
import type { ConsentManagerInterface } from '../../client/client-factory';
import type { IABConfig } from '../../libs/iab-tcf/types';
import type { ConsentStoreState, SSRInitialData } from '../../store/type';
import type { ConsentBannerResponse } from '../../types/compliance';
import type { ConsentVisitTracker } from '../consent-visit';

// Re-export for internal consumers
export type { ConsentBannerResponse };

/**
 * Configuration for initializing the consent manager.
 */
export interface InitConsentManagerConfig {
	/** The consent manager client for API calls */
	manager: ConsentManagerInterface;
	/** Hosted visit tracking; absent for custom and offline clients. */
	visitTracker?: ConsentVisitTracker;

	/** SSR-prefetched data (init + optional GVL) */
	ssrData?: Promise<SSRInitialData | undefined>;

	/** Canonical backend URL for hosted-mode request matching */
	backendURL?: string;

	/** Effective client credentials mode for hosted-mode request matching */
	requestCredentials?: RequestCredentials;

	/** Initial translation configuration to merge with server response */
	initialTranslationConfig?: Partial<TranslationConfig>;

	/** IAB TCF configuration (when provided, IAB manager is lazily created) */
	iabConfig?: IABConfig;

	/** Store state getter */
	get: StoreApi<ConsentStoreState>['getState'];

	/** Store state setter */
	set: StoreApi<ConsentStoreState>['setState'];
}

/**
 * Subset of config for functions that only need store access.
 */
export type StoreAccess = Pick<InitConsentManagerConfig, 'get' | 'set'>;
