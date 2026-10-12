import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import { resolveScriptUrl } from '../_shared/script-url';

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
	alwaysLoad: true,
	category: 'measurement',
	install: [
		{
			async: true,
			attributes: {
				crossorigin: 'anonymous',
				'data-api-url': '{{apiUrl}}',

				'data-client-id': '{{clientId}}',
			},

			src: '{{scriptUrl}}',
			type: 'loadScript',
		},
	],
	onBeforeLoadDenied: [
		{
			ifUndefined: true,

			name: 'databuddyConfig',
			type: 'setGlobal',
			value: '{{configWhenDenied}}',
		},
	],
	onBeforeLoadGranted: [
		{
			ifUndefined: true,

			name: 'databuddyConfig',
			type: 'setGlobal',
			value: '{{configWhenGranted}}',
		},
	],
	onConsentDenied: [
		{
			ifUndefined: false,

			name: 'databuddyConfig',
			type: 'setGlobal',
			value: '{{configWhenDenied}}',
		},
		{
			path: ['databuddy', 'options', 'disabled'],
			type: 'setGlobalPath',
			value: true,
		},
	],
	onConsentGranted: [
		{
			ifUndefined: false,

			name: 'databuddyConfig',
			type: 'setGlobal',
			value: '{{configWhenGranted}}',
		},
		{
			path: ['databuddy', 'options', 'disabled'],
			type: 'setGlobalPath',
			value: false,
		},
	],
	onLoadDenied: [
		{
			path: ['databuddy', 'options', 'disabled'],
			type: 'setGlobalPath',
			value: true,
		},
	],
	onLoadGranted: [
		{
			path: ['databuddy', 'options', 'disabled'],
			type: 'setGlobalPath',
			value: false,
		},
	],
	vendor: 'databuddy',
	vendorDetails: {
		homepageUrl: 'https://www.databuddy.cc/',
		legalName: 'Databuddy Analytics, Inc.',
		name: 'Databuddy',
		privacyPolicyUrl: 'https://www.databuddy.cc/privacy',
	},
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
 * @remarks When `clientId` is missing or blank, the
 *   helper logs `databuddy: missing or invalid clientId` with
 *   `console.error` and returns a script that never loads.
 *
 * @example
 * ```ts
 * import { createConsentKernel } from 'c15t';
 * import { createScriptLoader } from 'c15t/modules/script-loader';
 * import { databuddy } from '@c15t/integrations/databuddy';
 *
 * const kernel = createConsentKernel();
 * const loader = createScriptLoader({
 *   kernel,
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
export const databuddy = function databuddy(
	options: DatabuddyConsentOptions
): Script {
	const clientId = readId(options.clientId);
	if (clientId === undefined) {
		return skipMissingId('databuddy', 'clientId', {
			category: 'measurement',
			manifest: databuddyManifest,
		});
	}

	const resolved = resolveManifest(databuddyManifest, {
		apiUrl: options.apiUrl ?? 'https://basket.databuddy.cc',
		clientId,
		configWhenDenied: options.configWhenDenied,
		configWhenGranted: options.configWhenGranted,
		scriptUrl: resolveScriptUrl(
			options.scriptUrl,
			'https://cdn.databuddy.cc/databuddy.js'
		),
	});

	return resolved;
};
