import type { Script, ScriptCallbackInfo } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { SetGlobalPathStep, VendorManifest } from '../../types';
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
		/** Set by `replay.js` once it runs. */
		databuddyReplay?: {
			stop: () => void;
		};
	}
}

const disableTracker = {
	path: ['databuddy', 'options', 'disabled'],
	type: 'setGlobalPath',
	value: true,
} satisfies SetGlobalPathStep;

const enableTracker = {
	...disableTracker,
	value: false,
} satisfies SetGlobalPathStep;

/**
 * Removing the `<script>` on a refusal does not cancel a download that has
 * started, and `databuddy.js` reads `window.databuddyConfig` when it runs.
 * Disabling the config makes a script that finishes after the refusal start
 * disabled. Every granted load enables it again, so a later grant on the same
 * page does not start from the refused state.
 */
const disableConfig = {
	path: ['databuddyConfig', 'disabled'],
	type: 'setGlobalPath',
	value: true,
} satisfies SetGlobalPathStep;

const enableConfig = {
	...disableConfig,
	value: false,
} satisfies SetGlobalPathStep;

/**
 * Databuddy vendor manifest.
 *
 * Databuddy loads only with measurement consent. On revocation the manifest
 * sets `options.disabled`, which stops the main tracker, and disables the
 * config a script still downloading will read. `replay.js` ignores that flag,
 * so the helper's `replay` option stops it separately.
 * Config is seeded via `window.databuddyConfig` before the script loads.
 */
export const databuddyManifest = {
	...vendorManifestContract,
	category: 'measurement',
	install: [
		{
			async: true,
			attributes: {
				crossorigin: 'anonymous',
				'data-api-url': '{{apiUrl}}',

				'data-client-id': '{{clientId}}',
				'data-track-errors': '{{trackErrors}}',
				'data-track-interactions': '{{trackInteractions}}',
				'data-track-outgoing-links': '{{trackOutgoingLinks}}',
				'data-track-web-vitals': '{{trackWebVitals}}',
			},

			src: '{{scriptUrl}}',
			type: 'loadScript',
		},
	],
	onBeforeLoadGranted: [
		{
			ifUndefined: true,

			name: 'databuddyConfig',
			type: 'setGlobal',
			value: '{{configWhenGranted}}',
		},
		enableConfig,
	],
	onConsentDenied: [disableConfig, disableTracker],
	onConsentGranted: [
		{
			ifUndefined: false,

			name: 'databuddyConfig',
			type: 'setGlobal',
			value: '{{configWhenGranted}}',
		},
		enableConfig,
		enableTracker,
	],
	onLoadDenied: [disableTracker],
	onLoadGranted: [enableTracker],
	vendor: 'databuddy',
	vendorDetails: {
		homepageUrl: 'https://www.databuddy.cc/',
		legalName: 'Databuddy Analytics, Inc.',
		name: 'Databuddy',
		privacyPolicyUrl: 'https://www.databuddy.cc/privacy',
	},
} as const satisfies VendorManifest;

/**
 * Databuddy manifest for `loadMode: 'always'`.
 *
 * The script loads before consent and stays after a refusal, so the denied
 * steps above keep it from collecting, and `configWhenDenied` seeds the
 * config it starts with.
 *
 * The default manifest leaves `configWhenDenied` out: that script never
 * starts without consent, and swapping the config on a refusal would leave
 * the denied config in place for the script a later grant loads again.
 */
const databuddyAlwaysLoadManifest = {
	...databuddyManifest,
	alwaysLoad: true,
	onBeforeLoadDenied: [
		{
			ifUndefined: true,

			name: 'databuddyConfig',
			type: 'setGlobal',
			value: '{{configWhenDenied}}',
		},
		disableConfig,
	],
	onConsentDenied: [
		{
			ifUndefined: false,

			name: 'databuddyConfig',
			type: 'setGlobal',
			value: '{{configWhenDenied}}',
		},
		disableConfig,
		disableTracker,
	],
} as const satisfies VendorManifest;

