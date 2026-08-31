import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';

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
	afterLoad: [
		{
			args: [
				{
					enableAutoSpaTracking: true,

					ti: '{{id}}',
				},
			],
			assignTo: 'uetq',
			constructor: 'UET',
			copyAssignedValueToArgProperty: 'q',

			type: 'constructGlobal',
		},
		{
			args: ['pageLoad'],

			global: 'uetq',
			method: 'push',
			type: 'callGlobal',
		},
	],
	alwaysLoad: true,
	bootstrap: [
		{
			ifUndefined: true,

			name: 'uetq',
			type: 'setGlobal',
			value: [],
		},
	],
	category: 'marketing',
	install: [
		{
			async: true,

			src: '{{scriptSrc}}',
			type: 'loadScript',
		},
	],
	onBeforeLoadDenied: [
		{
			args: ['consent', 'default', { ad_storage: 'denied' }],

			global: 'uetq',
			method: 'push',
			type: 'callGlobal',
		},
	],
	onBeforeLoadGranted: [
		{
			args: ['consent', 'default', { ad_storage: 'granted' }],

			global: 'uetq',
			method: 'push',
			type: 'callGlobal',
		},
	],
	onConsentDenied: [
		{
			args: ['consent', 'update', { ad_storage: 'denied' }],

			global: 'uetq',
			method: 'push',
			type: 'callGlobal',
		},
	],
	onConsentGranted: [
		{
			args: ['consent', 'update', { ad_storage: 'granted' }],

			global: 'uetq',
			method: 'push',
			type: 'callGlobal',
		},
	],
	persistAfterConsentRevoked: true,
	vendor: 'microsoft-uet',
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
export const microsoftUet = function microsoftUet({
	id,
	scriptSrc,
}: MicrosoftUetOptions): Script {
	const resolved = resolveManifest(microsoftUetManifest, {
		id,
		scriptSrc: scriptSrc ?? '//bat.bing.com/bat.js',
	});

	return resolved;
};
