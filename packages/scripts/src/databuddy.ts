import type { Script } from 'c15t';
import { applyScriptOverrides, resolveManifest } from './resolve';
import type { VendorManifest } from './types';

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

/**
 * DataBuddy vendor manifest.
 *
 * DataBuddy always loads but controls tracking via its `options.disabled` flag.
 * Config is seeded via `window.databuddyConfig` before the script loads.
 */
export const databuddyManifest = {
	vendor: 'databuddy',
	category: 'measurement',
	alwaysLoad: true,
	install: [
		{
			type: 'loadScript',
			src: '{{scriptUrl}}',
			async: true,
			attributes: {
				crossorigin: 'anonymous',
				'data-client-id': '{{clientId}}',
			},
		},
	],
	onConsentGranted: [
		{
			type: 'inlineScript',
			code: 'if (window.databuddy && window.databuddy.options.disabled) { window.databuddy.options.disabled = false; }',
		},
	],
	onConsentDenied: [
		{
			type: 'inlineScript',
			code: 'if (window.databuddy && !window.databuddy.options.disabled) { window.databuddy.options.disabled = true; }',
		},
	],
} as const satisfies VendorManifest;

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
	 * @default 'https://cdn.databuddy.cc/databuddy.js'
	 */
	scriptUrl?: string;

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
 *    `window.databuddy.options.disabled` matches the current consent state.
 *
 * 3. **On Consent Change** (`onConsentChange`): Dynamically toggles `window.databuddy.options.disabled`
 *    to enable tracking when consent is granted or disable tracking when consent is revoked.
 *
 * The script always loads (`alwaysLoad: true`) but tracking is controlled via the `disabled` flag,
 * allowing Databuddy to remain present in the DOM while respecting consent boundaries.
 *
 * @param options - Configuration for the Databuddy consent script
 * @returns The Databuddy script configuration object for c15t's script loader
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
	const scriptUrl =
		options.scriptUrl ?? 'https://cdn.databuddy.cc/databuddy.js';

	const resolved = resolveManifest(databuddyManifest, {
		clientId: options.clientId,
		scriptUrl,
	});

	// Add data-api-url attribute if provided
	if (options.apiUrl && resolved.attributes) {
		resolved.attributes['data-api-url'] = options.apiUrl;
	}

	// DataBuddy needs to seed window.databuddyConfig before the script loads
	// and sync the disabled state on load — this requires imperative callbacks
	resolved.onBeforeLoad = (info) => {
		if (!window.databuddyConfig) {
			window.databuddyConfig = {
				clientId: options.clientId,
				...(options.apiUrl ? { apiUrl: options.apiUrl } : {}),
				...(options.options || {}),
				disabled: !info.hasConsent,
			};
		}
	};

	resolved.onLoad = (info) => {
		if (window.databuddy) {
			if (info.hasConsent && window.databuddy.options.disabled) {
				window.databuddy.options.disabled = false;
			} else if (!info.hasConsent && !window.databuddy.options.disabled) {
				window.databuddy.options.disabled = true;
			}
		}
	};

	return options.script
		? applyScriptOverrides(resolved, options.script)
		: resolved;
}
