import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import { resolveScriptUrl, trimToUndefined } from '../_shared/script-url';

interface Rb2bQueue extends Array<unknown[]> {
	identify?: (...args: unknown[]) => void;
	collect?: (...args: unknown[]) => void;
	invoked?: boolean;
	SNIPPET_VERSION?: string;
}
declare global {
	interface Window {
		reb2b?: Rb2bQueue;
	}
}

/** RB2B's consent-gated installation queue and account loader. */
export const rb2bManifest = {
	...vendorManifestContract,
	bootstrap: [
		{ name: 'reb2b', type: 'setGlobal', value: [] },
		{
			methods: ['identify', 'collect'],
			preserveExisting: true,
			target: 'reb2b',
			type: 'defineQueueMethods',
		},
		{ path: ['reb2b', 'invoked'], type: 'setGlobalPath', value: true },
		{
			path: ['reb2b', 'SNIPPET_VERSION'],
			type: 'setGlobalPath',
			value: '1.0.1',
		},
	],
	category: 'marketing',
	install: [{ async: true, src: '{{scriptUrl}}', type: 'loadScript' }],
	persistAfterConsentRevoked: true,
	vendor: 'rb2b',
	vendorDetails: {
		homepageUrl: 'https://www.rb2b.com/',
		legalName: 'GetEmails, LLC',
		name: 'RB2B',
		privacyPolicyUrl: 'https://www.rb2b.com/privacy-policy',
	},
} as const satisfies VendorManifest;

/** Public RB2B account configuration. */
export interface Rb2bOptions {
	/** Account key in reb2b.load on the Script Setup page. */
	accountKey: string;
	/** Override URL. Preserve the vendor's accepted host and /b/<key>/ path. */
	scriptUrl?: string;
}

/**
 * Loads RB2B after marketing consent, once per page.
 * @param options - Public account key and optional loader URL.
 * @returns A gated script, or a skipped script for an invalid account key.
 * @remarks RB2B has no documented stop API. Keep reload on revocation enabled.
 * @example rb2b({ accountKey: 'YOUR_RB2B_KEY' });
 * @see https://support.rb2b.com/en/articles/9503690-rb2b-install-guide-for-typescript
 */
export const rb2b = function rb2b(options: Rb2bOptions): Script {
	const accountKey = readId(
		typeof options?.accountKey === 'string' ? options.accountKey : undefined
	);
	if (accountKey === undefined) {
		return skipMissingId('rb2b', 'accountKey', {
			category: 'marketing',
			manifest: rb2bManifest,
		});
	}
	const key = encodeURIComponent(accountKey);
	return resolveManifest(rb2bManifest, {
		scriptUrl: resolveScriptUrl(
			trimToUndefined(options.scriptUrl),
			`https://ddwl4m2hdecbv.cloudfront.net/b/${key}/${key}.js.gz`
		),
	});
};
