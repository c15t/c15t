import type { OfflinePolicyConfig } from '../../store/type';
import type { IABFallbackConfig } from '../hosted/types';

/**
 * Configuration options for the Offline client.
 */
export interface OfflineClientOptions {
	/**
	 * IAB configuration for offline mode.
	 * When IAB is enabled, the client will fetch GVL from gvl.consent.io.
	 */
	iabConfig?: IABFallbackConfig;

	/**
	 * Optional synthetic runtime policy payload for offline mode.
	 *
	 * @remarks
	 * This allows policy-driven UI previews without a backend `/init` call.
	 */
	policyConfig?: OfflinePolicyConfig;
}

// Re-export for convenience
export type { IABFallbackConfig };
