import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import { resolveScriptUrl } from '../_shared/script-url';

declare global {
	interface Window {
		MunchkinTracker?: { init: (...args: unknown[]) => void };
		Munchkin?: {
			init: (id: string, options?: Record<string, unknown>) => void;
			munchkinFunction?: (
				command: string,
				options?: Record<string, unknown>
			) => void;
			createTrackingCookie?: (force?: boolean) => void;
		};
	}
}

/** Marketo's loader, gated on marketing consent. */
export const marketoManifest = {
	...vendorManifestContract,
	category: 'marketing',
	install: [{ async: true, src: '{{scriptUrl}}', type: 'loadScript' }],
	onLoadGranted: [
		{
			args: ['{{munchkinId}}', '{{initOptions}}'],
			global: 'Munchkin',
			method: 'init',
			type: 'callGlobal',
		},
	],
	vendor: 'marketo',
	vendorDetails: {
		homepageUrl:
			'https://business.adobe.com/products/marketo/adobe-marketo.html',
		legalName: 'Adobe Inc.',
		name: 'Marketo Munchkin',
		privacyPolicyUrl: 'https://www.adobe.com/privacy/policy.html',
	},
} as const satisfies VendorManifest;

export interface MarketoMunchkinOptions {
	/** Munchkin account ID from Marketo's installation snippet. */
	munchkinId: string;
	/** Options passed to Munchkin.init, including cookieAnon and anonymizeIP. */
	initOptions?: Record<string, unknown>;
	/** Consent condition required before loading. @default 'marketing' */
	category?: Script['category'];
	/** Custom or proxied Munchkin loader URL. */
	scriptUrl?: string;
}

/**
 * Loads and initializes Munchkin after marketing consent.
 *
 * Keep reloadOnConsentRevoked enabled. Munchkin has no documented runtime stop
 * API, and removing the tag cannot stop its listeners or clear its cookies.
 *
 * @param options - Account ID, initialization options and consent condition.
 * @returns The consent-gated script, or an inactive script for a missing ID.
 * @example marketoMunchkin({ munchkinId: 'AAA-BBB-CCC' });
 * @see https://experienceleague.adobe.com/en/docs/marketo-developer/marketo/javascriptapi/leadtracking/lead-tracking
 */
export const marketoMunchkin = function marketoMunchkin(
	options: MarketoMunchkinOptions
): Script {
	const category = options?.category ?? 'marketing';
	const munchkinId = readId(options?.munchkinId);
	if (munchkinId === undefined) {
		return skipMissingId('marketoMunchkin', 'munchkinId', {
			category,
			manifest: marketoManifest,
		});
	}
	const script = resolveManifest(marketoManifest, {
		initOptions: options.initOptions ?? {},
		munchkinId,
		scriptUrl: resolveScriptUrl(
			options.scriptUrl,
			'https://munchkin.marketo.net/munchkin.js'
		),
	});
	return {
		...script,
		category,
		onLoad(info) {
			if (info.hasConsent && info.element?.isConnected) {
				script.onLoad?.(info);
			}
		},
	};
};
