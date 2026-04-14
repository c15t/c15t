import type { Script } from 'c15t';
import { resolveManifest } from './resolve';
import { type VendorManifest, vendorManifestContract } from './types';

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
	...vendorManifestContract,
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
				'data-api-url': '{{apiUrl}}',
			},
		},
	],
	onBeforeLoadGranted: [
		{
			type: 'setGlobal',
			name: 'databuddyConfig',
			value: '{{configWhenGranted}}',
			ifUndefined: true,
		},
	],
	onBeforeLoadDenied: [
		{
			type: 'setGlobal',
			name: 'databuddyConfig',
			value: '{{configWhenDenied}}',
			ifUndefined: true,
		},
	],
	onLoadGranted: [
		{
			type: 'setGlobalPath',
			path: ['databuddy', 'options', 'disabled'],
			value: false,
		},
	],
	onLoadDenied: [
		{
			type: 'setGlobalPath',
			path: ['databuddy', 'options', 'disabled'],
			value: true,
		},
	],
	onConsentGranted: [
		{
			type: 'setGlobal',
			name: 'databuddyConfig',
			value: '{{configWhenGranted}}',
			ifUndefined: false,
		},
		{
			type: 'setGlobalPath',
			path: ['databuddy', 'options', 'disabled'],
			value: false,
		},
	],
	onConsentDenied: [
		{
			type: 'setGlobal',
			name: 'databuddyConfig',
			value: '{{configWhenDenied}}',
			ifUndefined: false,
		},
		{
			type: 'setGlobalPath',
			path: ['databuddy', 'options', 'disabled'],
			value: true,
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

	/** Databuddy config object to seed when consent is granted at load time. */
	configWhenGranted: Record<string, unknown>;

	/** Databuddy config object to seed when consent is denied at load time. */
	configWhenDenied: Record<string, unknown>;
}

/**
 * Loads the Databuddy script and manages consent state declaratively via the manifest runtime.
 *
 * The script always loads (`alwaysLoad: true`) but tracking is controlled via the `disabled`
 * flag on Databuddy's global config/runtime objects, allowing the vendor to stay present in
 * the DOM while respecting consent boundaries.
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
 *       configWhenGranted: {
 *         clientId: 'db_1234567890abcdef',
 *         trackScreenViews: true,
 *         trackOutgoingLinks: true,
 *         trackPerformance: true,
 *         samplingRate: 1.0,
 *         disabled: false,
 *       },
 *       configWhenDenied: {
 *         clientId: 'db_1234567890abcdef',
 *         disabled: true,
 *       },
 *     }),
 *   ],
 * });
 * ```
 */
export function databuddy(options: DatabuddyConsentOptions): Script {
	const resolved = resolveManifest(databuddyManifest, {
		clientId: options.clientId,
		apiUrl: options.apiUrl,
		configWhenGranted: options.configWhenGranted,
		configWhenDenied: options.configWhenDenied,
		scriptUrl: options.scriptUrl ?? 'https://cdn.databuddy.cc/databuddy.js',
	});

	return resolved;
}
