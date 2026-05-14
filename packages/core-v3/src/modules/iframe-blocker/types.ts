/**
 * Shared types for the iframe-blocker module.
 */
import type { ConsentKernel } from '../../types';

export interface IframeBlockerOptions {
	kernel: ConsentKernel;
	/**
	 * Skip the initial DOM scan + observer install. Useful when a
	 * consumer wants to drive reconciliation manually via
	 * `processAllIframes()`. Defaults to false.
	 */
	disableAutomaticBlocking?: boolean;
}

export interface IframeBlockerHandle {
	dispose(): void;
	/** Re-scan every iframe in the document and reapply the src toggle. */
	processAllIframes(): void;
}
