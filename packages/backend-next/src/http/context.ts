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
import { getSubjectOutputSchema, listSubjectsOutputSchema } from '@c15t/schema';
import {
	getIpAddress,
	type IpAddressConfig,
	isOriginTrusted,
} from '@c15t/schema/geo';
import { Effect, ManagedRuntime } from 'effect';
import type { SqlClient } from 'effect/unstable/sql';
import * as v from 'valibot';
import {
	LegalDocumentConflictError,
	syncCurrent,
} from '../repository/legal-document';
import { submit } from '../repository/record-consent';
import {
	findById,
	linkExternalId,
	listByExternalId,
} from '../repository/subject';
import { validateRequestAuth } from './auth';
import {
	BadRequestError,
	NotFoundError,
	type RouteError,
	toHttp,
} from './errors';
import type { GvlOptions } from './gvl';
import { buildInitResponse } from './init';
import { buildManifestResponse, type ManifestCacheOptions } from './manifest';
import type { PolicySnapshotOptions } from './policy-snapshot';
import { status } from './status';

export interface AppLayers {
	readonly sql: SqlClient.SqlClient;
}

/**
 * Builds the app over a runtime that already has its layers provided.
 *
 * The runtime is constructed once by the caller and reused for every request —
 * building a layer per request would open a connection pool per request.
 */
import type { Hono } from 'hono';

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
	/** Per-tenant configuration the manifest and /init are built from. */
	readonly manifest?: ConsentManifestConfig;
	readonly manifestCache?: ManifestCacheOptions;
	readonly policySnapshot?: PolicySnapshotOptions;
	readonly gvl?: GvlOptions & { enabled?: boolean };
	/**
	 * Keys accepted on `Authorization: Bearer <key>`.
	 *
	 * Absent or empty means no request authenticates. A deployment that has
	 * not configured keys should expose nothing, not everything.
	 */
	readonly apiKeys?: readonly string[];
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
	(runtime: ManagedRuntime.ManagedRuntime<SqlClient.SqlClient, never>) =>
	async <A>(
		effect: Effect.Effect<A, RouteError, SqlClient.SqlClient>
	): Promise<
		{ ok: true; value: A } | { ok: false; failure: ReturnType<typeof toHttp> }
	> => {
		const result = await runtime.runPromise(Effect.result(effect));
		return result._tag === 'Success'
			? { ok: true, value: result.success }
			: { ok: false, failure: toHttp(result.failure) };
	};
