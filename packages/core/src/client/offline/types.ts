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
}

// Re-export for convenience
export type { IABFallbackConfig };
