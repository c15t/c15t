import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';

declare global {
	interface Window {
		$crisp: unknown[][];
		CRISP_WEBSITE_ID: string;
		CRISP_RUNTIME_CONFIG?: {
			locale?: string;
			session_merge?: boolean;
		};
		CRISP_COOKIE_DOMAIN?: string;
		CRISP_COOKIE_EXPIRE?: number;
		CRISP_TOKEN_ID?: string;
	}
}

/**
 * Crisp vendor manifest.
 *
 * Seeds the Crisp queue and website ID before loading the chat client.
 * Optional runtime globals are added when provided by the helper options.
 */
export const crispManifest = {
	...vendorManifestContract,
	category: 'functionality',
	install: [
		{
			ifUndefined: false,
			name: '$crisp',
			type: 'setGlobal',
			value: [],
		},
		{
			ifUndefined: false,
			name: 'CRISP_WEBSITE_ID',
			type: 'setGlobal',
			value: '{{websiteId}}',
		},
		{
			async: true,
			src: '{{scriptSrc}}',
			type: 'loadScript',
		},
	],
	vendor: 'crisp',
} as const satisfies VendorManifest;

export interface CrispOptions {
	/** Your Crisp website ID. */
	websiteId: string;

	/** Optional locale passed through `window.CRISP_RUNTIME_CONFIG`. */
	locale?: string;

	/** Optional cookie domain override for Crisp. */
	cookieDomain?: string;

	/** Optional cookie expiration in seconds. */
	cookieExpiry?: number;

	/** Optional Crisp token ID for session continuity. */
	tokenId?: string;

	/** Whether to merge anonymous sessions into token-backed sessions. */
	sessionMerge?: boolean;

	/** Whether to enable `$crisp` safe mode before other queued calls. */
	safeMode?: boolean;

	/** Crisp loader URL. */
	scriptSrc?: string;
}

const createCrispManifest = function createCrispManifest(
	options: CrispOptions
): VendorManifest {
	const install: VendorManifest['install'] = [
		{
			ifUndefined: false,
			name: '$crisp',
			type: 'setGlobal',
			value: [],
		},
		{
			ifUndefined: false,
			name: 'CRISP_WEBSITE_ID',
			type: 'setGlobal',
			value: '{{websiteId}}',
		},
	];

	if (options.locale !== undefined || options.sessionMerge !== undefined) {
		const value: { locale?: string; session_merge?: string } = {};
		if (options.locale !== undefined) {
			value.locale = '{{locale}}';
		}
		if (options.sessionMerge !== undefined) {
			value.session_merge = '{{sessionMerge}}';
		}

		install.push({
			ifUndefined: false,
			name: 'CRISP_RUNTIME_CONFIG',
			type: 'setGlobal',
			value,
		});
	}

	if (options.cookieDomain) {
		install.push({
			ifUndefined: false,
			name: 'CRISP_COOKIE_DOMAIN',
			type: 'setGlobal',
			value: '{{cookieDomain}}',
		});
	}

	if (options.cookieExpiry !== undefined) {
		install.push({
			ifUndefined: false,
			name: 'CRISP_COOKIE_EXPIRE',
			type: 'setGlobal',
			value: '{{cookieExpiry}}',
		});
	}

	if (options.tokenId) {
		install.push({
			ifUndefined: false,
			name: 'CRISP_TOKEN_ID',
			type: 'setGlobal',
			value: '{{tokenId}}',
		});
	}

	if (options.safeMode) {
		install.push({
			queue: '$crisp',
			type: 'pushToQueue',
			value: ['safe', true],
		});
	}

	install.push({
		async: true,
		src: '{{scriptSrc}}',
		type: 'loadScript',
	});

	return {
		...crispManifest,
		install,
	};
};

/**
 * Creates a Crisp chat script.
 *
 * This manifest-based helper keeps the serializable queue/bootstrap globals and
 * omits the upstream ready callback wrapper.
 *
 * @param options - The options for the Crisp script.
 * @returns The Crisp script configuration.
 *
 * @example
 * ```ts
 * const crispScript = crisp({
 * 	websiteId: '1234-abcd',
 * });
 * ```
 *
 * @see {@link https://help.crisp.chat/en/article/how-do-i-install-crisp-live-chat-on-my-website-10wcj3l/} Crisp installation documentation.
 */
export const crisp = function crisp(options: CrispOptions): Script {
	return resolveManifest(createCrispManifest(options), {
		cookieDomain: options.cookieDomain,
		cookieExpiry: options.cookieExpiry,
		locale: options.locale,
		scriptSrc: options.scriptSrc ?? 'https://client.crisp.chat/l.js',
		sessionMerge: options.sessionMerge,
		tokenId: options.tokenId,
		websiteId: options.websiteId,
	});
};
