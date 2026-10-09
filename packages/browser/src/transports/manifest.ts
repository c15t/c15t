/**
 * The browser manifest mode. The resolver lives in
 * `@c15t/core/transports/manifest-browser`, shared with every adapter that
 * resolves a manifest in the browser.
 */
// oxlint-disable-next-line oxc/no-barrel-file -- The public `manifest` export of @c15t/browser.
export {
	manifest,
	manifestNeedsLocation,
} from '@c15t/core/transports/manifest-browser';
export type {
	BrowserManifestModeFactory,
	BrowserManifestOptions as ManifestModeOptions,
} from '@c15t/core/transports/manifest-browser';
