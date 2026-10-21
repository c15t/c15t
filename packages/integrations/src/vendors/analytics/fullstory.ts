import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import { createScriptReuse } from '../_shared/reuse-script';
import { resolveScriptUrl, trimToUndefined } from '../_shared/script-url';

/** Six-field queue entry for FullStory's synchronous v2 calls. */
export type FullStoryCall = [
	string,
	unknown,
	unknown,
	unknown,
	unknown,
	number,
];
/** Callable namespace for synchronous v2 controls; the SDK attaches _api. */
export interface FullStoryApi {
	(
		command: string,
		argument?: unknown,
		source?: unknown,
		version?: number
	): unknown;
	q?: FullStoryCall[];
	_api?: (...args: FullStoryCall) => unknown;
	_v?: string;
	_w?: { fetch?: typeof fetch; XMLHttpRequest: typeof XMLHttpRequest };
}
declare global {
	interface Window {
		FS?: FullStoryApi;
		_fs_org?: string;
		_fs_host?: string;
		_fs_script?: string;
		_fs_capture_on_startup?: boolean;
		_fs_namespace?: string;
	}
}

/** FullStory loader metadata. Bootstrap waits for the mapped consent. */
export const fullStoryManifest = {
	...vendorManifestContract,
	category: 'measurement',
	install: [
		{
			async: true,
			attributes: { crossorigin: 'anonymous', 'data-fs-namespace': 'FS' },
			src: '{{scriptUrl}}',
			type: 'loadScript',
		},
	],
	persistAfterConsentRevoked: true,
	vendor: 'fullstory',
	vendorDetails: {
		homepageUrl: 'https://www.fullstory.com/',
		legalName: 'FullStory, Inc.',
		name: 'FullStory',
		privacyPolicyUrl: 'https://www.fullstory.com/legal/privacy-policy/',
	},
} as const satisfies VendorManifest;

export interface FullStoryOptions {
	/** Organization ID supplied by FullStory. */
	orgId: string;
	/** FullStory host, including regional deployments. @default 'fullstory.com' */
	host?: string;
	/** Script host/path without a scheme. @default 'edge.fullstory.com/s/fs.js' */
	script?: string;
	/** Consent for elements configured as capture with consent. @default false */
	elementConsent?: boolean;
	/** Consent condition required before loading. @default 'measurement' */
	category?: Script['category'];
	/** Exact loader URL override. Blank values use the vendor URL. */
	scriptUrl?: string;
}

const reuseFullStory = createScriptReuse<FullStoryOptions>();

const createFullStory = function createFullStory(
	options: FullStoryOptions
): Script {
	const category = options?.category ?? 'measurement';
	const orgId = readId(options?.orgId);
	if (!orgId) {
		return skipMissingId('fullStory', 'orgId', {
			category,
			manifest: fullStoryManifest,
		});
	}
	const host = trimToUndefined(options.host) ?? 'fullstory.com';
	const scriptPath =
		trimToUndefined(options.script) ?? 'edge.fullstory.com/s/fs.js';
	const script = resolveManifest(fullStoryManifest, {
		scriptUrl: resolveScriptUrl(
			options.scriptUrl,
			`https://${scriptPath}?org=${encodeURIComponent(orgId)}`
		),
	});
	let hasConsent = false;
	let started = false;
	let loaded = false;
	let appliedConsent: boolean | undefined;
	const applyConsent = (): void => {
		if (!loaded || appliedConsent === hasConsent) {
			return;
		}
		const api = window.FS;
		if (!api) {
			throw new Error('fullStory: loader did not install the FS API');
		}
		api('setIdentity', {
			consent: hasConsent && (options.elementConsent ?? false),
		});
		if (hasConsent) {
			api(started ? 'restart' : 'start');
			started = true;
		} else {
			api('shutdown');
		}
		appliedConsent = hasConsent;
	};
	return {
		...script,
		category,
		onBeforeLoad({ hasConsent: consent }) {
			hasConsent = consent;
			if (!hasConsent) {
				return;
			}
			if (window.FS) {
				return;
			}
			window._fs_org = orgId;
			window._fs_host = host;
			window._fs_script = scriptPath;
			window._fs_capture_on_startup = false;
			window._fs_namespace = 'FS';
			const api: FullStoryApi = (command, argument, source, version = 2) => {
				if (api._api) {
					return api._api(
						command,
						argument,
						source,
						undefined,
						undefined,
						version
					);
				}
				api.q?.push([command, argument, source, undefined, undefined, version]);
			};
			api.q = [];
			api._v = '2.1.0';
			api._w = { XMLHttpRequest: window.XMLHttpRequest, fetch: window.fetch };
			if (window.fetch) {
				window.fetch = Object.assign(function instrumentedFetch(
					this: Window,
					...args: Parameters<typeof window.fetch>
				): Promise<Response> {
					return (api._w as { fetch: typeof fetch }).fetch.apply(this, args);
				}, window.fetch);
			}
			window.FS = api;
			api('init', {
				env: { captureOnStartup: false, host, orgId, script: scriptPath },
			});
		},
		onConsentChange({ hasConsent: consent }) {
			hasConsent = consent;
			applyConsent();
		},
		onDispose() {
			hasConsent = false;
			applyConsent();
			loaded = false;
		},
		onLoad({ element, hasConsent: consent }) {
			if (!element?.isConnected) {
				return;
			}
			hasConsent = consent;
			loaded = true;
			applyConsent();
		},
	};
};

/**
 * Starts FullStory after consent and shuts down capture on revoke.
 * Capture is always disabled at initialization, including in-flight revocation.
 * @param options - FullStory organization, endpoint and element consent.
 * @returns A gated script, or an inactive script for a missing organization ID.
 * @example fullStory({ orgId: 'YOUR_ORG_ID' });
 * @see https://developer.fullstory.com/browser/getting-started/
 */
export const fullStory = function fullStory(options: FullStoryOptions): Script {
	if (!readId(options?.orgId)) {
		return skipMissingId('fullStory', 'orgId', {
			category: options?.category ?? 'measurement',
			manifest: fullStoryManifest,
		});
	}
	return reuseFullStory(options, createFullStory);
};
