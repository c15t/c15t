import type { Script } from 'c15t';

declare global {
	interface Window {
		databuddy?: {
			track: (eventName: string, properties?: Record<string, unknown>) => void;
			screenView: (
				screenName?: string,
				properties?: Record<string, unknown>
			) => void;
			clear: () => void;
			flush: () => void;
			setGlobalProperties: (properties: Record<string, unknown>) => void;
			trackCustomEvent: (
				eventName: string,
				properties?: Record<string, unknown>
			) => void;
			options: {
				disabled: boolean;
				[key: string]: unknown;
			};
		};
		databuddyConfig?: {
			clientId?: string;
			apiUrl?: string;
			[key: string]: unknown;
		};
	}
}

export interface DatabuddyConsentOptions {
	/**
	 * Your Databuddy client ID.
	 */
	clientId: string;

	/**
	 * Your Databuddy API URL.
	 * @default 'https://basket.databuddy.cc'
	 */
	apiUrl?: string;

	/**
	 * The Databuddy script URL.
	 */
	scriptUrl: string;

	/**
	 * Additional configuration options for Databuddy.
	 * @example { trackScreenViews: true, trackOutgoingLinks: true }
	 */
	options?: Record<string, unknown>;

	/**
	 * Override or extend the default script values.
	 *
	 * Default values:
	 * - `id`: 'databuddy'
	 * - `category`: 'measurement'
	 */
	script?: Partial<Script>;
}

/**
 * Loads the Databuddy script and manages consent state through a comprehensive lifecycle.
 *
 * This function orchestrates consent-aware analytics by coordinating between c15t's consent
 * state and Databuddy's tracking behavior. The consent management lifecycle works as follows:
 *
 * 1. **Before Script Load** (`onBeforeLoad`): Seeds `window.databuddyConfig` with the client
 *    configuration, including setting `disabled: !hasConsent` to ensure Databuddy initializes
 *    in the correct state. The Databuddy script reads this configuration object on initialization.
 *
 * 2. **On Script Load** (`onLoad`): After Databuddy has initialized, verifies that
 *    `window.databuddy.options.disabled` matches the current consent state by calling
 *    `handleConsentOpt()`.
 *
 * 3. **On Consent Change** (`onConsentChange`): Dynamically toggles `window.databuddy.options.disabled`
 *    to enable tracking when consent is granted or disable tracking when consent is revoked.
 *    This ensures real-time compliance with user preferences.
 *
 * The script always loads (`alwaysLoad: true`) but tracking is controlled via the `disabled` flag,
 * allowing Databuddy to remain present in the DOM while respecting consent boundaries.
 *
 * @param options - Configuration for the Databuddy consent script
 * @returns The Databuddy script configuration object for c15t's script loader
 *
 * @throws This function does not throw errors directly. However, network failures or script
 * loading errors may cause the Databuddy script to fail silently without initializing
 * `window.databuddy`. The lifecycle callbacks handle these cases gracefully by checking for
 * the presence of `window.databuddy` before attempting to modify its state.
 *
 * @example
 * ```ts
 * import { configureConsentManager } from 'c15t';
 * import { databuddy } from '@c15t/scripts/databuddy';
 *
 * configureConsentManager({
 *   scripts: [
 *     databuddy({
 *       clientId: 'db_1234567890abcdef',
 *       scriptUrl: 'https://cdn.databuddy.cc/databuddy.js',
 *       // apiUrl: 'https://basket.databuddy.cc', // Optional, defaults to basket.databuddy.cc
 *       options: {
 *         trackScreenViews: true,
 *         trackOutgoingLinks: true,
 *         trackPerformance: true,
 *         samplingRate: 1.0,
 *       },
 *     }),
 *   ],
 * });
 * ```
 */
export function databuddy(options: DatabuddyConsentOptions): Script {
	const { script } = options;

	const handleConsentOpt = (hasConsent: boolean) => {
		if (!window.databuddy) {
			return;
		}

		// Update the disabled state based on consent
		if (hasConsent && window.databuddy.options.disabled) {
			window.databuddy.options.disabled = false;
		} else if (!hasConsent && !window.databuddy.options.disabled) {
			window.databuddy.options.disabled = true;
		}
	};

	return {
		id: script?.id ?? 'databuddy',
		category: script?.category ?? 'measurement',
		src: options.scriptUrl,
		async: true,
		attributes: {
			crossorigin: 'anonymous',
			'data-client-id': options.clientId,
			...(options.apiUrl ? { 'data-api-url': options.apiUrl } : {}),
		},
		alwaysLoad: true,
		onBeforeLoad: ({ hasConsent, ...rest }) => {
			// Initialize Databuddy config before the script loads
			// The script reads from window.databuddyConfig and data attributes
			if (!window.databuddyConfig) {
				window.databuddyConfig = {
					clientId: options.clientId,
					...(options.apiUrl ? { apiUrl: options.apiUrl } : {}),
					...(options.options || {}),
					// Set initial disabled state based on consent (overrides user options)
					disabled: !hasConsent,
				};
			}

			script?.onBeforeLoad?.({ hasConsent, ...rest });
		},
		onLoad: ({ hasConsent, ...rest }) => {
			// Databuddy should be initialized automatically via the script
			// Handle consent state once the script is loaded
			if (window.databuddy) {
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
