import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId, skipScript } from '../_shared/required-id';

declare global {
	interface Window {
		adobeDataLayer?: unknown[];
		_satellite?: Record<string, unknown>;
	}
}

interface AdobeAnalyticsManifestOptions {
	async: boolean;
	seedAdobeDataLayer: boolean;
}

const skippedAdobeAnalyticsScript = {
	category: 'measurement',
	id: 'adobe-analytics',
} as const;

const getAdobeAnalyticsScriptUrlProblem =
	function getAdobeAnalyticsScriptUrlProblem(
		scriptUrl: string
	): string | undefined {
		let parsed: URL;
		try {
			parsed = new URL(scriptUrl);
		} catch {
			return 'adobeAnalytics: invalid scriptUrl - must be a valid https URL from your Adobe Data Collection embed code';
		}

		if (parsed.protocol !== 'https:') {
			return 'adobeAnalytics: invalid scriptUrl - must use https: from your Adobe Data Collection embed code';
		}

		return undefined;
	};

const createAdobeAnalyticsManifest = function createAdobeAnalyticsManifest(
	options: AdobeAnalyticsManifestOptions
): VendorManifest {
	const install: VendorManifest['install'] = [];

	if (options.seedAdobeDataLayer) {
		install.push({
			ifUndefined: true,
			name: 'adobeDataLayer',
			type: 'setGlobal',
			value: [],
		});
	}

	install.push({
		async: options.async,
		src: '{{scriptUrl}}',
		type: 'loadScript',
	});

	return {
		...vendorManifestContract,
		category: 'measurement',
		install,
		vendor: 'adobe-analytics',
		vendorDetails: {
			legalName: 'Adobe Inc.',
			name: 'Adobe Analytics',
			privacyPolicyUrl: 'https://www.adobe.com/privacy/policy.html',
		},
	};
};

/**
 * Adobe Analytics vendor manifest.
 *
 * Loads the Adobe Experience Platform Data Collection Tags embed script for a
 * specific property environment. Adobe does not provide a generic public
 * loader; each customer copies their own environment URL from Data Collection,
 * commonly hosted at `https://assets.adobedtm.com/.../launch-*.min.js`.
 */
export const adobeAnalyticsManifest = createAdobeAnalyticsManifest({
	async: true,
	seedAdobeDataLayer: true,
});

export interface AdobeAnalyticsOptions {
	/**
	 * Adobe Experience Platform Data Collection web property embed URL.
	 *
	 * This must be the full `https:` URL from your Adobe Tags environment embed
	 * code, commonly shaped like
	 * `https://assets.adobedtm.com/{org}/{property}/launch-{env}.min.js`.
	 * Self-hosted Launch/Tags embeds are supported as long as they use `https:`.
	 */
	scriptUrl: string;

	/**
	 * Load the Adobe Tags library asynchronously.
	 *
	 * Adobe recommends asynchronous deployment for most web properties. Set this
	 * to `false` only for legacy synchronous setups that require ordered blocking
	 * behavior.
	 * @default true
	 */
	async?: boolean;

	/**
	 * Seed the Adobe Client Data Layer queue before the Tags library loads.
	 *
	 * When enabled, c15t creates `window.adobeDataLayer = []` only when the
	 * global is still undefined. This matches Adobe Client Data Layer's default
	 * object name and is harmless for properties that do not use the extension.
	 * @default true
	 */
	seedAdobeDataLayer?: boolean;
}

/**
 * Creates an Adobe Analytics script.
 *
 * @see https://experienceleague.adobe.com/en/docs/experience-platform/tags/publish/environments/environments
 * @see https://experienceleague.adobe.com/en/docs/experience-platform/tags/extensions/client/client-data-layer/overview
 *
 * @param options - The options for the Adobe Analytics script.
 * @returns The Adobe Analytics script.
 *
 * @remarks
 * When `scriptUrl` is missing, blank, invalid, or not `https:`, the helper
 * logs the problem with `console.error` and returns a script that never
 * loads. Copy the full web property embed URL from Adobe Data Collection and
 * pass it as `scriptUrl`.
 *
 * Adobe Analytics is commonly deployed through Adobe Experience Platform Data
 * Collection Tags (formerly Launch). The loaded property may in turn load Adobe
 * Analytics, Web SDK, or other extensions and rules, so configure those Adobe
 * rules to respect your consent model too.
 *
 * @example
 * ```ts
 * import { adobeAnalytics } from '@c15t/integrations/adobe-analytics';
 *
 * adobeAnalytics({
 *   scriptUrl:
 *     'https://assets.adobedtm.com/YOUR_ORG/YOUR_PROPERTY/launch-production.min.js',
 * });
 * ```
 */
export const adobeAnalytics = function adobeAnalytics(
	options: AdobeAnalyticsOptions
): Script {
	const scriptUrl = readId(options.scriptUrl);
	if (scriptUrl === undefined) {
		return skipMissingId(
			'adobeAnalytics',
			'scriptUrl',
			skippedAdobeAnalyticsScript
		);
	}
	const problem = getAdobeAnalyticsScriptUrlProblem(scriptUrl);
	if (problem !== undefined) {
		return skipScript(problem, skippedAdobeAnalyticsScript);
	}

	const manifest = createAdobeAnalyticsManifest({
		async: options.async ?? true,
		seedAdobeDataLayer: options.seedAdobeDataLayer ?? true,
	});

	return resolveManifest(manifest, {
		scriptUrl,
	});
};
