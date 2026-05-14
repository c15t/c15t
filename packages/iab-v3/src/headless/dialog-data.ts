/**
 * Framework-agnostic IAB dialog data processing.
 *
 * Processes GVL data into UI-ready structures for the consent dialog.
 * This is the complex GVL processing logic that would otherwise be
 * duplicated across React, Svelte, Vue, Solid, and Astro.
 *
 * @packageDocumentation
 */

import type { IABManager } from 'c15t';

/**
 * Processed GVL data ready for rendering in a consent dialog.
 *
 * TODO: Move the full GVL processing logic from the React IABConsentDialog
 * component's useMemo into this function. Currently a placeholder.
 */
export interface ProcessedGVLData {
	/** Whether data is ready */
	isReady: boolean;
}

/**
 * Processes GVL data into a format suitable for the consent dialog UI.
 *
 * @param iab - The IAB manager instance
 * @returns Processed GVL data for rendering
 */
export function processGVLForDialog(iab: IABManager | null): ProcessedGVLData {
	if (!iab?.gvl) {
		return { isReady: false };
	}

	return { isReady: true };
}
