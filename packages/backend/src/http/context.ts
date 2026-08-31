/**
 * The HTTP surface.
 *
 * Hono stays, because RFC 0004 changes the data layer and the runtime, not the
 * wire. Routes hand off to Effect immediately and the app owns exactly two
 * things: turning a request into handler inputs, and turning a typed failure
 * into a response.
 *
 * ## Wire compatibility is enforced, not asserted
 *
 * §Non-goals makes wire compatibility with `@c15t/backend` 2.x a hard
 * requirement. Rather than restate the response shapes here and hope they stay
 * aligned, every handler validates its output against the **same
 * `@c15t/schema` schema the 2.x routes validate against**. If the two drift,
 * this package fails its own tests rather than shipping a silently different
 * response.
 *
 * That also means the schemas remain the single source of truth across the
 * cutover, which is what makes running both packages against one contract
 * possible at all.
 */

import type { ConsentManifestConfig } from '@c15t/schema';
import type { IpAddressConfig } from '@c15t/schema/geo';
import { Effect, Layer } from 'effect';
import type { ManagedRuntime } from 'effect';
import type { SqlClient } from 'effect/unstable/sql';
import type { Context, Hono } from 'hono';

import { layer as tenantLayer } from '../db/tenant';
import type { Tenant } from '../db/tenant';
import type { ObservabilityOptions } from '../observability/evlog';
import { toRequestLog } from '../observability/evlog';
import { layer as logLayer, silent } from '../observability/log';
import type { Log } from '../observability/log';
import { toHttp } from './errors';
import type { RouteError } from './errors';
import type { GvlOptions } from './gvl';
import type { LegalDocumentSnapshotOptions } from './legal-document-snapshot';
import type { ManifestCacheOptions } from './manifest';
import type { PolicySnapshotOptions } from './policy-snapshot';

export interface AppLayers {
	readonly sql: SqlClient.SqlClient;
}

/**
 * Builds the app over a runtime that already has its layers provided.
 *
 * The runtime is constructed once by the caller and reused for every request —
 * building a layer per request would open a connection pool per request.
 */

export interface AppOptions {
	/**
	 * Client IP handling, passed through to `@c15t/schema`'s shared derivation.
	 *
	 * The IP ends up on consent records, so this is a compliance setting rather
	 * than a diagnostic one: masking is on unless explicitly disabled, and
	 * `tracking: false` records nothing at all.
	 */
	readonly ipAddress?: IpAddressConfig;
	/** Reported by `GET /status`. */
	readonly version?: string;
	/**
	 * OpenAPI spec publication.
	 *
	 * Enabled by default, matching @c15t/backend — the spec documents a public
	 * API, and a self-hoster integrating against it should not have to opt in
	 * to discovering what the endpoints are.
	 */
	readonly openapi?: {
		readonly enabled?: boolean;
		readonly specPath?: string;
		readonly title?: string;
		readonly basePath?: string;
	};
	/**
	 * Origins permitted to call this backend from a browser.
	 *
	 * Empty or absent means no cross-origin request is allowed. The banner is
	 * loaded from the host's own page, so a deployment that has not configured
	 * this should reject rather than default open.
	 */
	readonly trustedOrigins?: readonly string[];
	/**
	 * The tenant this instance serves, matching @c15t/backend where tenantId is
	 * instance configuration rather than per-request.
	 *
	 * Undefined means a single-tenant deployment whose rows hold NULL. That is
	 * still a scope — queries filter on `is null` — so there is no unscoped
	 * mode to fall into.
	 */
	readonly tenantId?: string;
	/** Per-tenant configuration the manifest and /init are built from. */
	readonly manifest?: ConsentManifestConfig;
	readonly manifestCache?: ManifestCacheOptions;
	readonly policySnapshot?: PolicySnapshotOptions;
	/**
	 * Signing for legal-document snapshots.
	 *
	 * Separate from `policySnapshot` because they attest to different things
	 * and have very different lifetimes — a policy decision is consumed
	 * immediately, a terms snapshot is held by a client across a session — so
	 * one signing key and TTL cannot serve both.
	 */
	readonly legalDocumentSnapshot?: LegalDocumentSnapshotOptions;
	readonly gvl?: GvlOptions & { enabled?: boolean };
	/**
	 * Keys accepted on `Authorization: Bearer <key>`.
	 *
	 * Absent or empty means no request authenticates. A deployment that has
	 * not configured keys should expose nothing, not everything.
	 */
	readonly apiKeys?: readonly string[];
	/**
	 * Where this backend is mounted, when it is not at the root.
	 *
	 * A self-hoster typically mounts it under a catch-all — `/api/c15t` in
	 * Next.js, `/api/self-host` in the demo — so requests arrive with that
	 * prefix while the routes are declared without it. The prefix is stripped
	 * before dispatch, which is what `@c15t/backend` does too.
	 *
	 * Without this, a mounted deployment 404s on every route, which is a
	 * confusing way to discover the setting.
	 */
	readonly basePath?: string;
	/**
	 * Wide-event logging (RFC 0004 §5).
	 *
	 * On by default at `level: 'warn'` — silent when requests succeed, a line
	 * when they fail. `level: 'info'` gives the full per-request stream;
	 * `'silent'` turns it off.
	 */
	readonly observability?: ObservabilityOptions;
}

/**
 * What a route module needs to register itself.
 *
 * Passed explicitly rather than reached for via module scope, so a route's
 * dependencies are visible in its signature and it can be exercised without
 * standing up the whole app.
 */
export interface RouteContext {
	readonly app: Hono;
	readonly options: AppOptions;
	readonly run: ReturnType<typeof makeRun>;
}

export const makeRun =
	(
		runtime: ManagedRuntime.ManagedRuntime<SqlClient.SqlClient, never>,
		tenantId: string | undefined
	) =>
	async <A>(
		c: Context,
		effect: Effect.Effect<A, RouteError, SqlClient.SqlClient | Tenant | Log>
	): Promise<
		{ ok: true; value: A } | { ok: false; failure: ReturnType<typeof toHttp> }
	> => {
		// Both provided here, once, rather than at each call site: a route
		// cannot forget what it never has to remember.
		//
		// The logger comes from the Hono context rather than a module-level
		// singleton because it is per-request — evlog's Hono binding attaches
		// it with `c.set('log', …)` and offers no async-storage lookup.
		const log = toRequestLog(c.get('log'));
		const request = Layer.merge(
			tenantLayer(tenantId),
			log === undefined ? silent : logLayer(log)
		);

		const result = await runtime.runPromise(
			Effect.result(Effect.provide(effect, request))
		);
		if (result._tag === 'Success') {
			return { ok: true, value: result.success };
		}

		// The client is told nothing about a database failure on purpose — the
		// message carries table and column names. That only works if the detail
		// goes *somewhere*, and until now it went nowhere: `toHttp` dropped it
		// and the response said `DATABASE_ERROR` with no cause recorded, so an
		// operator debugging a 500 had the status and nothing else.
		if (result.failure._tag === 'SqlError' && log !== undefined) {
			log.error(result.failure);
		}

		return { failure: toHttp(result.failure), ok: false };
	};
