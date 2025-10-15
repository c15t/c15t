import type { ConsentState } from '../../types';

/**
 * Configuration for iframe blocking behavior
 */
export interface IframeBlockerConfig {
	/** Whether to disable automatic iframe blocking (defaults to false) */
	disableAutomaticBlocking?: boolean;
}

/**
 * Interface for the iframe blocker instance
 */
export interface IframeBlocker {
	/**
	 * Updates the consents and processes iframes accordingly
	 */
	updateConsents: (newConsents: Partial<ConsentState>) => void;

	/**
	 * Processes all iframes on the page based on current consent state
	 */
	processIframes: () => void;

	/**
	 * Destroys the iframe blocker and restores original behavior
	 */
	destroy: () => void;
}
