/**
 * Global Vendor List resolution for IAB deployments.
 *
 * The GVL is large, changes rarely, and is identical for every visitor in a
 * given language — so fetching it per request would put a third-party round
 * trip on the critical rendering path for no benefit. It is cached, and
 * concurrent misses share one fetch rather than stampeding the upstream.
 *
 * Only reached when IAB is enabled and active for the request. Everyone else
 * pays nothing: `gvl` is optional in the contract precisely because most
 * deployments never need it.
 */

import { globalVendorListSchema } from '@c15t/schema';
import type { GlobalVendorList } from '@c15t/schema';
import * as v from 'valibot';

import type { CacheAdapter } from '../cache/types';

export type { CacheAdapter };

export interface GvlOptions {
	readonly endpoint?: string;
	readonly vendorIds?: readonly number[];
	readonly cache?: CacheAdapter;
	/** How long a fetched list stays fresh. Defaults to one day. */
	readonly ttlMs?: number;
	/** Injected in tests; defaults to global fetch. */
	readonly fetch?: typeof globalThis.fetch;
}

/**
 * Vendor list configuration as a deployment writes it.
 *
 * Writing the block at all is the opt-in: `endpoint`, `vendorIds`, `cache` and
 * `ttlMs` are read by nothing else here, so a `gvl` entry that exists came from
 * someone who wants the list loaded server-side. `/init` then serves it
 * whenever a request resolves a matched IAB policy (see `http/init.ts`).
 *
 * Asking for a second flag inside the block is what produced deployments with
 * an IAB policy and no vendor list, which is a disclosure surface holding no
 * vendors. `enabled: false` stays as the refusal, for a deployment that keeps
 * its scope and cache configured and loads the list somewhere else.
 */
export interface GvlConfig extends GvlOptions {
	/**
	 * Decline to serve the list even on a matched IAB policy.
	 *
	 * Absent or `true` follows the policy; only `false` refuses.
	 */
	readonly enabled?: boolean;
}

const DEFAULT_ENDPOINT = 'https://gvl.inth.app';
const DEFAULT_TTL_MS = 86_400_000;

/**
 * Most vendor ids worth putting into a request line.
 *
 * The upstream filters server-side, which is what keeps a scoped publisher off
 * the ~850 KB full document, but the filter travels as a query string, and past
 * a few hundred ids a CDN's request-line limit starts failing the whole
 * consent surface for a publisher who scoped wide. `packages/iab` caps the same
 * way on the client; above the cap the list is fetched whole and narrowed here,
 * so the cap costs bytes rather than disclosure correctness.
 *
 * {@link VENDOR_SCOPE_HEADER} caps a declared scope at the same number rather
 * than carrying a second limit. Two caps on one list would mean a vendor set
 * that survives the web filter declares nothing on a device, and the client
 * that keeps vendor ids in persistent storage caps at 500 too.
 */
export const MAX_GVL_QUERY_VENDOR_IDS = 500;

/**
 * The request URL for one (endpoint, allowlist) pair.
 *
 * The document is served at the endpoint itself: the upstream answers
 * `/<language>.json` with a 404, so a per-language path is not a fallback, it
 * is a broken URL. Only the vendor filter is appended. Joined by hand rather
 * than through `new URL` because a deployment may configure a relative
 * endpoint, which `URL` rejects outright.
 */
const gvlRequestUrl = function gvlRequestUrl(
	endpoint: string,
	vendorIds: readonly number[] | undefined
): string {
	if (!vendorIds || vendorIds.length === 0) {
		return endpoint;
	}
	const query = new URLSearchParams({
		vendorIds: [...vendorIds].sort((a, b) => a - b).join(','),
	});
	return `${endpoint}${endpoint.includes('?') ? '&' : '?'}${query}`;
};

/**
 * Restrict a document to a publisher's vendor allowlist.
 *
 * The filter has to run somewhere. Fetching the full list and serving it
 * because the allowlist was too wide to travel would disclose every GVL vendor
 * to a visitor who was only ever shown a publisher's own partners.
 *
 * Nil and empty both mean "no filter here": the list comes back untouched
 * rather than emptied. So an empty allowlist is a way to ask for everything,
 * never a way to ask for nothing, which is what
 * {@link narrowToDeclaredScope} has to keep straight.
 */
export const narrowToVendorIds = function narrowToVendorIds(
	gvl: GlobalVendorList,
	vendorIds: readonly number[] | undefined
): GlobalVendorList {
	if (!vendorIds || vendorIds.length === 0) {
		return gvl;
	}
	const allowed = new Set(vendorIds.map(String));
	const vendors: GlobalVendorList['vendors'] = {};
	for (const [id, vendor] of Object.entries(gvl.vendors)) {
		if (allowed.has(id)) {
			vendors[id] = vendor;
		}
	}
	return { ...gvl, vendors };
};

