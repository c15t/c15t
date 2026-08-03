/**
 * PostgreSQL driver binding.
 *
 * `@effect/sql-pg` is an optional peer dependency: a self-hoster installs the
 * one driver their database needs, not all three. This module is the only
 * place in the package that imports it, so the optional boundary is a single
 * file rather than a constraint scattered through the codebase.
 *
 * Everything downstream depends on `SqlClient` from `effect/unstable/sql`, not
 * on this module — see `src/sql/README` guidance in RFC 0004 §2. Composition
 * happens once, at the runtime edge.
 *
 * @example
 * ```ts
 * import { layer } from '@c15t/backend/sql/pg'
 *
 * const SqlLive = layer({ url: process.env.DATABASE_URL })
 * ```
 */

export { PgClient, PgMigrator } from '@effect/sql-pg';
export { layer, layerConfig } from '@effect/sql-pg/PgClient';
