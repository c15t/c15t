import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract, runtimeTimestampValue } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import { resolveScriptUrl, trimToUndefined } from '../_shared/script-url';
import { withActiveCampaignRuntime } from './activecampaign-runtime';

declare global {
	interface Window {
		prismGlobalObjectAlias?: string;
		pgo?: ((...args: unknown[]) => void) & { q?: IArguments[]; l?: number };
	}
}

/** ActiveCampaign's current pgo snippet with tracking disabled at startup. */
export const activeCampaignTrackingManifest = {
	...vendorManifestContract,
	category: 'marketing',
	install: [
		{
			ifUndefined: false,
			name: 'prismGlobalObjectAlias',
			type: 'setGlobal',
			value: 'pgo',
		},
		{
			name: 'pgo',
			properties: { l: runtimeTimestampValue },
			queue: { property: 'q' },
			type: 'defineStubFunction',
		},
		{
			args: ['setAccount', '{{accountId}}'],
			global: 'pgo',
			type: 'callGlobal',
		},
		{ args: ['setTrackByDefault', false], global: 'pgo', type: 'callGlobal' },
		{ async: true, src: '{{scriptUrl}}', type: 'loadScript' },
	],
	onConsentDenied: [
		{ args: ['setTrackByDefault', false], global: 'pgo', type: 'callGlobal' },
	],
	onLoadGranted: [
		{ args: ['process', 'allowTracking'], global: 'pgo', type: 'callGlobal' },
	],
	persistAfterConsentRevoked: true,
	vendor: 'activecampaign',
	vendorDetails: {
		homepageUrl: 'https://www.activecampaign.com/',
		legalName: 'ActiveCampaign, LLC',
		name: 'ActiveCampaign',
		privacyPolicyUrl: 'https://www.activecampaign.com/legal/privacy-policy',
	},
} as const satisfies VendorManifest;

export interface ActiveCampaignTrackingOptions {
	/** ActiveCampaign account ID from the tracking snippet. */
	accountId: string | number;
	/** Email for future requests. Removing it clears the email field after consent. */
	email?: string;
	/** Consent condition required before loading. @default 'marketing' */
	category?: Script['category'];
	/** Regional or proxied loader URL. Fixed after loading starts on this page. */
	scriptUrl?: string;
}

/**
 * Loads ActiveCampaign site tracking only after consent.
 * Keep reloadOnConsentRevoked enabled. setTrackByDefault(false) does not
 * revoke an allowTracking call on an already-running tracker.
 * @param options - Account ID and optional contact email.
 * @returns A gated script, or an inactive script for a missing account ID.
 * @example activeCampaignTracking({ accountId: '123456' });
 * @see https://help.activecampaign.com/hc/en-us/articles/360000872064-Site-tracking-and-the-GDPR
 */
export const activeCampaignTracking = function activeCampaignTracking(
	options: ActiveCampaignTrackingOptions
): Script {
	const category = options?.category ?? 'marketing';
	const accountId = readId(options?.accountId);
	if (!accountId) {
		return skipMissingId('activeCampaignTracking', 'accountId', {
			category,
			manifest: activeCampaignTrackingManifest,
		});
	}
	const email = trimToUndefined(options.email);
	const scriptUrl = resolveScriptUrl(
		options.scriptUrl,
		'https://diffuser-cdn.app-us1.com/diffuser/diffuser.js'
	);
	const script = resolveManifest(activeCampaignTrackingManifest, {
		accountId,
		scriptUrl,
	});
	return withActiveCampaignRuntime(
		{ ...script, category },
		{ accountId, email, scriptUrl }
	);
};
