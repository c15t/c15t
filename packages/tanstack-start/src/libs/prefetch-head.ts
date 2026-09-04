import { buildPrefetchScript } from '@c15t/core';

import type { ConsentPrefetchHead, ConsentPrefetchHeadOptions } from '../types';

const DEFAULT_SCRIPT_ID = 'c15t-initial-data-prefetch';

/**
 * Builds a route `head()` fragment that starts the `/init` prefetch before
 * hydration. This is the TanStack Start equivalent of the Next.js
 * `C15tPrefetch` script: the inline script issues the same-origin init
 * request as early as the browser parses `<head>`, and the client runtime
 * consumes the matching response during its first store initialization.
 *
 * Use it on prerendered or `ssr: false` routes where no loader runs on the
 * server, so the banner still resolves as early as possible.
 *
 * @param options - Prefetch options plus an optional script element id.
 * @returns A fragment with a `scripts` array to spread into `head()`.
 * @example
 * ```tsx
 * import { consentPrefetchHead } from '@c15t/tanstack-start';
 *
 * export const Route = createRootRoute({
 *   head: () => ({
 *     meta: [{ title: 'My app' }],
 *     ...consentPrefetchHead({ backendURL: '/api/c15t' }),
 *   }),
 * });
 * ```
 */
export const consentPrefetchHead = function consentPrefetchHead({
	id = DEFAULT_SCRIPT_ID,
	...options
}: ConsentPrefetchHeadOptions): ConsentPrefetchHead {
	return {
		scripts: [{ children: buildPrefetchScript(options), id }],
	};
};
