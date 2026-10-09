/**
 * `@c15t/browser` — consent for sites without a build step.
 *
 * Most sites load `dist/c15t.js` from a CDN and never import this module.
 * This ES module takes the transport as a factory, `manifest()`, `hosted()`
 * or `offline()`, so a bundler keeps only the mode the page uses. The
 * headless subset lives at `@c15t/browser/headless`.
 *
 * @example
 * ```ts
 * import { init, manifest } from '@c15t/browser';
 * import '@c15t/browser/styles.css'; // only with `ui: { shadow: false }`
 *
 * // The policy and backend URL consentManifest() from c15t/build downloaded.
 * const c15t = init({ mode: manifest() });
 * c15t.on('consent', (snapshot) => console.log(snapshot.effectivePermissions));
 * ```
 */

import { createConsentClient as createClient } from './client';
import type { ConsentClient, ConsentClientOptions } from './types';
import { mountConsentUI } from './ui/mount';

const PKG = '@c15t/browser';

/**
 * Create the page's client without starting it.
 *
 * @param options - Client options.
 * @returns The client. Call `start()` to resolve the policy and mount.
 */
export const createConsentClient = function createConsentClient(
	options: ConsentClientOptions
): ConsentClient {
	return createClient(options, { mountUI: mountConsentUI, pkg: PKG });
};

/**
 * Create and start the page's client, mounting the UI unless `ui: false`.
 *
 * @param options - Client options.
 * @returns The started client.
 */
export const init = function init(
	options: ConsentClientOptions
): ConsentClient {
	const client = createConsentClient(options);
	client.start();
	return client;
};

export { custom } from '@c15t/core';
export { ACTION_ATTRIBUTE, PREFERENCES_HASH } from './client';
export type { PageAction } from './client';
export { resolveRules } from './policy-rules';
export { hosted } from './transports/hosted';
export type { HostedOptions } from './transports/hosted';
export {
	ACTIVATED_ATTRIBUTE,
	activateGatedScripts,
	CATEGORY_ATTRIBUTE,
} from './gated-scripts';
export { manifest, manifestNeedsLocation } from './transports/manifest';
export type {
	BrowserManifestModeFactory,
	ManifestModeOptions,
} from './transports/manifest';
export { offline } from './transports/offline';
export type { OfflineModeOptions } from './transports/offline';
export type {
	ConsentBannerOptions,
	ConsentClient,
	ConsentClientEventMap,
	ConsentClientBaseOptions,
	ConsentClientOptions,
	ConsentModeName,
	ScriptTagClientOptions,
	ConsentDialogOptions,
	ConsentSaveInput,
	PolicyPresetName,
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
