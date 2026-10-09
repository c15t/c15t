/**
 * `c15t/astro/components`: the consent components, by name.
 *
 * ```astro
 * ---
 * import {
 * 	ConsentBanner,
 * 	ConsentDialog,
 * 	ConsentDialogLink,
 * 	ConsentScript,
 * } from 'c15t/astro/components';
 * ---
 * ```
 *
 * Shipped as source: Astro compiles the `.astro` files it re-exports.
 *
 * `ConsentBannerDeferred` is not here. It renders a server island, and
 * Astro refuses to build a module with one on a site without an adapter,
 * even when no page renders it. Import it from
 * `c15t/astro/components/consent-banner-deferred.astro`.
 */

export { default as ConsentBanner } from './prompt.astro';
export { default as ConsentDialog } from './panel.astro';
export { default as ConsentDialogLink } from './panel-link.astro';
export { default as ConsentScript } from './consent-script.astro';
export { default as IABConsentBanner } from './iab-prompt.astro';
export { default as IABConsentDialog } from './iab-panel.astro';
