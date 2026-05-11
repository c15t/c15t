import type { Script } from 'c15t';
import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';

// Extended Window interface to include microsoft uet specific properties
declare global {
	interface Window {
		uetq: unknown[] | undefined;
	}
}

/**
 * Microsoft UET vendor manifest.
 *
 * Loads in consent mode and manages consent via the UET push API:
 * `window.uetq.push('consent', 'default'|'update', consentState)`.
 */
export const microsoftUetManifest = {
	...vendorManifestContract,
	vendor: 'microsoft-uet',
	category: 'marketing',
	alwaysLoad: true,
	persistAfterConsentRevoked: true,
	bootstrap: [
		{
			type: 'setGlobal',
			name: 'uetq',
			value: [],
			ifUndefined: true,
		},
	],
	onBeforeLoadGranted: [
		{
			type: 'callGlobal',
			global: 'uetq',
			method: 'push',
			args: ['consent', 'default', { ad_storage: 'granted' }],
		},
	],
	onBeforeLoadDenied: [
		{
			type: 'callGlobal',
			global: 'uetq',
			method: 'push',
			args: ['consent', 'default', { ad_storage: 'denied' }],
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
 * This script loads in consent mode and stays persistent because UET can opt
 * into and out of tracking based on consent.
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
