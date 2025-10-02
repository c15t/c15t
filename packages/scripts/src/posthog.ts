import type { Script } from 'c15t';
import posthog from 'posthog-js';

export interface PosthogConsentOptions {
	/**
	 * Override or extend the default script values.
	 *
	 * Default values:
	 * - `id`: 'posthog-consent'
	 * - `category`: 'measurement'
	 */
	script?: Pick<Partial<Script>, 'id' | 'category'>;
}

/**
 * Opt in/out to capturing with Posthog
 * This uses posthog.opt_in_capturing() to opt in to capturing. And posthog.opt_out_capturing() to opt out of capturing.
 * @see https://posthog.com/docs/libraries/js#opt-in-capturing
 *
 * @param options - Optional configuration for the PostHog consent script
 * @returns The Posthog script
 */
export function posthogConsent(options: PosthogConsentOptions = {}): Script {
	const { script } = options;
	return {
		id: script?.id ?? 'posthog-consent',
		category: script?.category ?? 'measurement',
		callbackOnly: true, // No need to add a script tag, just run callbacks
		onBeforeLoad: () => {
			if (typeof posthog?.opt_in_capturing === 'function') {
				try {
					posthog.opt_in_capturing();
				} catch (error) {
					console.error('PostHog opt_in_capturing failed:', error);
				}
			}
		},
		onDelete: () => {
			if (typeof posthog?.opt_out_capturing === 'function') {
				try {
					posthog.opt_out_capturing();
				} catch (error) {
					console.error('PostHog opt_out_capturing failed:', error);
				}
			}
		},
	};
}
