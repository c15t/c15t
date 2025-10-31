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
 * Loads the Databuddy script and initializes it with the given options.
 * This manages consent by enabling/disabling tracking via the `options.disabled` property.
 *
 * @param options - Configuration for the Databuddy consent script
 * @returns The Databuddy script
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