export type DatabuddyLoadMode = 'after-consent' | 'always';

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
	 * When c15t should load the Databuddy script.
	 *
	 * - `after-consent`: wait for measurement consent before loading Databuddy.
	 * - `always`: load immediately and switch Databuddy's disabled flag from
	 *   consent. Databuddy starts before the visitor chooses and stores a
	 *   visitor ID even while disabled.
	 *
	 * @default 'after-consent'
	 */
	loadMode?: DatabuddyLoadMode;

	/**
	 * Turns Databuddy tracking features on or off. Each switch sets a
	 * `data-track-*` attribute on the script. An unset switch leaves
	 * Databuddy's own default.
	 *
	 * Databuddy reads `data-*` attributes after `window.databuddyConfig`, so a
	 * switch wins over the same key in `configWhenGranted` or
	 * `configWhenDenied`.
	 *
	 * @default {}
	 */
	features?: DatabuddyFeatures;

	/**
	 * Loads Databuddy's session replay recorder, `replay.js`, while
	 * measurement is granted. `true` keeps Databuddy's replay defaults. On
	 * revocation the helper stops the recorder and removes its script.
	 *
	 * @default false
	 */
	replay?: boolean | DatabuddyReplayOptions;

	/**
	 * Databuddy config object to seed when consent is granted at load time.
	 * c15t sets its `disabled` key from consent. The default carries the
	 * client ID and API URL, for when Databuddy cannot read them from its
	 * script tag.
	 * @default { apiUrl, clientId, disabled: false }
	 */
	configWhenGranted?: Record<string, unknown>;

	/**
	 * Databuddy config object to seed when consent is denied at load time,
	 * and to set on a refusal. Used only with `loadMode: 'always'`. c15t sets
	 * its `disabled` key from consent.
	 * @default { apiUrl, clientId, disabled: true }
	 */
	configWhenDenied?: Record<string, unknown>;
}

/**
 * Databuddy tracking features. `false` turns the feature off, `true` turns it
 * on, and unset keeps Databuddy's default.
 */
export interface DatabuddyFeatures {
	/**
	 * Rage clicks, dead clicks and abandoned forms. Sets
	 * `data-track-interactions`. Databuddy turns this on by default.
	 *
	 * @default undefined
	 */
	interactions?: boolean;

	/**
	 * FCP, LCP, INP, CLS, TTFB and FPS. Sets `data-track-web-vitals`.
	 * Databuddy turns this off by default.
	 *
	 * @default undefined
	 */
	webVitals?: boolean;

	/**
	 * JavaScript errors, with message and stack. Sets `data-track-errors`.
	 * Databuddy turns this off by default.
	 *
	 * @default undefined
	 */
	errors?: boolean;

	/**
	 * Clicks on links to other sites. Sets `data-track-outgoing-links`.
	 * Databuddy turns this off by default.
	 *
	 * @default undefined
	 */
	outgoingLinks?: boolean;
}

/**
 * Databuddy session replay settings. Each one sets a `data-*` attribute on
 * `replay.js`. An unset setting leaves Databuddy's own default.
 */
export interface DatabuddyReplayOptions {
	/**
	 * Masks page text in recordings. Set `false` to record it. Typed input
	 * stays masked either way. Sets `data-mask-text`. Databuddy masks text by
	 * default.
	 *
	 * @default undefined
	 */
	maskText?: boolean;

	/**
	 * Records your own embedded pages into the parent page's recording. Set it
	 * on the framed page too. Sets `data-record-iframes`. Databuddy turns this
	 * off by default.
	 *
	 * @default undefined
	 */
	recordIframes?: boolean;

	/**
	 * The Databuddy replay script URL.
	 * @default 'https://cdn.databuddy.cc/replay.js'
	 */
	scriptUrl?: string;
}

/**
 * Maps a feature switch to its `data-*` attribute value. `undefined` drops
 * the attribute from the script.
 */
