/**
 * MySQL driver binding.
 *
 * `@effect/sql-mysql2` is an optional peer dependency; this module is the only
 * place in the package that imports it. See `./pg.ts` for the rationale.
 *
 * Two MySQL-specific constraints that downstream code must respect, both
 * recorded in RFC 0004:
 *
 * - **DDL is not transactional.** Migration steps cannot be rolled back as a
 *   unit the way they can on Postgres and SQLite, so the migrator checkpoints
 *   per step instead of wrapping a batch (§3.3).
 * - **TEXT and BLOB columns cannot be indexed without a prefix length.** This
 *   is exactly what breaks fumadb's MySQL migration today (§3.5), so any
 *   indexed string column must be a bounded `varchar`, never `text`.
 *
 * @example
 * ```ts
 * import { layer } from '@c15t/backend-next/sql/mysql'
 *
 * const SqlLive = layer({ url: process.env.DATABASE_URL })
 * ```
 */

export { MysqlClient, MysqlMigrator } from '@effect/sql-mysql2';
export { layer, layerConfig } from '@effect/sql-mysql2/MysqlClient';
