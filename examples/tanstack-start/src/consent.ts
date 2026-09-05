/**
 * Where consent saves and the manifest come from.
 *
 * This demo self-hosts `@c15t/backend` at `/api/self-host`
 * (`src/routes/api/self-host/$.ts`). Set `VITE_C15T_BACKEND_URL` to point
 * the app at a hosted c15t instance instead.
 *
 * Two values, two audiences:
 *
 * - `backendURL` is the real backend. The server function prefetches
 *   `${backendURL}/manifest` from it, and the consent server route proxies
 *   to it. Only server code reads this.
 * - `consentRoute` is what the browser talks to: the app's own
 *   `createConsentServerRoute({ proxy: true })` mount. `ConsentBoundary`
 *   posts consent to `${consentRoute}/subjects`, which the route forwards to
 *   `${backendURL}/subjects` with the browser's identity headers and the
 *   client IP attached, so the backend and its firewall see a normal visitor
 *   rather than one server-side egress IP.
 *
 * `backendURL` is read from `import.meta.env` under the public `VITE_`
 * prefix: the URL is not a secret, and keeping the prefix at Vite's default
 * means no other `C15T_*` variable (API keys, snapshot keys) can leak into a
 * bundle through this module.
 */
export const backendURL: string =
	import.meta.env.VITE_C15T_BACKEND_URL || '/api/self-host';

/** Same-origin consent route the browser uses; see `routes/api/c15t/$.ts`. */
export const consentRoute = '/api/c15t';
