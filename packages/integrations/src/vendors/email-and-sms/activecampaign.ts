import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract, runtimeTimestampValue } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import { createScriptReuse } from '../_shared/reuse-script';
import { resolveScriptUrl, trimToUndefined } from '../_shared/script-url';

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
	/** Contact email, sent only after the mapped consent. */
	email?: string;
	/** Consent condition required before loading. @default 'marketing' */
	category?: Script['category'];
	/** Regional or proxied ActiveCampaign loader URL. */
	scriptUrl?: string;
}

const createActiveCampaignTracking = function createActiveCampaignTracking(
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
	const manifest: VendorManifest = email
		? {
				...activeCampaignTrackingManifest,
				onLoadGranted: [
					{
						args: ['setEmail', '{{email}}'],
						global: 'pgo',
						type: 'callGlobal',
					},
					...activeCampaignTrackingManifest.onLoadGranted,
				],
			}
		: activeCampaignTrackingManifest;
	const script = resolveManifest(manifest, {
		accountId,
		email,
		scriptUrl: resolveScriptUrl(
			options.scriptUrl,
			'https://diffuser-cdn.app-us1.com/diffuser/diffuser.js'
		),
	});
	let hasConsent = false;
	let loaded = false;
	return {
		...script,
		category,
		onBeforeLoad(info) {
			({ hasConsent } = info);
			if (hasConsent) {
				script.onBeforeLoad?.(info);
			}
		},
		onConsentChange(info) {
			const changed = hasConsent !== info.hasConsent;
			({ hasConsent } = info);
			script.onConsentChange?.(info);
			if (changed && hasConsent && loaded && info.element?.isConnected) {
				script.onLoad?.(info);
			}
		},
		onDispose() {
			hasConsent = false;
		},
		onLoad(info) {
			loaded = true;
			if (hasConsent && info.hasConsent && info.element?.isConnected) {
				script.onLoad?.(info);
			}
		},
		serverStart: undefined,
	};
};

const reuseActiveCampaignTracking =
	createScriptReuse<ActiveCampaignTrackingOptions>();

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
	if (!readId(options?.accountId)) {
		return skipMissingId('activeCampaignTracking', 'accountId', {
			category: options?.category ?? 'marketing',
			manifest: activeCampaignTrackingManifest,
		});
	}
	return reuseActiveCampaignTracking(options, createActiveCampaignTracking);
};
