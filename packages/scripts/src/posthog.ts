import type { Script } from 'c15t';

declare global {
	interface Window {
		posthog: {
			init: (
				token: string,
				options: {
					api_host: string;
					ui_host?: string;
					autocapture?: boolean;
					[key: string]: unknown;
				}
			) => void;
			opt_in_capturing: () => void;
			opt_out_capturing: () => void;
			get_explicit_consent_status: () => string;
		};
	}
}

export interface PosthogConsentOptions {
	/**
	 * Your posthog id, begins with 'phc_'.
	 */
	id: string;

	/**
	 * Your posthog api host.
	 * @default 'https://eu.i.posthog.com'
	 */
	apiHost: string;

	/**
	 * The defaults for the posthog script.
	 */
	defaults: string;

	/**
	 * Other optional options for the posthog script.
	 * @example { person_profiles: 'identified_only' }
	 */
	options: Record<string, unknown>;

	/**
	 * Override or extend the default script values.
	 *
	 * Default values:
	 * - `id`: 'posthog-consent'
	 * - `category`: 'measurement'
	 */
	script?: Partial<Script>;
}

/**
 * Loads the PostHog script and initializes it with the given options.
 * This uses posthog.opt_in_capturing() to opt in to capturing. And posthog.opt_out_capturing() to opt out of capturing.
 * @see https://posthog.com/docs/libraries/js#opt-in-capturing
 *
 * @param options - Optional configuration for the PostHog consent script
 * @returns The Posthog script
 */
export function posthog(options: PosthogConsentOptions): Script {
	const { script } = options;

	const handleConsentOpt = (hasConsent: boolean) => {
		// Comparing the consent status prevent's us from already opting in/out if the consent status is already set
		const posthogConsent = window.posthog.get_explicit_consent_status();

		if (hasConsent && posthogConsent !== 'granted') {
			window.posthog.opt_in_capturing();
		} else if (!hasConsent && posthogConsent !== 'denied') {
			window.posthog.opt_out_capturing();
		}
	};

	// Build the PostHog script URL with configuration
	const apiHost = options.apiHost.replace(
		'.i.posthog.com',
		'-assets.i.posthog.com'
	);
	const scriptUrl = `${apiHost}/static/array.js`;

	return {
		id: script?.id ?? 'posthog',
		category: script?.category ?? 'measurement',
		src: scriptUrl,
		async: true,
		attributes: {
			crossorigin: 'anonymous',
			'data-api-host': options.apiHost,
			'data-ui-host': options.apiHost,
		},
		alwaysLoad: true,
		onBeforeLoad: (rest) => {
			// Initialize PostHog before the script loads
			if (!window.posthog) {
				window.posthog = {
					init: () => {},
					opt_in_capturing: () => {},
					opt_out_capturing: () => {},
					get_explicit_consent_status: () => 'pending',
				} as typeof window.posthog;
			}

			script?.onBeforeLoad?.(rest);
		},
		onLoad: ({ hasConsent, ...rest }) => {
			// Initialize PostHog with options now that the script is loaded
			if (window.posthog && typeof window.posthog.init === 'function') {
				window.posthog.init(options.id, {
					api_host: options.apiHost,
					ui_host: options.apiHost,
					autocapture: false,
					...(options.options || {}),
				});

				handleConsentOpt(hasConsent);
			}

			script?.onLoad?.({ hasConsent, ...rest });
		},
		onConsentChange: ({ hasConsent, ...rest }) => {
			handleConsentOpt(hasConsent);

			script?.onConsentChange?.({ hasConsent, ...rest });
		},
	};
}
