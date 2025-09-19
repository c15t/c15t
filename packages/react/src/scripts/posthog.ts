import {
	posthogConsent as corePosthogConsent,
	type PosthogConsentOptions,
} from 'c15t/scripts/posthog';

import type { ScriptConfig } from '../components/script-loader/script-loader';

export type { PosthogConsentOptions };

/**
 * Creates a Google Tag Manager script.
 *
 * @param options - The options for the Google Tag Manager script.
 * @returns The Google Tag Manager script.
 */
export function posthogConsent({
	script,
}: PosthogConsentOptions = {}): ScriptConfig {
	return {
		...corePosthogConsent({ script }),
		type: 'script',
	};
}
