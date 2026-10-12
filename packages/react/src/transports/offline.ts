/**
 * Offline mode for the React provider: core's `offline()`, which resolves
 * policy rules locally and switches copy when `overrides.language` or
 * `useSetLanguage()` names a language the bundle or `i18n.messages` has.
 * The language a server prefetch detected from `Accept-Language` keeps the
 * startup copy.
 */
export { offline } from '@c15t/core';
export type { OfflineModeOptions } from '@c15t/core';
