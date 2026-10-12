/**
 * `@c15t/browser/offline`: the offline client and stock UI.
 */
import { createOfflineConsentClient } from './offline-client';
import type { ConsentClient, OfflineConsentClientOptions } from './types';
import { mountConsentUI } from './ui/mount';

/**
 * Create a offline client without starting it.
 *
 * @param options - Offline client options.
 * @returns The client. Call `start()` to resolve the policy and mount.
 * @throws {Error} When options require another bundle.
 */
export const createConsentClient = function createConsentClient(
	options: OfflineConsentClientOptions = {}
): ConsentClient {
	return createOfflineConsentClient(options, {
		mountUI: mountConsentUI,
		pkg: '@c15t/browser/offline',
	});
};

/**
 * Create and start a offline client, mounting the UI unless `ui: false`.
 *
 * @param options - Offline client options.
 * @returns The started client.
 * @throws {Error} When options require another bundle.
 */
export const init = function init(
	options: OfflineConsentClientOptions = {}
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
export { offline } from './transports/offline';
export type { OfflineModeOptions } from './transports/offline';
export { resolveRules } from './policy-rules';
export type {
	ConsentBannerOptions,
	ConsentClient,
	ConsentClientEventMap,
	ConsentDialogOptions,
	OfflineConsentClientOptions,
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
export type { PolicyPresetName } from './types';
