import type { OfflinePolicyConfig } from '../../store/type';
import type { IABFallbackConfig } from '../hosted/types';

/**
 * Configuration options for the Offline client.
 */
export interface OfflineClientOptions {
	/**
	 * IAB configuration for offline mode.
	 * When IAB is enabled, the client will fetch GVL from gvl.inth.app.
	 */
	iabConfig?: IABFallbackConfig;

	/**
	 * Optional policy configuration for offline mode.
	 *
	 * @remarks
	 * Supports either:
	 * - A backend-compatible policy pack (`policyPacks`) resolved offline
	 * - A fully synthetic resolved policy payload for UI previewing
	 */
	policyConfig?: OfflinePolicyConfig;
}

// Re-export for convenience
export type { IABFallbackConfig };
