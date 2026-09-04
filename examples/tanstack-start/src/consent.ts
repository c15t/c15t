/**
 * Where consent saves and the manifest come from.
 *
 * This demo self-hosts `@c15t/backend` at `/api/self-host`
 * (`src/routes/api/self-host/$.ts`), so the manifest, init, and
 * `POST /subjects` all stay on one origin. Set `C15T_BACKEND_URL` to point
 * the whole app at a hosted c15t instance instead.
 *
 * Read from `import.meta.env` rather than `process.env`: `vite.config.ts`
 * lists `C15T_` as an env prefix, so Vite inlines the value into the server
 * and the client bundle alike. The server function prefetches
 * `${backendURL}/manifest`, and `ConsentBoundary` posts consent to
 * `${backendURL}/subjects` from the browser.
 */
export const backendURL: string =
	import.meta.env.C15T_BACKEND_URL || '/api/self-host';
