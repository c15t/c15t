import type { Script } from 'c15t';
import { resolveManifest } from './resolve';
import { type VendorManifest, vendorManifestContract } from './types';

// Extended Window interface to include microsoft uet specific properties
declare global {
	interface Window {
		uetq: unknown[] | undefined;
	}
}

/**
 * Microsoft UET vendor manifest.
 *
 * Uses structured startup steps and manages consent via the UET push API:
 * `window.uetq.push('consent', 'default'|'update', { ad_storage: 'granted'|'denied' })`
 */
export const microsoftUetManifest = {
	...vendorManifestContract,
	vendor: 'microsoft-uet',
	category: 'marketing',
	persistAfterConsentRevoked: true,
	bootstrap: [
		{
			type: 'setGlobal',
			name: 'uetq',
			value: [],
			ifUndefined: true,
		},
	],
	install: [
		{
			type: 'loadScript',
			src: '{{scriptSrc}}',
			async: true,
		},
	],
	afterLoad: [
		{
			type: 'constructGlobal',
			constructor: 'UET',
			assignTo: 'uetq',
			args: [
				{
					ti: '{{id}}',
					enableAutoSpaTracking: true,
				},
			],
			copyAssignedValueToArgProperty: 'q',
		},
		{
			type: 'callGlobal',
			global: 'uetq',
			method: 'push',
			args: ['pageLoad'],
		},
		{
			type: 'callGlobal',
			global: 'uetq',
			method: 'push',
			args: ['consent', 'default', { ad_storage: 'granted' }],
		},
	],
	onConsentGranted: [
		{
			type: 'callGlobal',
			global: 'uetq',
			method: 'push',
			args: ['consent', 'update', { ad_storage: 'granted' }],
		},
	],
	onConsentDenied: [
		{
			type: 'callGlobal',
			global: 'uetq',
			method: 'push',
			args: ['consent', 'update', { ad_storage: 'denied' }],
		},
	],
} as const satisfies VendorManifest;

export interface MicrosoftUetOptions {
	/**
	 * Your Microsoft UET ID
	 * @example `123456789012345`
	 */
	id: string;

	/** Microsoft UET loader URL. */
	scriptSrc?: string;
}

/**
 * Microsoft UET Script
 * This script is persistent after consent is revoked because it has built-in functionality to opt into and out of tracking based on consent, which allows us to not need to load the script again when consent is revoked.
 *
 * @param options - The options for the Microsoft UET script
 * @returns The Microsoft UET script configuration
 *
 * @example
 * ```ts
 * const microsoftUetScript = microsoftUet({
 *   id: '123456789012345',
 * });
 * ```
 *
 * @see https://learn.microsoft.com/en-us/advertising/guides/universal-event-tracking?view=bingads-13
 */
export function microsoftUet({ id, scriptSrc }: MicrosoftUetOptions): Script {
	const resolved = resolveManifest(microsoftUetManifest, {
		id,
		scriptSrc: scriptSrc ?? '//bat.bing.com/bat.js',
	});

	return resolved;
}