/**
 * Cache key.
 *
 * Vendor ids are sorted before hashing into the key: the same set requested in
 * a different order is the same list, and treating it as a different one would
 * multiply cache entries and miss rates for no reason.
 */
export const gvlCacheKey = function gvlCacheKey(
	endpoint: string,
	language: string,
	vendorIds: readonly number[] | undefined
): string {
	const vendors = vendorIds
		? [...vendorIds].sort((a, b) => a - b).join(',')
		: '';
	return `gvl:${endpoint}|${language}|${vendors}`;
};

/**
 * In-flight requests, keyed the same way as the cache.
 *
 * Module-scoped on purpose. A cold cache under load means every concurrent
 * request misses at once; without this they would each fetch the same large
 * document from the same upstream simultaneously.
 */
const inflight = new Map<string, Promise<GlobalVendorList | null>>();

/**
 * The request header a client uses to declare which vendors it actually uses.
 *
 * On web, `gvl.vendorIds` is the whole scope story: the browser asks the GVL
 * endpoint for a filtered document itself, so whatever the deployment
 * configured is what it gets. A native app has no such second path. It cannot
 * reach the endpoint at all, so the document `/init` embeds is the only list it
 * will ever hold, over a connection the visitor did not choose. The header lets
 * an app say which partners it renders, so the response carries those instead
 * of the widest scope the server happens to have been configured with.
 *
 * It lives here rather than beside the policy contract header in
 * `@c15t/schema` because it is a property of server-side list loading: it
 * changes nothing about policy resolution, and it means nothing on a response
 * that carries no list.
 */
export const VENDOR_SCOPE_HEADER = 'x-c15t-vendors';

/**
 * Parse a declared vendor scope off {@link VENDOR_SCOPE_HEADER}.
 *
 * The grammar is comma-separated decimal ids with optional surrounding
 * whitespace: `7, 41, 672`. Duplicates collapse, because `7,7,41` names one
 * scope and counting it as three would cap a publisher at a third of the ids.
 *
 * Every unusable value is absence, not an error, and it has to be: this is
 * parsed on the critical rendering path, where failing `/init` leaves the
 * visitor with no consent UI at all. `resolveGvl` returns null instead of
 * throwing for exactly that reason, and a header from a client that cannot be
 * understood deserves the same treatment as that client not sending one.
 *
 * Absence therefore covers the header missing, a value that is empty or
 * whitespace alone, any part that is not plain decimal digits, an id that is
 * zero or past `Number.MAX_SAFE_INTEGER`, and a deduplicated scope above
 * {@link MAX_GVL_QUERY_VENDOR_IDS}. The whole value is discarded rather than
 * the offending id, so a client can never be served a partial reading of a
 * scope it did not send.
 *
 * @param value - Raw header value, or null when the header is absent.
 * @returns The declared ids in the order they were sent, or undefined when
 *   nothing usable was declared. Never an empty array: a client that uses no
 *   vendors sends no header, which is a different thing from asking to be
 *   served nothing.
 */
export const parseVendorScopeHeader = function parseVendorScopeHeader(
	value: string | null | undefined
): readonly number[] | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}

	const ids = new Set<number>();
	for (const part of value.split(',')) {
		const trimmed = part.trim();
		if (!/^\d+$/u.test(trimmed)) {
			return undefined;
		}
		const id = Number.parseInt(trimmed, 10);
		if (!Number.isSafeInteger(id) || id < 1) {
			return undefined;
		}
		ids.add(id);
	}

	if (ids.size > MAX_GVL_QUERY_VENDOR_IDS) {
		return undefined;
	}
	return [...ids];
};

/**
 * Narrow a document to the narrower of the two scopes that apply to it.
 *
 * A response carries the intersection of the publisher's configured
 * `gvl.vendorIds` and whatever this request declared, and it can only ever be
 * an intersection. This one expression is where that direction is decided, so
 * no caller can get it backwards:
 *
 * ```ts
 * const served = narrowToVendorIds(
 * narrowToVendorIds(list, declaredVendorIds),
 * options.vendorIds
 * );
 * ```
 *
 * The failure this rules out is honouring one scope instead of both: serving
 * the declared list whenever a client sends one, which is the shape a request
 * parameter usually takes. It reads as identical until a client names a vendor
 * the publisher never configured, and there the header has become a way to
 * widen a scope. Intersecting means a declared 999, with 999 absent from the
 * configuration, comes back as an empty `vendors` map, not as 999 and not as
 * the whole document.
 *
 * What nil and empty mean here is the part worth reading twice, because the two
 * narrowers in this repository do not agree. `narrowToVendorIds`, the
 * config-shaped one, returns the list untouched for nil *and* for an empty
 * array; `narrowGVLToVendors` in `packages/iab`, the client-shaped one, returns
 * it untouched for an empty array and takes no nil at all. Both read "no scope"
 * as "everything", neither as "nothing". The header follows the nil branch,
 * since `parseVendorScopeHeader` never returns an empty array: an absent header
 * and an unreadable one are the same request, and both are served the
 * configured scope. So empty and absent cannot disagree on the wire, which is
 * the only reason the disagreement above is safe to leave alone. Note what that
 * costs: a client cannot ask to be served nothing, and a device that renders no
 * partners omits the header and gets the configured scope, exactly as it does
 * today.
 *
 * @param gvl - The document the configured scope produced, or null when no list
 *   is available. Null passes through because a document narrows as a whole.
 * @param options - The deployment's list configuration.
 * @param declaredVendorIds - This request's declared scope. Nil or empty leaves
 *   the configured scope exactly as it is.
 * @returns The document with `vendors` limited to both scopes at once.
 */