const featureAttribute = function featureAttribute(
	enabled: boolean | undefined
): string | undefined {
	return enabled === undefined ? undefined : String(enabled);
};

interface ReplaySettings {
	apiUrl: string;
	clientId: string;
	maskText: boolean | undefined;
	recordIframes: boolean | undefined;
	scriptUrl: string;
}

/**
 * Starts and stops `replay.js` from consent. The recorder is a separate
 * script that ignores `options.disabled`, so revocation calls its own
 * `stop()`. A removed `<script>` that finishes downloading does not start,
 * because `replay.js` checks that it is still in the document.
 */
const createReplayLoader = function createReplayLoader(
	settings: ReplaySettings
) {
	let element: HTMLScriptElement | undefined;

	return {
		start(info: ScriptCallbackInfo) {
			if (window.databuddyReplay || element?.isConnected) {
				return;
			}
			element = document.createElement('script');
			element.async = true;
			element.src = settings.scriptUrl;
			element.setAttribute('crossorigin', 'anonymous');
			element.setAttribute('data-api-url', settings.apiUrl);
			element.setAttribute('data-client-id', settings.clientId);
			const maskText = featureAttribute(settings.maskText);
			if (maskText !== undefined) {
				element.setAttribute('data-mask-text', maskText);
			}
			const recordIframes = featureAttribute(settings.recordIframes);
			if (recordIframes !== undefined) {
				element.setAttribute('data-record-iframes', recordIframes);
			}
			if (info.element?.nonce) {
				element.nonce = info.element.nonce;
			}
			document.head.appendChild(element);
		},
		stop() {
			element?.remove();
			element = undefined;
			window.databuddyReplay?.stop();
		},
	};
};

/**
 * Loads the Databuddy script once measurement consent is granted and manages
 * consent state declaratively via the manifest runtime.
 *
 * On revocation, the helper sets `window.databuddy.options.disabled` to
 * `true`, which stops the main tracker. With `replay`, it also loads
 * `replay.js` while measurement is granted and calls its `stop()` on
 * revocation. With `loadMode: 'always'`, the script loads before consent
 * and the same flag keeps the tracker from sending until measurement is
 * granted. `replay.js` still waits for consent.
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
 *       features: { interactions: false, webVitals: true },
 *       replay: { maskText: false },
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

	const apiUrl = options.apiUrl ?? 'https://basket.databuddy.cc';
	const features = options.features ?? {};
	const manifest =
		options.loadMode === 'always'
			? databuddyAlwaysLoadManifest
			: databuddyManifest;

	const script = resolveManifest(manifest, {
		apiUrl,
		clientId,
		configWhenDenied: options.configWhenDenied ?? {
			apiUrl,
			clientId,
			disabled: true,
		},
		configWhenGranted: options.configWhenGranted ?? {
			apiUrl,
			clientId,
			disabled: false,
		},
		scriptUrl: resolveScriptUrl(
			options.scriptUrl,
			'https://cdn.databuddy.cc/databuddy.js'
		),
		trackErrors: featureAttribute(features.errors),
		trackInteractions: featureAttribute(features.interactions),
		trackOutgoingLinks: featureAttribute(features.outgoingLinks),
		trackWebVitals: featureAttribute(features.webVitals),
	});
	if (!options.replay) {
		return script;
	}

	const replayOptions = options.replay === true ? {} : options.replay;
	const replay = createReplayLoader({
		apiUrl,
		clientId,
		maskText: replayOptions.maskText,
		recordIframes: replayOptions.recordIframes,
		scriptUrl: resolveScriptUrl(
			replayOptions.scriptUrl,
			'https://cdn.databuddy.cc/replay.js'
		),
	});

	return {
		...script,
		onConsentChange(info) {
			script.onConsentChange?.(info);
			if (info.hasConsent) {
				replay.start(info);
			} else {
				replay.stop();
			}
		},
		onLoad(info) {
			script.onLoad?.(info);
			if (info.hasConsent) {
				replay.start(info);
			}
		},
	};
};
