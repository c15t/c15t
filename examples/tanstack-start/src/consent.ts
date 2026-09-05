/**
 * Where consent saves and the manifest come from.
 *
 * This demo self-hosts `@c15t/backend` at `/api/self-host`
 * (`src/routes/api/self-host/$.ts`). Set `C15T_BACKEND_URL` to point the
 * app at a hosted c15t instance instead.
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
 * `backendURL` is read from `import.meta.env` rather than `process.env`:
 * `vite.config.ts` lists `C15T_` as an env prefix, so Vite inlines the value
 * into the server bundle where the server function and the route read it.
 */
export const backendURL: string =
	import.meta.env.C15T_BACKEND_URL || '/api/self-host';

/** Same-origin consent route the browser uses; see `routes/api/c15t/$.ts`. */
export const consentRoute = '/api/c15t';
