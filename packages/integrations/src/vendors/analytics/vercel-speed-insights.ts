import type { Script, ScriptCallbackInfo } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { trimToUndefined } from '../_shared/script-url';

export type VercelSpeedInsightsMode = 'auto' | 'development' | 'production';

/** Web Vitals report the collector passes to `beforeSend`. */
export interface VercelSpeedInsightsEvent {
	type: 'vital';
	url: string;
	route?: string;
}

/**
 * Edits or drops a report before the collector sends it. Return the event,
 * possibly with a changed `url`, or `null` to drop it.
 */
export type VercelSpeedInsightsBeforeSend = (
	event: VercelSpeedInsightsEvent
) => VercelSpeedInsightsEvent | null | undefined | false;

// `@vercel/speed-insights` declares `window.si` with its own type, so a global
// augmentation here would conflict for apps that still install it.
type SpeedInsightsWindow = Window & {
	si?: (action: 'beforeSend', handler: VercelSpeedInsightsBeforeSend) => void;
};

/**
 * Vercel Speed Insights vendor manifest.
 *
 * Seeds the `si` queue the collector replays when it starts, then loads the
 * collector.
 */
export const vercelSpeedInsightsManifest = {
	...vendorManifestContract,
	bootstrap: [
		{
			ifUndefined: true,

			name: 'siq',
			type: 'setGlobal',
			value: [],
		},
		{
			ifUndefined: true,

			name: 'si',
			queue: {
				global: 'siq',
			},
			queueFormat: 'array',
			type: 'defineStubFunction',
		},
	],
	category: 'measurement',
	install: [
		{
			attributes: {
				'data-dsn': '{{dsn}}',
				'data-endpoint': '{{endpoint}}',
				'data-sample-rate': '{{sampleRate}}',

				'data-sdkn': 'c15t',
			},

			defer: true,
			src: '{{scriptUrl}}',
			type: 'loadScript',
		},
	],
	vendor: 'vercel-speed-insights',
	vendorDetails: {
		homepageUrl: 'https://vercel.com/products/speed-insights',
		legalName: 'Vercel Inc.',
		name: 'Vercel Speed Insights',
		privacyPolicyUrl: 'https://vercel.com/legal/privacy-notice',
	},
} as const satisfies VendorManifest;

export interface VercelSpeedInsightsOptions {
	/** Project DSN for self-hosted or non-Vercel deployments. */
	dsn?: string;
	/** Preferred script mode. */
	mode?: VercelSpeedInsightsMode;
	/** Load Vercel's debug bundle when set to `true`. */
	debug?: boolean;
	/** Custom vitals endpoint. */
	endpoint?: string;
	/** Custom loader URL. */
	scriptUrl?: string;
	/**
	 * Share of page loads that report, from `0` to `1`.
	 * @default 1
	 */
	sampleRate?: number;
	/**
	 * Edits or drops reports while measurement is allowed. Use this instead of
	 * calling `window.si('beforeSend', ...)`, which would replace the
	 * helper's consent check.
	 */
	beforeSend?: VercelSpeedInsightsBeforeSend;
}

const getSpeedInsightsScriptUrl = function getSpeedInsightsScriptUrl(
	options: VercelSpeedInsightsOptions
): string {
	const scriptUrl = trimToUndefined(options.scriptUrl);
	if (scriptUrl) {
		return scriptUrl;
	}
	if (options.mode === 'development' || options.debug) {
		return 'https://va.vercel-scripts.com/v1/speed-insights/script.debug.js';
	}

	return 'https://va.vercel-scripts.com/v1/speed-insights/script.js';
};

const getSampleRateAttribute = function getSampleRateAttribute(
	sampleRate: number | undefined
): string | undefined {
	if (sampleRate === undefined) {
		return undefined;
	}
	if (!Number.isFinite(sampleRate) || sampleRate < 0 || sampleRate > 1) {
		throw new TypeError(
			'vercelSpeedInsights: sampleRate must be a number from 0 to 1'
		);
	}

	return String(sampleRate);
};

/**
 * Creates a Vercel Speed Insights script.
 *
 * @see https://vercel.com/docs/speed-insights
 *
 * @param options - The options for the Vercel Speed Insights script.
 * @returns The Vercel Speed Insights script.
 * @throws {TypeError} When `sampleRate` is not a number from 0 to 1.
 * @remarks The collector keeps measuring after its script element is
 * removed, so the helper also registers a `beforeSend` callback that drops
 * every report while measurement is not allowed.
 *
 * @example
 * ```ts
 * import { vercelSpeedInsights } from '@c15t/integrations/vercel-speed-insights';
 *
 * vercelSpeedInsights({ sampleRate: 0.5 });
 * ```
 */
export const vercelSpeedInsights = function vercelSpeedInsights(
	options: VercelSpeedInsightsOptions = {}
): Script {
	const resolved = resolveManifest(vercelSpeedInsightsManifest, {
		dsn: trimToUndefined(options.dsn),
		endpoint: trimToUndefined(options.endpoint),
		sampleRate: getSampleRateAttribute(options.sampleRate),
		scriptUrl: getSpeedInsightsScriptUrl(options),
	});

	let hasConsent = false;
	const { beforeSend } = options;
	const gate: VercelSpeedInsightsBeforeSend = (event) => {
		if (!hasConsent) {
			return null;
		}

		return beforeSend ? beforeSend(event) : event;
	};

	// The collector holds one `beforeSend` callback, and another helper
	// instance may have registered its own, so register on every change.
	const applyConsent = ({ hasConsent: allowed }: ScriptCallbackInfo): void => {
		hasConsent = allowed;
		(window as SpeedInsightsWindow).si?.('beforeSend', gate);
	};

	const manifestOnBeforeLoad = resolved.onBeforeLoad;
	resolved.onBeforeLoad = (info) => {
		manifestOnBeforeLoad?.(info);
		applyConsent(info);
	};

	const manifestOnConsentChange = resolved.onConsentChange;
	resolved.onConsentChange = (info) => {
		manifestOnConsentChange?.(info);
		applyConsent(info);
	};

	return resolved;
};
