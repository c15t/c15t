/**
 * Tenant scoping.
 *
 * Every row in every table carries `tenantId`, and a query that forgets to
 * filter on it returns another tenant's data. On a consent platform that is
 * the worst available bug: it discloses who consented to what, and — for
 * writes like deactivating a superseded policy — it corrupts a tenant's
 * records from outside.
 *
 * ## Why this is a service rather than a parameter
 *
 * `@c15t/backend` solves this with a Proxy around the ORM that injects the
 * filter and throws on any method it does not recognise. That works, but the
 * enforcement is at runtime and the failure mode is a method someone adds
 * later.
 *
 * Here the scope is an Effect service, so a query that needs it declares it in
 * its requirements and **a caller that has not provided one does not
 * typecheck**. Forgetting to scope is a compile error rather than a silent
 * leak, which is the property worth having.
 *
 * The remaining hole is a query that simply never asks for `Tenant`. That is
 * what `tenant-isolation.test.ts` covers: it seeds two tenants and asserts
 * every read and write observes only its own.
 */

import { Context, Effect, Layer } from 'effect';
import { SqlClient, type Statement } from 'effect/unstable/sql';

/**
 * The tenant a request belongs to.
 *
 * `undefined` is a real value, not an absence: single-tenant deployments never
 * set `tenantId`, so their rows hold SQL NULL and must be matched with
 * `is null` rather than `= undefined`, which matches nothing.
 */
export class Tenant extends Context.Service<
	Tenant,
	{ readonly tenantId: string | undefined }
>()('Tenant') {}

/** A scope for a specific tenant. */
export const layer = (tenantId: string | undefined): Layer.Layer<Tenant> =>
	Layer.succeed(Tenant, { tenantId });

/**
 * Single-tenant deployments, where every row has a NULL tenant.
 *
 * Named explicitly so choosing it is a decision rather than the result of
 * forgetting to provide a scope.
 */
export const singleTenant: Layer.Layer<Tenant> = layer(undefined);

/**
 * The predicate restricting a query to the current tenant.
 *
 * Always emits a condition — there is no "unscoped" branch to fall into. A
 * single-tenant deployment gets `is null`, which is still a filter and still
 * excludes another tenant's rows if any ever appear.
 *
 * @example
 * ```ts
 * const scope = yield* tenantScope('subject');
 * yield* sql`select * from "subject" where "externalId" = ${id} and ${scope}`;
 * ```
 */
export const tenantScope = Effect.fn('tenant.scope')(function* (
	table?: string
): Generator<
	Effect.Effect<unknown, never, SqlClient.SqlClient | Tenant>,
	Statement.Fragment
> {
	const sql = yield* SqlClient.SqlClient;
	const { tenantId } = yield* Tenant;
	// `sql(name)` rather than `sql.unsafe('"name"')`: the dialect's own
	// compiler picks the delimiter, so this is backticked on MySQL and
	// double-quoted on Postgres and SQLite. It also splits on the dot, so
	// `subject.tenantId` becomes a qualified pair rather than one odd name.
	const column = table ? sql(`${table}.tenantId`) : sql('tenantId');

	return tenantId === undefined
		? sql`${column} is null`
		: sql`${column} = ${tenantId}`;
});

/** The tenant id, for writes that store it rather than filter on it. */
export const currentTenantId = Effect.map(Tenant, (scope) => scope.tenantId);
