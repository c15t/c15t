/** Optional browser entry with the CMP, TC codec, and IAB preference UI. */
import { createIAB, initializeIABStub, destroyIABStub } from '@c15t/iab';

import { createConsentClient as createClient } from './client';
import { mountIABConsentUI } from './iab/mount';
import type { ConsentClient, ConsentClientOptions } from './types';

/**
 * Create an IAB-capable browser client without starting it.
 * @param options - Transport, CMP, and presentation settings.
 * @returns The client, with one runtime shared by ordinary and IAB UI.
 */
export const createConsentClient = (
	options: ConsentClientOptions = {}
): ConsentClient =>
	createClient(options, {
		createIAB,
		mountUI: mountIABConsentUI,
		onStart: () => {
			if (options.iab !== false && options.iab?.enabled !== false) {
				initializeIABStub();
			}
			return destroyIABStub;
		},
		pkg: '@c15t/browser/iab',
	});

/**
 * Create and start an IAB-capable browser client.
 * @param options - Transport, CMP, and presentation settings.
 * @returns The started client. CMP controls are on `client.runtime.iab`.
 */
export const init = (options: ConsentClientOptions = {}): ConsentClient => {
	const client = createConsentClient(options);
	client.start();
	return client;
};

export { custom, hosted } from './client';
export { offline } from './transports/offline';
export { manifest } from './transports/manifest';
export { mountIABConsentUI } from './iab/mount';
export type {
	ConsentClient,
	ConsentClientOptions,
	ConsentUIOptions,
} from './types';
export { iab } from '@c15t/iab';
export { version } from './version';
