import type { AllConsentNames, Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { runtimeDateValue, vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import {
	GOOGLE_CONSENT_MODE_V2_DEFAULT_MAPPING,
	withOptionalConsentMapping,
} from '../_shared/google-consent';
import { requireId } from '../_shared/required-id';

// Extended Window interface to include gtag specific properties
declare global {
	interface Window {
		dataLayer: unknown[];
		gtag: (...args: unknown[]) => void;
	}
}

/**
 * Google Tag (gtag.js) vendor manifest.
 *
 * Similar to GTM but for direct Google product integration (Analytics, Ads, Floodlight).
 * Uses the same Consent Mode v2 mapping.
 */
export const gtagManifest = {
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
	category: '{{category}}',
	consentMapping: GOOGLE_CONSENT_MODE_V2_DEFAULT_MAPPING,
	consentSignal: 'gtag',
	install: [
		{
			args: ['js', runtimeDateValue],

			global: 'gtag',
			type: 'callGlobal',
		},
		{
			args: ['config', '{{id}}'],

			global: 'gtag',
			type: 'callGlobal',
		},
		{
			async: true,

			src: 'https://www.googletagmanager.com/gtag/js?id={{id}}',
			type: 'loadScript',
		},
	],
	persistAfterConsentRevoked: true,
	vendor: 'gtag',
	vendorDetails: {
		homepageUrl: 'https://developers.google.com/tag-platform/gtagjs',
		legalName: 'Google LLC',
		name: 'Google Tag',
		privacyPolicyUrl: 'https://policies.google.com/privacy',
	},
} as const satisfies VendorManifest;

/**
 * When the `gtag` helper requests `gtag/js` from Google.
 *
 * - `always`: on every page, before a choice. Consent Mode signals tell
 *   Google what the visitor allowed.
 * - `after-consent`: only once the helper's `category` is allowed.
 */
export type GtagLoadMode = 'always' | 'after-consent';

export interface GtagOptions {
	/** Parameters forwarded to gtag config. */
	config?: Record<string, unknown>;
	/**
	 * Your gtag id
	 * @example `G-XXXXXXX`
	 */
	id: string;

	/**
	 * The consent category to use for the gtag script. This is typically marketing (Ads & Floodlight) or measurement (Analytics)
	 *
	 * With `loadMode: 'after-consent'`, `gtag/js` waits for this category.
	 * @example 'marketing'
	 */
	category: AllConsentNames;

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
	 * When c15t loads `gtag/js`.
	 *
	 * - `always`: load on every page, before the visitor chooses. The helper
	 *   sends `gtag('consent', 'default', ...)` with the current permissions
	 *   before `config`, then `gtag('consent', 'update', ...)` on every change.
	 *   `category` does not delay loading.
	 * - `after-consent`: make no request to Google and create no `dataLayer`
	 *   until `category` is allowed. The script then loads once, with a
	 *   `consent` `default` command that reflects the current permissions sent
	 *   before `config`, and `update` commands on later changes. Google gets no
	 *   cookieless pings from visitors whose `category` is denied, so Consent
	 *   Mode cannot model their conversions.
	 *
	 * `after-consent` waits for `category` to be allowed, not for a recorded
	 * choice. Under an `opt-out` or `none` policy, optional categories are
	 * allowed before a choice, so the script loads on the first page.
	 * `necessary` is always allowed, so pair this mode with `measurement` or
	 * `marketing`.
	 *
	 * After a withdrawal c15t reloads the page by default. With
	 * `reloadOnConsentRevoked: false`, the loaded tag stays on the page and
	 * receives an `update` that denies the withdrawn types.
	 *
	 * @default 'always'
	 */
	loadMode?: GtagLoadMode;

	/**
	 * Deprecated script-level overrides preserved for backwards compatibility.
	 *
	 * Prefer manifest-backed options instead of this generic override bag.
	 * @deprecated
	 */
	script?: Partial<Script>;
}

/**
 * Creates a Google Tag (gtag.js) script.
 * Allows you to send data website to linked Google products like Analytics, Ads & Floodlight.
 *
 * By default the script loads before a choice and passes Google Consent Mode
 * v2 signals. Set `loadMode: 'after-consent'` to keep every request to Google
 * waiting until `category` is allowed.
 *
 * @param options - The options for the gtag script.
 * @returns The Google Tag script.
 * @throws {Error} `gtag: missing or invalid id` when `id` is
 *   empty or only whitespace.
 *
 * @example
 * ```ts
 * gtag({
 * 	id: 'G-XXXXXXXXXX',
 * 	category: 'measurement',
 * 	loadMode: 'after-consent',
 * });
 * ```
 */
export const gtag = function gtag({
	id,
	config,
	category,
	consentMapping,
	loadMode = 'always',
	script,
}: GtagOptions): Script {
	const base =
		config === undefined
			? gtagManifest
			: {
					...gtagManifest,
					install: gtagManifest.install.map((step) =>
						step.type === 'callGlobal' && step.args[0] === 'config'
							? { ...step, args: ['config', '{{id}}', '{{config}}'] }
							: step
					),
				};
	const manifest = withOptionalConsentMapping(base, consentMapping);

	const resolved = resolveManifest(manifest, {
		category,
		config,
		id: requireId('gtag', 'id', id),
	});

	if (loadMode === 'after-consent') {
		resolved.alwaysLoad = undefined;
	}

	if (!script) {
		return resolved;
	}

	return {
		...resolved,
		...script,
		attributes: {
			...(resolved.attributes ?? {}),
			...(script.attributes ?? {}),
		},
	};
};
