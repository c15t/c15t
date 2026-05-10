import type { Script } from 'c15t';
import { resolveManifest } from './resolve';
import { type VendorManifest, vendorManifestContract } from './types';

export interface UsercentricsCmp {
	showFirstLayer?: () => Promise<void>;
	showSecondLayer?: () => Promise<void>;
	acceptAllConsents?: () => Promise<void>;
	denyAllConsents?: () => Promise<void>;
	[key: string]: unknown;
}

declare global {
	interface Window {
		__ucCmp?: UsercentricsCmp;
	}
}

const usercentricsManifestBase = {
	...vendorManifestContract,
	vendor: 'usercentrics',
	category: 'necessary',
	alwaysLoad: true,
	install: [
		{
			type: 'loadScript',
			src: '{{scriptSrc}}',
			async: true,
			attributes: {
				id: 'usercentrics-cmp',
				'data-ruleset-id': '{{rulesetId}}',
			},
		},
	],
} as const satisfies VendorManifest;

const usercentricsManifestWithLanguage = {
	...vendorManifestContract,
	vendor: 'usercentrics',
	category: 'necessary',
	alwaysLoad: true,
	install: [
		{
			type: 'loadScript',
			src: '{{scriptSrc}}',
			async: true,
			attributes: {
				id: 'usercentrics-cmp',
				'data-ruleset-id': '{{rulesetId}}',
				'data-language': '{{language}}',
			},
		},
	],
} as const satisfies VendorManifest;

export interface UsercentricsOptions {
	/**
	 * Your Usercentrics CMP v3 ruleset ID.
	 */
	rulesetId: string;

	/**
	 * Optional language override for the CMP UI.
	 */
	language?: string;

	/** Full Usercentrics loader URL override. */
	scriptSrc?: string;
}

/**
 * Creates a Usercentrics script.
 *
 * This helper models the core CMP loader only. The optional autoblocker script
 * is intentionally omitted because a single c15t helper can only express one
 * external `loadScript` step.
 *
 * @param options - The options for the Usercentrics script
 * @returns The Usercentrics script configuration
 */
export function usercentrics({
	rulesetId,
	language,
	scriptSrc,
}: UsercentricsOptions): Script {
	let resolvedScriptSrc = scriptSrc;

	if (!resolvedScriptSrc) {
		resolvedScriptSrc = 'https://web.cmp.usercentrics.eu/ui/loader.js';
	}

	let manifest = usercentricsManifestBase;

	if (language) {
		manifest = usercentricsManifestWithLanguage;
	}

	const resolved = resolveManifest(manifest, {
		rulesetId,
		language,
		scriptSrc: resolvedScriptSrc,
	});

	return resolved;
}
