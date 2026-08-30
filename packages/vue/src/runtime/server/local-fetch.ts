import { useNitroApp } from 'nitropack/runtime';

import type { ManifestFetch } from './manifest-mode';

/**
 * `globalThis.fetch` rejects relative URLs in Node (`ERR_INVALID_URL`), but a
 * relative `backendURL` (e.g. `/api/self-host` when @c15t/backend is mounted
 * in the same Nitro app) is the natural same-origin self-host config. Nitro's
 * `localFetch` serves relative URLs in-process (no self-HTTP hop, works
 * behind deployment protection) and delegates absolute URLs to real fetch.
 */
export const serverFetch: ManifestFetch = (input, init) =>
	useNitroApp().localFetch(input, init);
