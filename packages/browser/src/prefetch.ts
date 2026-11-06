/**
 * `@c15t/browser/prefetch`: the early `/init` script for servers that serve
 * the script-tag builds, such as `@c15t/backend`.
 *
 * `@c15t/core` is external here and pinned to the version the script-tag
 * builds bundle, so the request this builds is the one `c15t.js` expects.
 *
 * @internal
 */
export { buildPrefetchScript } from '@c15t/core';
export type { PrefetchOptions } from '@c15t/core';
