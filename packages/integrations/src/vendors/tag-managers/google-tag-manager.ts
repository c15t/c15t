import type { AllConsentNames, HasCondition, Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { runtimeTimestampValue, vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import {
	GOOGLE_CONSENT_MODE_V2_DEFAULT_MAPPING,
	withOptionalConsentMapping,
} from '../_shared/google-consent';
import { readId, skipMissingId } from '../_shared/required-id';

// Extended Window interface to include GTM-specific properties
declare global {
	interface Window {
		dataLayer: unknown[];
		gtag: (...args: unknown[]) => void;
	}
}

/**
 * Google Tag Manager vendor manifest.
 *
 * Defines GTM as a declarative integration:
 * - Initializes dataLayer and gtag function before the container loads
 * - Maps c15t consent categories to Google Consent Mode v2 types
 * - Signals consent state via `gtag('consent', 'default'|'update', ...)`
 */
export const googleTagManagerManifest = {
	...vendorManifestContract,
	alwaysLoad: true,
	bootstrap: [
		{
			ifUndefined: true,

			name: 'dataLayer',
			type: 'setGlobal',
			value: [],
		},
		{
			ifUndefined: true,

			name: 'gtag',
			queue: 'dataLayer',
			type: 'defineQueueFunction',
		},
	],
	category: 'necessary',
	consentMapping: GOOGLE_CONSENT_MODE_V2_DEFAULT_MAPPING,
	consentSignal: 'gtag',
	install: [
		{
			queue: 'dataLayer',
			type: 'pushToQueue',
			value: {
				event: 'gtm.js',

				'gtm.start': runtimeTimestampValue,
			},
		},
		{
			async: true,

			src: 'https://www.googletagmanager.com/gtm.js?id={{id}}',
			type: 'loadScript',
		},
	],
	onConsentChange: [
		{
			args: ['event', '{{updateEventName}}'],

			global: 'gtag',
			type: 'callGlobal',
		},
	],
	vendor: 'google-tag-manager',
	vendorDetails: {
		homepageUrl: 'https://marketingplatform.google.com/about/tag-manager/',
		legalName: 'Google LLC',
		name: 'Google Tag Manager',
		privacyPolicyUrl: 'https://policies.google.com/privacy',
	},
} as const satisfies VendorManifest;

/**
 * When the `googleTagManager` helper requests `gtm.js` from Google.
 *
 * - `always`: on every page, before a choice. Consent Mode signals tell
 *   Google what the visitor allowed.
 * - `after-consent`: only once the helper's `category` is allowed.
 */
export type GoogleTagManagerLoadMode = 'always' | 'after-consent';

/**
 * Category condition for a container that waits for consent.
 *
 * A container usually holds measurement tags, such as Google Analytics, and
 * marketing tags, such as Google Ads. Loading it once either is allowed lets
 * each tag run for a visitor who allowed only its purpose, while Consent Mode
 * keeps Google tags from using the purpose that is still denied. A new object
 * per call keeps one script's category from leaking into another.
 */
const afterConsentCategory =
	function afterConsentCategory(): HasCondition<AllConsentNames> {
		return { or: ['measurement', 'marketing'] };
	};

export interface GoogleTagManagerOptions {
	/** Container queue name. Defaults to dataLayer. */
	dataLayer?: string;
	/**
	 * Your Google Tag Manager container ID. Begins with 'GTM-'.
	 * @example `GTM-1234XXX`
	 */
	id: string;

	/**
	 * Custom event name fired after consent updates.
	 * Can be used as a trigger in GTM to load scripts once consent is updated.
	 *
	 * @default 'consent-update'
	 */
	updateEventName?: string;

	/**
	 * Custom mapping from c15t consent categories to Google Consent Mode v2 types.
	 * Overrides the default mapping when provided.
	 *
	 * @default
	 * ```ts
	 * {
	 *   necessary: ['security_storage'],
	 *   functionality: ['functionality_storage'],
	 *   measurement: ['analytics_storage'],
	 *   marketing: ['ad_storage', 'ad_user_data', 'ad_personalization'],
	 *   experience: ['personalization_storage'],
	 * }
	 * ```
	 */
	consentMapping?: Record<string, string[]>;

	/**
	 * When c15t loads `gtm.js`.
	 *
	 * - `always`: load on every page, before the visitor chooses. The helper
	 *   sends `gtag('consent', 'default', ...)` with the current permissions
	 *   before the container starts, then `gtag('consent', 'update', ...)` and
	 *   the `updateEventName` event on every change.
	 * - `after-consent`: make no request to Google and create no `dataLayer`
	 *   until `category` is allowed. The container then loads once, with a
	 *   `consent` `default` command that reflects the current permissions sent
	 *   before the `gtm.js` start event. Later changes send `update` and the
	 *   `updateEventName` event. Google gets no cookieless pings from visitors
	 *   whose `category` is denied, so Consent Mode cannot model their
	 *   conversions.
	 *
	 * `after-consent` waits for `category` to be allowed, not for a recorded
	 * choice. Under an `opt-out` or `none` policy, optional categories are
	 * allowed before a choice, so the container loads on the first page.
	 *
	 * After a withdrawal c15t reloads the page by default. With
	 * `reloadOnConsentRevoked: false`, the loaded container stays on the page
	 * and receives an `update` that denies the withdrawn types.
	 *
	 * @default 'always'
	 */
	loadMode?: GoogleTagManagerLoadMode;

	/**
	 * Consent condition for the container script.
	 *
	 * With `loadMode: 'always'` it sets the permission that callbacks receive
	 * and does not delay loading. With `loadMode: 'after-consent'` the container
	 * loads once it holds. The default for that mode loads the container when
	 * the visitor allows measurement or marketing, because a container usually
	 * holds tags for both. Google tags inside it still follow the Consent Mode
	 * signals for each type; other tags need consent checks in the container.
	 * Use `'measurement'` for a container that holds only analytics tags.
	 *
	 * @default `'necessary'` with `loadMode: 'always'`, and
	 * `{ or: ['measurement', 'marketing'] }` with `loadMode: 'after-consent'`
	 */
	category?: HasCondition<AllConsentNames>;
}

/**
 * Creates a Google Tag Manager script.
 * GTM can be used for managing the consent of other scripts via Google Tag Manager consent mode.
 * We recommend using c15t's script loader instead so your script logic is centralised.
 *
 * By default the container loads before a choice and passes Google Consent
 * Mode v2 signals. Set `loadMode: 'after-consent'` to keep every request to
 * Google waiting until `category` is allowed.
 *
 * @param options - The options for the Google Tag Manager script.
 * @returns The Google Tag Manager script.
 * @remarks When `id` is missing or blank, the
 *   helper logs `googleTagManager: missing or invalid id` with
 *   `console.error` and returns a script that never loads.
 *
 * @example
 * ```ts
 * googleTagManager({ id: 'GTM-XXXXXXX', loadMode: 'after-consent' });
 * ```
 */
export const googleTagManager = function googleTagManager({
	id,
	dataLayer = 'dataLayer',
	updateEventName,
	consentMapping,
	loadMode = 'always',
	category,
}: GoogleTagManagerOptions): Script {
	const normalizedId = readId(id);
	if (normalizedId === undefined) {
		return skipMissingId('googleTagManager', 'id', {
			category: 'necessary',
			id: 'google-tag-manager',
		});
	}

	let manifest: VendorManifest = withOptionalConsentMapping(
		googleTagManagerManifest,
		consentMapping
	);

	if (dataLayer !== 'dataLayer') {
		// Manifest values are JSON; substitute only exact queue/signal tokens.
		manifest = JSON.parse(
			JSON.stringify(manifest)
				.replace(/"(?:dataLayer|gtag)"/gu, (token) =>
					JSON.stringify(
						token === '"dataLayer"' ? dataLayer : `${dataLayer}Gtag`
					)
				)
				.replace(
					'gtm.js?id={{id}}',
					`gtm.js?id={{id}}&l=${encodeURIComponent(dataLayer)}`
				)
		);
		manifest = {
			...manifest,
			consentSignal: 'gtag',
			consentSignalTarget: `${dataLayer}Gtag`,
		};
	}
	const resolved = resolveManifest(manifest, {
		id: normalizedId,
		updateEventName: updateEventName ?? 'consent-update',
	});

	const gtmScript: Script = {
		...resolved,
		attributes: { ...resolved.attributes, 'data-c15t-layer': dataLayer },
	};

	if (loadMode === 'after-consent') {
		gtmScript.alwaysLoad = undefined;
		gtmScript.category = category ?? afterConsentCategory();
		// Removing gtm.js does not stop a running container. Keeping the element
		// lets a later grant reuse it instead of starting a second container.
		gtmScript.persistAfterConsentRevoked = true;
	} else if (category !== undefined) {
		gtmScript.category = category;
	}

	return gtmScript;
};
