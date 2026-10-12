/**
 * SQLite driver binding.
 *
 * `@effect/sql-sqlite-node` is an optional peer dependency; this module is the
 * only place in the package that imports it. See `./pg.ts` for the rationale.
 *
 * @example
 * ```ts
 * import { layer } from '@c15t/backend/sql/sqlite'
 *
 * const SqlLive = layer({ filename: 'c15t.db' })
 * ```
 */

export { SqliteClient, SqliteMigrator } from '@effect/sql-sqlite-node';
export { layer, layerConfig } from '@effect/sql-sqlite-node/SqliteClient';
