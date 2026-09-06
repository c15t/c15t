/**
 * `x-c15t-version` — client-version header on every c15t-backend-bound
 * request (issue #916). Lets the backend attribute traffic to a client
 * version for telemetry and compatibility gating.
 *
 * Scope: every c15t-bound request — hosted `/init` + `/subjects`,
 * manifest-mode `/subjects`, the manifest document fetch, the GVL fetch,
 * and the Next/Nuxt server proxies' upstream manifest calls. The manifest
 * and GVL hosts are c15t/tenant-controlled infrastructure (IAB TCF policy
 * requires CMPs to self-host the GVL rather than hotlink IAB's), so the
 * header is safe and version-gated manifest serving stays possible.
 *
 * CORS note: the backend allowlists this header (`SUPPORTED_HEADERS` in
 * `@c15t/backend` cors middleware). On cross-origin hosted mode this turns
 * the otherwise-simple `/init` GET into a preflighted request — one extra
 * OPTIONS roundtrip per origin per `maxAge` window (600s). Same-origin and
 * manifest modes are unaffected.
 */
import { version } from '../version';

export const C15T_VERSION_HEADER = 'x-c15t-version';

/** Header record to spread into backend-bound request headers. */
export const c15tVersionHeaders: Readonly<Record<string, string>> = {
	[C15T_VERSION_HEADER]: version,
};
