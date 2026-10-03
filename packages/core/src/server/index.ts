/**
 * `@c15t/core/server` — server-only helpers shared by host framework layers.
 *
 * Nothing here touches the DOM or the kernel; it is the piece every host
 * integration (Next.js, Nuxt, SvelteKit, TanStack Start) would otherwise
 * hand-roll identically behind its own `/manifest` route.
 */
export type {
	BuildConsentProxyRequestHeadersInput,
	ConsentProxyForwarding,
	ConsentProxyOptions,
	ForwardConsentRequestInput,
	ResolvedConsentProxyOptions,
} from './consent-proxy';
export {
	buildConsentProxyRequestHeaders,
	buildConsentProxyResponseHeaders,
	CONSENT_PROXY_DEFAULT_FORWARD_HEADERS,
	CONSENT_PROXY_DEFAULT_PATHS,
	CONSENT_PROXY_DEFAULT_TIMEOUT_MS,
	CONSENT_PROXY_FORWARDING_HEADERS,
	CONSENT_PROXY_PUBLIC_FORWARD_HEADERS,
	filterCookieHeader,
	forwardConsentRequest,
	isCleartextRemoteURL,
	isConsentProxyPathAllowed,
	resolveConsentProxyOptions,
	rewriteProxySetCookie,
	stripIdentityForCleartext,
} from './consent-proxy';
export type { FetchCachedGvlOptions } from './gvl-cache';
export { clearGvlCache, fetchCachedGvl } from './gvl-cache';
// The same entry point and process cache as
// `@c15t/core/transports/manifest-cache`, without the init resolver and its
// translation imports.
export type {
	CachedManifestResponse,
	FetchCachedManifestOptions,
	ManifestCache,
	ManifestFetch,
	ManifestSourceOptions,
} from '../libs/manifest-cache-runtime';
export {
	clearManifestCache,
	createManifestCache,
	createManifestRequestURL,
	fetchCachedManifest,
	getManifestAge,
	getManifestSMaxAge,
	getManifestStaleWhileRevalidate,
	MANIFEST_DEDUPE_TTL_SECONDS,
	MANIFEST_PASSTHROUGH_HEADERS,
	ManifestUnavailableError,
	resolveManifestSourceURL,
} from '../libs/manifest-cache-runtime';

export {
	createStaticManifestModule,
	loadStaticManifest,
} from './static-manifest';
export type { StaticManifestModuleOptions } from './static-manifest';
export type {
	BuildConsentSessionReportOptions,
	ReportConsentSessionOptions,
	SessionReportHeaders,
	SessionReportInputs,
} from '../libs/session-report';
export {
	buildConsentSessionReport,
	forwardSessionReportHeaders,
	isSpeculativeRequest,
	reportConsentSession,
	resolveSessionReportBackendURL,
	SESSION_REPORT_CLIENT_IP_HEADER,
	SESSION_REPORT_FORWARD_HEADERS,
} from '../libs/session-report';
export type {
	RequestHeaderSource,
	ResolveRequestOriginOptions,
} from './request-origin';
export {
	resolveRequestBackendURL,
	resolveRequestOrigin,
} from './request-origin';
