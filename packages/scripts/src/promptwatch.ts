import type { Script } from 'c15t';

declare global {
	interface Window {
		promptwatch?: {
			track: (
				action: string,
				payload?: Record<string, unknown>
			) => Promise<boolean>;
			pageView: () => void;
			disable: () => void;
			enable: () => void;
			flush: () => Promise<boolean>;
			q?: Array<{ method: string; args: unknown[] }>;
		};
	}
}

export interface PromptwatchConsentOptions {
	/**
	 * Your Promptwatch project ID.
	 */
	projectId: string;

	/**
	 * Your Promptwatch ingest endpoint.
	 * @default 'https://ingest.promptwatch.com'
	 */
	endpoint?: string;

	/**
	 * The Promptwatch script URL.
	 * @default 'https://ingest.promptwatch.com/js/client.min.js'
	 */
	scriptUrl?: string;

	/**
	 * Enable debug mode to log analytics events to console.
	 * @default false
	 */
	debug?: boolean;

	/**
	 * Disable automatic page view tracking.
	 * @default false
	 */
	disableAutoPageview?: boolean;

	/**
	 * Enable click tracking on links and buttons.
	 * @default false
	 */
	trackClicks?: boolean;

	/**
	 * Override or extend the default script values.
	 *
	 * Default values:
	 * - `id`: 'promptwatch'
	 * - `category`: 'measurement'
	 */
	script?: Partial<Script>;
}

/**
 * Loads the Promptwatch analytics script and manages consent state through a comprehensive lifecycle.
 *
 * This function orchestrates consent-aware analytics by coordinating between c15t's consent
 * state and Promptwatch's tracking behavior. The consent management lifecycle works as follows:
 *
 * 1. **Before Script Load** (`onBeforeLoad`): Sets up the initial configuration state
 *    before the Promptwatch script loads.
 *
 * 2. **On Script Load** (`onLoad`): After Promptwatch has initialized, verifies that
 *    tracking is enabled/disabled based on the current consent state.
 *
 * 3. **On Consent Change** (`onConsentChange`): Dynamically enables or disables tracking
 *    using `window.promptwatch.enable()` and `window.promptwatch.disable()` to ensure
 *    real-time compliance with user preferences.
 *
 * The script always loads (`alwaysLoad: true`) but tracking is controlled via the enable/disable
 * methods, allowing Promptwatch to remain present in the DOM while respecting consent boundaries.
 *
 * @param options - Configuration for the Promptwatch consent script
 * @returns The Promptwatch script configuration object for c15t's script loader
 *
 * @example
 * ```ts
 * import { configureConsentManager } from 'c15t';
 * import { promptwatch } from '@c15t/scripts/promptwatch';
 *
 * configureConsentManager({
 *   scripts: [
 *     promptwatch({
 *       projectId: '1dee68c1-9213-4e17-a4bc-afcc38c8862c',
 *       // endpoint: 'https://ingest.promptwatch.com', // Optional
 *       // debug: false, // Optional
 *       // disableAutoPageview: false, // Optional
 *       // trackClicks: false, // Optional
 *     }),
 *   ],
 * });
 * ```
 */
export function promptwatch(options: PromptwatchConsentOptions): Script {
	const { script } = options;

	const handleConsentOpt = (hasConsent: boolean) => {
		if (!window.promptwatch) {
			return;
		}

		if (hasConsent) {
			window.promptwatch.enable();
		} else {
			window.promptwatch.disable();
		}
	};

	return {
		id: script?.id ?? 'promptwatch',
		category: script?.category ?? 'measurement',
		src: options.scriptUrl ?? 'https://ingest.promptwatch.com/js/client.min.js',
		async: true,
		attributes: {
			crossorigin: 'anonymous',
			'data-project-id': options.projectId,
			...(options.endpoint ? { 'data-endpoint': options.endpoint } : {}),
			...(options.debug ? { 'data-debug': 'true' } : {}),
			...(options.disableAutoPageview
				? { 'data-disable-auto-pageview': 'true' }
				: {}),
			...(options.trackClicks ? { 'data-track-clicks': 'true' } : {}),
		},
		alwaysLoad: true,
		onBeforeLoad: (rest) => {
			// Initialize a minimal promptwatch stub before the script loads
			// This allows queuing commands before the script is ready
			if (!window.promptwatch) {
				window.promptwatch = {
					track: async () => false,
					pageView: () => {},
					disable: () => {},
					enable: () => {},
					flush: async () => false,
					q: [],
				};
			}

			script?.onBeforeLoad?.(rest);
		},
		onLoad: ({ hasConsent, ...rest }) => {
			// Handle consent state once the script is loaded
			if (window.promptwatch) {
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
