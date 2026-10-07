/**
 * `@c15t/browser/hosted`: the hosted client and stock UI.
 */
import { createHostedConsentClient } from './hosted-client';
import type { ConsentClient, HostedConsentClientOptions } from './types';
import { mountConsentUI } from './ui/mount';

/**
 * Create a hosted client without starting it.
 *
 * @param options - Hosted client options.
 * @returns The client. Call `start()` to resolve the policy and mount.
 * @throws {Error} When options require another bundle.
 */
export const createConsentClient = function createConsentClient(
	options: HostedConsentClientOptions = {}
): ConsentClient {
	return createHostedConsentClient(options, {
		mountUI: mountConsentUI,
		pkg: '@c15t/browser/hosted',
	});
};

/**
 * Create and start a hosted client, mounting the UI unless `ui: false`.
 *
 * @param options - Hosted client options.
 * @returns The started client.
 * @throws {Error} When options require another bundle.
 */
export const init = function init(
	options: HostedConsentClientOptions = {}
): ConsentClient {
	const client = createConsentClient(options);
	client.start();
	return client;
};

export { ACTION_ATTRIBUTE, PREFERENCES_HASH } from './client-base';
export type { PageAction } from './client-base';
export {
	ACTIVATED_ATTRIBUTE,
	activateGatedScripts,
	CATEGORY_ATTRIBUTE,
} from './gated-scripts';
export { hosted } from '@c15t/core';
export type { HostedModeOptions } from '@c15t/core';
export type {
	ConsentBannerOptions,
	ConsentClient,
	ConsentClientEventMap,
	ConsentDialogOptions,
	HostedConsentClientOptions,
	ConsentSaveInput,
	ConsentTriggerOptions,
	ConsentUIHandle,
	ConsentUIOptions,
	TriggerPosition,
} from './types';
export { mountConsentUI } from './ui/mount';
export { version } from './version';
export type {
	ConsentSnapshot,
	ConsentState,
	ResolvedVendor,
	Vendor,
	VendorChoice,
} from '@c15t/core';
