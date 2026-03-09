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
	 * Optional policy configuration for offline mode.
	 *
	 * @remarks
	 * Supports either:
	 * - A backend-compatible policy pack (`policies` / `policyPack`) resolved offline
	 * - A fully synthetic resolved policy payload for UI previewing
	 */
	policyConfig?: OfflinePolicyConfig;
}

// Re-export for convenience
export type { IABFallbackConfig };
