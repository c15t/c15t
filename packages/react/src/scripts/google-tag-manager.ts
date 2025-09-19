import {
	googleTagManager as coreGoogleTagManager,
	type GoogleTagManagerOptions,
	mapConsentStateToGTM,
} from 'c15t/scripts/google-tag-manager';

import type { ScriptConfig } from '../components/script-loader/script-loader';

export { mapConsentStateToGTM, type GoogleTagManagerOptions };

/**
 * Creates a Google Tag Manager script.
 *
 * @param options - The options for the Google Tag Manager script.
 * @returns The Google Tag Manager script.
 */
export function googleTagManager(
	options: GoogleTagManagerOptions
): ScriptConfig {
	return {
		...coreGoogleTagManager(options),
		type: 'script',
	};
}
