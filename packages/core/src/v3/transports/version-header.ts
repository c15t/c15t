/**
 * `x-c15t-version` — client-version header on every c15t-backend-bound
 * request (issue #916). Lets the backend attribute traffic to a client
 * version for telemetry and compatibility gating.
 *
 * Scope: requests to the c15t BACKEND only (hosted `/init` + `/subjects`,
 * manifest-mode `/subjects`). Deliberately NOT attached to manifest/GVL
 * document fetches — those may target third-party CDNs whose CORS policy
 * won't allow an unexpected custom header, and the backend can't read
 * telemetry from a CDN hit anyway.
 *
 * CORS note: the backend allowlists this header (`SUPPORTED_HEADERS` in
 * @c15t/backend cors middleware). On cross-origin hosted mode this turns
 * the otherwise-simple `/init` GET into a preflighted request — one extra
 * OPTIONS roundtrip per origin per `maxAge` window (600s). Same-origin and
 * manifest modes are unaffected.
 */
import { version } from '../../version';

export const C15T_VERSION_HEADER = 'x-c15t-version';

/** Header record to spread into backend-bound request headers. */
export const c15tVersionHeaders: Readonly<Record<string, string>> = {
	[C15T_VERSION_HEADER]: version,
};
