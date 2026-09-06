/**
 * `@c15t/nextjs/middleware` keeps the Next 15 name for the proxy helper.
 *
 * Next 16 renamed `middleware.ts` to `proxy.ts`; the implementation lives in
 * `@c15t/nextjs/proxy` and this entry re-exports it under the old name.
 */

import { c15tProxy } from './proxy';

export type { C15tProxyOptions as C15tMiddlewareOptions } from './proxy';

/**
 * Alias of `c15tProxy` from `@c15t/nextjs/proxy` for `middleware.ts` files.
 *
 * Both names stay supported. Prefer `c15tProxy` in new code, and switch to it
 * when you rename `middleware.ts` to `proxy.ts` on Next 16.
 */
export const c15tMiddleware: typeof c15tProxy = c15tProxy;
