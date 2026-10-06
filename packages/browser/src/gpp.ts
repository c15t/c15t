/**
 * `@c15t/browser/gpp` — IAB GPP for a bundled `@c15t/browser` client, the
 * way `@c15t/browser/devtools` mounts the DevTools panel. Script-tag pages
 * load `c15t.gpp.js` instead.
 *
 * @example
 * ```ts
 * import { init } from '@c15t/browser';
 * import { mountGPP } from '@c15t/browser/gpp';
 *
 * const client = init({ backendURL: 'https://your-instance.c15t.dev' });
 * const gpp = mountGPP(client, { usFallback: 'none' });
 * ```
 */

import type { RuntimeGPPOptions } from '@c15t/core/runtime';
import { createGPP } from '@c15t/iab/gpp';
import type { GPPHandle } from '@c15t/iab/gpp';

import type { ConsentClient } from './types';

/**
 * Install `window.__gpp` against a client and keep its GPP string in step
 * with the visitor's choices.
 *
 * @param client - The page's client.
 * @param options - GPP options. Every field is optional.
 * @returns A handle with `getGPPString()`, `getPingData()` and `dispose()`,
 * which removes `__gpp`. Dispose it before disposing the client.
 * @throws {Error} When a CMP that has already loaded owns `__gpp`.
 */
export const mountGPP = function mountGPP(
	client: ConsentClient,
	options: RuntimeGPPOptions = {}
): GPPHandle {
	return createGPP({ ...options, kernel: client.kernel });
};

export type { GPPHandle, GPPPingData } from '@c15t/iab/gpp';
export type { RuntimeGPPOptions } from '@c15t/core/runtime';
