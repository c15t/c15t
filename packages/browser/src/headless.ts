/**
 * `@c15t/browser/headless` — the client without any UI or CSS.
 *
 * For sites that render their own banner: subscribe to the client, call
 * `acceptAll()` / `rejectAll()` / `save()`, or mark page elements with
 * `data-c15t-action` and let the client wire them.
 *
 * @example
 * ```ts
 * import { init } from '@c15t/browser/headless';
 *
 * const c15t = init({ backendURL: 'https://your-instance.c15t.dev' });
 * c15t.on('ui', (surface) => banner.hidden = surface !== 'banner');
 * ```
 */

import { createConsentClient as createClient } from './client';
import type { ConsentClient, ConsentClientOptions } from './types';

const PKG = '@c15t/browser/headless';

/**
 * Create the page's client without starting it. `mountUI()` throws.
 *
 * @param options - Client options.
 * @returns The client.
 */
export const createConsentClient = function createConsentClient(
	options: ConsentClientOptions = {}
): ConsentClient {
	return createClient({ ...options, ui: false }, { pkg: PKG });
};

/**
 * Create and start the page's client with no UI.
 *
 * @param options - Client options.
 * @returns The started client.
 */
export const init = function init(
	options: ConsentClientOptions = {}
): ConsentClient {
	const client = createConsentClient(options);
	client.start();
	return client;
};

export { ACTION_ATTRIBUTE, custom, hosted, PREFERENCES_HASH } from './client';
export type { PageAction } from './client';
export { resolveRules } from './client';
export {
	ACTIVATED_ATTRIBUTE,
	activateGatedScripts,
	CATEGORY_ATTRIBUTE,
} from './gated-scripts';
export { manifest, manifestNeedsLocation } from './transports/manifest';
export type { ManifestModeOptions } from './transports/manifest';
export { offline } from './transports/offline';
export type { OfflineModeOptions } from './transports/offline';
export type {
	ConsentClient,
	ConsentClientEventMap,
	ConsentClientOptions,
	ConsentModeName,
	PolicyPresetName,
} from './types';
export { version } from './version';
export type { ConsentSnapshot, ConsentState } from '@c15t/core';
