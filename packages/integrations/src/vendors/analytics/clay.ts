import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import { resolveScriptUrl, trimToUndefined } from '../_shared/script-url';

interface ClaydarClient {
	giveCookieConsent?: () => void;
	denyCookieConsent?: () => void;
	push?: (command: unknown) => unknown;
}

declare global {
	interface Window {
		Claydar?: ClaydarClient;
	}
}

/** Clay web intent loader. Marketing consent gates its complete dependency chain. */
export const clayManifest = {
	...vendorManifestContract,
	category: 'marketing',
	install: [{ async: true, src: '{{scriptUrl}}', type: 'loadScript' }],
	onConsentDenied: [
		{ queue: 'Claydar', type: 'pushToQueue', value: ['denyCookieConsent'] },
		{ global: 'Claydar', method: 'denyCookieConsent', type: 'callGlobal' },
	],
	onConsentGranted: [
		{ queue: 'Claydar', type: 'pushToQueue', value: ['giveCookieConsent'] },
		{ global: 'Claydar', method: 'giveCookieConsent', type: 'callGlobal' },
	],
	onLoadDenied: [
		{ queue: 'Claydar', type: 'pushToQueue', value: ['denyCookieConsent'] },
		{ global: 'Claydar', method: 'denyCookieConsent', type: 'callGlobal' },
	],
	onLoadGranted: [
		{ queue: 'Claydar', type: 'pushToQueue', value: ['giveCookieConsent'] },
		{ global: 'Claydar', method: 'giveCookieConsent', type: 'callGlobal' },
	],
	persistAfterConsentRevoked: true,
	vendor: 'clay',
	vendorDetails: {
		homepageUrl: 'https://www.clay.com/',
		legalName: 'Clay Labs Inc.',
		name: 'Clay',
		privacyPolicyUrl: 'https://www.clay.com/privacy',
	},
} as const satisfies VendorManifest;

/** Configuration copied from Clay's Web intent installation snippet. */
export interface ClayOptions {
	/** Public site ID from the loader's id query parameter. */
	siteId: string;
	/** Override URL. Keep the id query parameter because Clay reads its own src. */
	scriptUrl?: string;
}

/**
 * Loads Clay only after marketing consent.
 * @param options - Public site ID and optional loader override.
 * @returns A consent-gated Clay script, or a skipped script for an invalid ID.
 * @remarks Keep the default reload on revocation. Clay has no tracking stop API.
 * @example clay({ siteId: 'YOUR_SITE_ID' });
 * @see https://university.clay.com/docs/website-tracking
 */
export const clay = function clay(options: ClayOptions): Script {
	const siteId = readId(options?.siteId);
	if (siteId === undefined) {
		return skipMissingId('clay', 'siteId', {
			category: 'marketing',
			manifest: clayManifest,
		});
	}
	const script = resolveManifest(clayManifest, {
		scriptUrl: resolveScriptUrl(
			trimToUndefined(options.scriptUrl),
			`https://static.claydar.com/init.v1.js?id=${encodeURIComponent(siteId)}`
		),
	});
	return {
		...script,
		onLoad(info) {
			if (info.element?.isConnected) {
				script.onLoad?.(info);
			}
		},
		target: 'body',
	};
};
