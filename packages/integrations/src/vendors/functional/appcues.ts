import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import { resolveScriptUrl } from '../_shared/script-url';

declare global {
	interface Window {
		AppcuesSettings?: Record<string, unknown>;
		Appcues?: {
			reset?: () => void;
			identify?: (userId: string, properties?: Record<string, unknown>) => void;
			group?: (groupId: string, properties?: Record<string, unknown>) => void;
			track?: (eventName: string, properties?: Record<string, unknown>) => void;
			page?: () => void;
		};
	}
}

/** Appcues browser SDK, gated on experience consent. */
export const appcuesManifest = {
	...vendorManifestContract,
	category: 'experience',
	install: [
		{
			ifUndefined: false,
			name: 'AppcuesSettings',
			type: 'setGlobal',
			value: '{{settings}}',
		},
		{ async: true, src: '{{scriptUrl}}', type: 'loadScript' },
	],
	onConsentDenied: [{ global: 'Appcues', method: 'reset', type: 'callGlobal' }],
	vendor: 'appcues',
	vendorDetails: {
		homepageUrl: 'https://www.appcues.com/',
		legalName: 'Appcues, Inc.',
		name: 'Appcues',
		privacyPolicyUrl: 'https://www.appcues.com/privacy',
	},
} as const satisfies VendorManifest;

export interface AppcuesOptions {
	/** Account ID from the Appcues installation snippet. */
	accountId: string;
	/** Data region for the account. @default 'us' */
	region?: 'us' | 'eu';
	/** JSON-serializable Appcues settings. @default { enableURLDetection: true } */
	settings?: Record<string, unknown>;
	/** Custom or proxied account loader URL. */
	scriptUrl?: string;
	/**
	 * Runs synchronously once the account loader exposes Appcues, with consent.
	 * Read the current visitor here before calling identify, group or track.
	 * Revoked or removed loaders do not notify; a new grant can notify again.
	 */
	onReady?: () => void;
}

/**
 * Loads Appcues after experience consent and resets its user on revocation.
 *
 * Keep `reloadOnConsentRevoked` enabled. Reset clears user state but does not
 * stop all SDK listeners or cancel a script download already in flight.
 *
 * @param options - Account, data region and SDK settings.
 * @returns A consent-gated Appcues script, or a skipped script for a blank ID.
 * @example
 * appcues({ accountId: 'YOUR_APPCUES_ID' });
 * @see https://docs.appcues.com/install-appcues-web/install-the-appcues-sdk
 */
export const appcues = function appcues(options: AppcuesOptions): Script {
	const accountId = readId(options?.accountId);
	if (accountId === undefined) {
		return skipMissingId('appcues', 'accountId', {
			category: 'experience',
			manifest: appcuesManifest,
		});
	}
	const domain =
		options.region === 'eu' ? 'fast.eu.appcues.com' : 'fast.appcues.com';
	const script = resolveManifest(appcuesManifest, {
		scriptUrl: resolveScriptUrl(
			options.scriptUrl,
			`https://${domain}/${encodeURIComponent(accountId)}.js`
		),
		settings: { enableURLDetection: true, ...options.settings },
	});
	const { onReady } = options;
	if (onReady) {
		const { onLoad } = script;
		// Core checks current consent and ignores detached loader completions.
		// Keep visitor callbacks out of the cached manifest and global queues.
		script.onLoad = (info) => {
			onLoad?.(info);
			if (info.hasConsent && window.Appcues) {
				onReady();
			}
		};
	}
	return script;
};