export const narrowToDeclaredScope = function narrowToDeclaredScope(
	gvl: GlobalVendorList | null,
	options: GvlOptions,
	declaredVendorIds: readonly number[] | undefined
): GlobalVendorList | null {
	if (gvl === null) {
		return null;
	}
	return narrowToVendorIds(
		narrowToVendorIds(gvl, declaredVendorIds),
		options.vendorIds
	);
};

/**
 * Fetches the vendor list for a language, from cache where possible.
 *
 * Returns null rather than throwing when the upstream is unavailable. A
 * missing GVL degrades the IAB experience; a thrown error would fail `/init`
 * entirely and leave the visitor with no consent UI at all — strictly worse,
 * and on the critical rendering path.
 *
 * `declaredVendorIds` is the {@link VENDOR_SCOPE_HEADER} scope for this one
 * request. It narrows the result after the cache lookup and never enters the
 * cache key, so the entry stays the one the publisher's configuration produced
 * and every client that asks shares it. Keying on a declared scope instead
 * would let any client mint cache entries at will, and would move the upstream
 * fetch count from publisher configuration to whoever sends the requests.
 *
 * @param language - The request's preferred language.
 * @param options - The deployment's list configuration.
 * @param declaredVendorIds - Vendors this request declared it uses. Narrowing
 *   input only: never cached, never a cache key. Omit it, or pass an empty
 *   array, to serve the configured scope.
 */
export const resolveGvl = async function resolveGvl(
	language: string,
	options: GvlOptions,
	declaredVendorIds?: readonly number[]
): Promise<GlobalVendorList | null> {
	// The upstream publishes one English document today, so the language does
	// not reach the URL. It stays in the cache key: it costs a duplicate entry
	// per served language, and it is already correct the day a translated list
	// is published at a per-language endpoint.
	const primary = language.split('-')[0] || 'en';
	const endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
	const key = gvlCacheKey(endpoint, primary, options.vendorIds);

	const cached = await options.cache?.get<GlobalVendorList>(key);
	if (cached) {
		// Narrowed per request, from a cached document that stays at the
		// configured width. Two clients sharing this entry never see each
		// other's scope, and neither can write one back.
		return narrowToDeclaredScope(cached, options, declaredVendorIds);
	}

	const existing = inflight.get(key);
	if (existing) {
		// Callers waiting on someone else's fetch each narrow the shared
		// document for themselves.
		return narrowToDeclaredScope(await existing, options, declaredVendorIds);
	}

	const request = (async () => {
		try {
			const doFetch = options.fetch ?? globalThis.fetch;
			const { vendorIds } = options;
			const filterTravels =
				vendorIds !== undefined &&
				vendorIds.length > 0 &&
				vendorIds.length <= MAX_GVL_QUERY_VENDOR_IDS;
			const response = await doFetch(
				gvlRequestUrl(endpoint, filterTravels ? vendorIds : undefined)
			);
			if (!response.ok) {
				return null;
			}
			// Validated rather than trusted: an upstream returning something
			// unexpected must not flow into a contract-typed response field,
			// and caching a malformed document would persist the problem.
			const parsed = v.safeParse(globalVendorListSchema, await response.json());
			if (!parsed.success) {
				return null;
			}
			// Narrow before caching, so a wide allowlist never leaves a full
			// document in the cache under a key that promises a scoped one.
			const resolved = narrowToVendorIds(parsed.output, vendorIds);
			await options.cache?.set(key, resolved, options.ttlMs ?? DEFAULT_TTL_MS);
			return resolved;
		} catch {
			return null;
		} finally {
			inflight.delete(key);
		}
	})();

	inflight.set(key, request);

	// What the cache and the other waiters get is `request`, at the configured
	// width; only this caller's answer is narrowed.
	const document = await request;
	return document === null
		? null
		: narrowToDeclaredScope(document, options, declaredVendorIds);
};
