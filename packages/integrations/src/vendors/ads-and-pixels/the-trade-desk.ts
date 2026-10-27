import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import { resolveScriptUrl, trimToUndefined } from '../_shared/script-url';

interface TradeDeskFunction {
	(...args: unknown[]): void;
	dumpConfigs?: () => unknown;
}
declare global {
	interface Window {
		ttdConversionEvents?: TradeDeskFunction;
		ttdConversionEventsLayer?: unknown[];
	}
}

/** The Trade Desk Universal Pixel installation, gated on marketing. */
export const theTradeDeskPixelManifest = {
	...vendorManifestContract,
	bootstrap: [
		{ name: 'ttdConversionEventsLayer', type: 'setGlobal', value: [] },
		{
			name: 'ttdConversionEvents',
			queue: 'ttdConversionEventsLayer',
			type: 'defineQueueFunction',
		},
	],
	category: 'marketing',
	install: [
		{
			args: ['init', '{{initOptions}}'],
			global: 'ttdConversionEvents',
			type: 'callGlobal',
		},
		{
			args: ['event', '{{eventOptions}}'],
			global: 'ttdConversionEvents',
			type: 'callGlobal',
		},
		{ async: true, src: '{{scriptUrl}}', type: 'loadScript' },
	],
	persistAfterConsentRevoked: true,
	vendor: 'the-trade-desk',
	vendorDetails: {
		homepageUrl: 'https://www.thetradedesk.com/',
		legalName: 'The Trade Desk, Inc.',
		name: 'The Trade Desk',
		privacyPolicyUrl: 'https://www.thetradedesk.com/legal/privacy',
	},
} as const satisfies VendorManifest;

/** The Trade Desk limited data use configuration. */
export interface TradeDeskDataProcessingOption {
	/** Applicable policies, for example LDU. */
	policies: string[];
	/** Region code, for example US-CO. */
	region: string;
}

/** Universal Pixel account and initialization configuration. */
export interface TheTradeDeskPixelOptions {
	/** Public advertiser ID from the Universal Pixel snippet. */
	advertiserId: string;
	/** At least one public Universal Pixel ID. Blank entries skip the integration. */
	pixelIds: string[];
	/** Permit cookie syncing. Disabling it does not make the SDK consent-free. */
	enableCookieSyncing?: boolean;
	/** Optional limited data use policy, separate from consent. */
	dataProcessingOption?: TradeDeskDataProcessingOption;
	/** Override loader, including the Walmart DSP variant. */
	scriptUrl?: string;
}

/**
 * Initializes The Trade Desk Universal Pixel after marketing consent.
 * @param options - Advertiser, pixel IDs and optional processing policy.
 * @returns A gated script, or a skipped script for missing IDs.
 * @remarks Keep reload on revocation enabled. There is no documented stop API.
 * @example theTradeDeskPixel({ advertiserId: 'ADVERTISER_ID', pixelIds: ['PIXEL_ID'] });
 * @see https://open.thetradedesk.com/provider/docsApp/GuidesProvider/data/doc/TrackingTagsUniversalPixel
 */
export const theTradeDeskPixel = function theTradeDeskPixel(
	options: TheTradeDeskPixelOptions
): Script {
	const advertiserId = readId(options?.advertiserId);
	if (advertiserId === undefined) {
		return skipMissingId('theTradeDeskPixel', 'advertiserId', {
			category: 'marketing',
			manifest: theTradeDeskPixelManifest,
		});
	}
	const pixelIds = Array.isArray(options.pixelIds)
		? options.pixelIds.map(readId)
		: [];
	if (pixelIds.length === 0 || pixelIds.some((id) => id === undefined)) {
		return skipMissingId('theTradeDeskPixel', 'pixelIds', {
			category: 'marketing',
			manifest: theTradeDeskPixelManifest,
		});
	}
	const initOptions: Record<string, unknown> = { advertiserId, pixelIds };
	const eventOptions: Record<string, unknown> = { advertiserId, pixelIds };
	if (options.enableCookieSyncing !== undefined) {
		initOptions.enableCookieSyncing = options.enableCookieSyncing;
	}
	if (options.dataProcessingOption !== undefined) {
		initOptions.dataProcessingOption = options.dataProcessingOption;
		eventOptions.data_processing_option = options.dataProcessingOption;
	}
	return resolveManifest(theTradeDeskPixelManifest, {
		eventOptions,
		initOptions,
		scriptUrl: resolveScriptUrl(
			trimToUndefined(options.scriptUrl),
			'https://js.adsrvr.org/up_loader.3.0.0.js'
		),
	});
};
