import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import { createScriptReuse } from '../_shared/reuse-script';
import { resolveScriptUrl } from '../_shared/script-url';

/** Privacy API provided to Lucky Orange's ready callback. */
export interface LuckyOrangeApi {
	$internal: { ready: (module: string) => Promise<unknown> };
	privacy: {
		setConsentStatus: (consented: boolean) => void;
		getConsentStatus?: () => boolean;
	};
}
/** Lucky Orange's queue accepts ready callbacks before and after installation. */
export interface LuckyOrangeQueue {
	push: (entry: ['ready', (api: LuckyOrangeApi) => void]) => unknown;
}
declare global {
	interface Window {
		LOQ?: LuckyOrangeQueue;
		LO?: LuckyOrangeApi;
	}
}

/** Lucky Orange loader, gated even when dashboard consent is enabled. */
export const luckyOrangeManifest = {
	...vendorManifestContract,
	category: 'measurement',
	install: [
		{ async: true, defer: true, src: '{{scriptUrl}}', type: 'loadScript' },
	],
	persistAfterConsentRevoked: true,
	vendor: 'lucky-orange',
	vendorDetails: {
		homepageUrl: 'https://www.luckyorange.com/',
		legalName: 'Lucky Orange LLC',
		name: 'Lucky Orange',
		privacyPolicyUrl: 'https://www.luckyorange.com/legal/privacy-policy',
	},
} as const satisfies VendorManifest;

export interface LuckyOrangeOptions {
	/** Site ID supplied by Lucky Orange. */
	siteId: string;
	/** Consent condition required before loading. @default 'measurement' */
	category?: Script['category'];
	/** Exact loader URL. Proxies must preserve Lucky Orange's site-ID discovery. */
	scriptUrl?: string;
}

const reuseLuckyOrange = createScriptReuse<LuckyOrangeOptions>();

const createLuckyOrange = function createLuckyOrange(
	options: LuckyOrangeOptions
): Script {
	const category = options?.category ?? 'measurement';
	const siteId = readId(options?.siteId);
	if (!siteId) {
		return skipMissingId('luckyOrange', 'siteId', {
			category,
			manifest: luckyOrangeManifest,
		});
	}
	const script = resolveManifest(luckyOrangeManifest, {
		scriptUrl: resolveScriptUrl(
			options.scriptUrl,
			`https://tools.luckyorange.com/core/lo.js?site-id=${encodeURIComponent(siteId)}`
		),
	});
	let hasConsent = false;
	let api: LuckyOrangeApi | undefined;
	let subscribed = false;
	let disposed = false;
	let appliedConsent: boolean | undefined;
	const applyConsent = (): void => {
		if (!api || appliedConsent === hasConsent) {
			return;
		}
		api.privacy.setConsentStatus(hasConsent);
		appliedConsent = hasConsent;
	};
	const ready = async (loaded: LuckyOrangeApi): Promise<void> => {
		try {
			await loaded.$internal.ready('privacy');
			if (disposed) {
				return;
			}
			api = loaded;
			applyConsent();
		} catch (error) {
			console.error('luckyOrange: privacy initialization failed.', error);
		}
	};
	return {
		...script,
		category,
		onBeforeLoad({ hasConsent: consent }) {
			hasConsent = consent;
			if (!hasConsent || subscribed) {
				return;
			}
			subscribed = true;
			const queue: ['ready', (loaded: LuckyOrangeApi) => void][] = [];
			window.LOQ ??= queue;
			window.LOQ.push([
				'ready',
				(loaded) => {
					void ready(loaded);
				},
			]);
		},
		onConsentChange({ hasConsent: consent }) {
			hasConsent = consent;
			applyConsent();
		},
		onDispose() {
			disposed = true;
			hasConsent = false;
			applyConsent();
		},
	};
};

/**
 * Enables Lucky Orange privacy consent only after its privacy module is ready.
 * Reports privacy initialization failures with `console.error`.
 * Enable Require Consent in the Lucky Orange dashboard. Keep c15t's reload on
 * revocation enabled; false consent is not verified to stop every recording path.
 * @param options - Lucky Orange site and loader configuration.
 * @returns A gated script, or an inactive script for a missing site ID.
 * @example luckyOrange({ siteId: 'YOUR_SITE_ID' });
 * @see https://developers.luckyorange.com/libraries/browser/privacy-tools
 */
export const luckyOrange = function luckyOrange(
	options: LuckyOrangeOptions
): Script {
	if (!readId(options?.siteId)) {
		return skipMissingId('luckyOrange', 'siteId', {
			category: options?.category ?? 'measurement',
			manifest: luckyOrangeManifest,
		});
	}
	return reuseLuckyOrange(options, createLuckyOrange);
};
