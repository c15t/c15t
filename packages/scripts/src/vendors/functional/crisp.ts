import type { Script } from 'c15t';
import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';

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
	vendor: 'crisp',
	category: 'functionality',
	install: [
		{
			type: 'setGlobal',
			name: '$crisp',
			value: [],
			ifUndefined: false,
		},
		{
			type: 'setGlobal',
			name: 'CRISP_WEBSITE_ID',
			value: '{{websiteId}}',
			ifUndefined: false,
		},
		{
			type: 'loadScript',
			src: '{{scriptSrc}}',
			async: true,
		},
	],
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

function createCrispManifest(options: CrispOptions): VendorManifest {
	const install: VendorManifest['install'] = [
		{
			type: 'setGlobal',
			name: '$crisp',
			value: [],
			ifUndefined: false,
		},
		{
			type: 'setGlobal',
			name: 'CRISP_WEBSITE_ID',
			value: '{{websiteId}}',
			ifUndefined: false,
		},
	];

	if (options.locale || options.sessionMerge) {
		install.push({
			type: 'setGlobal',
			name: 'CRISP_RUNTIME_CONFIG',
			value: {
				...(options.locale ? { locale: '{{locale}}' } : {}),
				...(options.sessionMerge ? { session_merge: '{{sessionMerge}}' } : {}),
			},
			ifUndefined: false,
		});
	}

	if (options.cookieDomain) {
		install.push({
			type: 'setGlobal',
			name: 'CRISP_COOKIE_DOMAIN',
			value: '{{cookieDomain}}',
			ifUndefined: false,
		});
	}

	if (options.cookieExpiry !== undefined) {
		install.push({
			type: 'setGlobal',
			name: 'CRISP_COOKIE_EXPIRE',
			value: '{{cookieExpiry}}',
			ifUndefined: false,
		});
	}

	if (options.tokenId) {
		install.push({
			type: 'setGlobal',
			name: 'CRISP_TOKEN_ID',
			value: '{{tokenId}}',
			ifUndefined: false,
		});
	}

	if (options.safeMode) {
		install.push({
			type: 'pushToQueue',
			queue: '$crisp',
			value: ['safe', true],
		});
	}

	install.push({
		type: 'loadScript',
		src: '{{scriptSrc}}',
		async: true,
	});

	return {
		...crispManifest,
		install,
	};
}

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
export function crisp(options: CrispOptions): Script {
	return resolveManifest(createCrispManifest(options), {
		websiteId: options.websiteId,
		locale: options.locale,
		cookieDomain: options.cookieDomain,
		cookieExpiry: options.cookieExpiry,
		tokenId: options.tokenId,
		sessionMerge: options.sessionMerge,
		scriptSrc: options.scriptSrc ?? 'https://client.crisp.chat/l.js',
	});
}
