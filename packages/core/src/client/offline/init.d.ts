import { type TranslationConfig } from '@c15t/translations';
import type { OfflinePolicyConfig } from '../../store/type';
import type { InitResponse } from '../client-interface';
import type { FetchOptions, ResponseContext } from '../types';
import type { IABFallbackConfig } from './types';
/**
 * Checks if a consent banner should be shown.
 * In offline mode, will always return true unless localStorage or cookie has a value.
 */
export declare function init(
	initialTranslationConfig?: Partial<TranslationConfig>,
	options?: FetchOptions<InitResponse>,
	iabConfig?: IABFallbackConfig,
	policyConfig?: OfflinePolicyConfig
): Promise<ResponseContext<InitResponse>>;
