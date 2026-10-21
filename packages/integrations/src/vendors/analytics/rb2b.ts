import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId, skipScript } from '../_shared/required-id';
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
		{
			ifGlobalIsQueue: true,
			path: ['reb2b', 'invoked'],
			type: 'setGlobalPath',
			value: true,
		},
		{
			ifGlobalIsQueue: true,
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
	/** HTTPS CloudFront or S3 URL with accountKey after its supported base path. */
	scriptUrl?: string;
}

const supportedScriptPrefixes = [
	'https://ddwl4m2hdecbv.cloudfront.net/b/',
	'https://s3-us-west-2.amazonaws.com/b2bjsstore/b/',
	'https://b2bjsstore.s3.us-west-2.amazonaws.com/b/',
];

const isSupportedScriptUrl = function isSupportedScriptUrl(
	scriptUrl: string,
	accountKey: string
): boolean {
	try {
		const normalized = new URL(scriptUrl);
		const prefix = supportedScriptPrefixes.find((supportedPrefix) =>
			normalized.href.startsWith(supportedPrefix)
		);
		if (prefix === undefined) {
			return false;
		}
		const accountPath = normalized.pathname.slice(
			new URL(prefix).pathname.length
		);
		const segmentEnd = accountPath.indexOf('/');
		return (
			segmentEnd > 0 &&
			decodeURIComponent(accountPath.slice(0, segmentEnd)) === accountKey
		);
	} catch {
		return false;
	}
};

/**
 * Loads RB2B after marketing consent, once per page.
 * @param options - Public account key and optional loader URL.
 * @returns A gated script, or a skipped script for an invalid key or loader URL.
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
	const scriptUrl = resolveScriptUrl(
		trimToUndefined(options.scriptUrl),
		`https://ddwl4m2hdecbv.cloudfront.net/b/${key}/${key}.js.gz`
	);
	if (!isSupportedScriptUrl(scriptUrl, accountKey)) {
		return skipScript(
			'rb2b: scriptUrl must use a supported HTTPS CloudFront or S3 prefix and /b/<accountKey>/ path',
			{ category: 'marketing', manifest: rb2bManifest }
		);
	}
	return resolveManifest(rb2bManifest, {
		scriptUrl,
	});
};
