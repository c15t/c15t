/**
 * `@c15t/backend`, the self-hostable c15t consent backend.
 *
 * v3 is an Effect rewrite of the 2.x package. The design, the staging, and
 * the reasoning behind each decision live in
 * `internals/rfcs/0004-backend-effect-rewrite.md`.
 *
 * ```ts
 * import { c15tInstance } from '@c15t/backend';
 *
 * const instance = c15tInstance({
 * 	database: { dialect: 'postgres', url: process.env.DATABASE_URL },
 * 	trustedOrigins: ['https://app.example.com'],
 * });
 *
 * export const POST = (request: Request) => instance.handler(request);
 * ```
 *
 * ## Compared with 2.x
 *
 * The entry point is the same, `c15tInstance(options).handler(request)`, and
 * the 2.x routes keep their paths: `GET /init`, `GET /status`,
 * `GET /consents/check`, `GET|POST /subjects`, `GET|PATCH /subjects/:id` and
 * `PUT /legal-documents/:type/current`. v3 adds routes 2.x never had:
 *
 * - `GET /manifest`, the geo-independent consent manifest (RFC 0001).
 * - `POST /sessions`, the server-to-server report a host sends after it
 *   resolves init from a manifest. See `http/session.ts`.
 * - `GET /c15t.js`, `/c15t.iab.js` and `/c15t.headless.js`, the script-tag
 *   bundles with this backend's configuration baked in. On unless
 *   `script.enabled` is `false`; the paths are configurable. See
 *   `http/routes/script.ts`.
 *
 * The schema starts from the frozen 2.0.0 baseline and adds to it through
 * numbered migrations in `db/migrations/`: hot-path indexes, per-category
 * consent receipts and per-vendor choices. Run the migrator when upgrading.
 *
 * Configuration also changes:
 *
 * - **`database` replaces `adapter`.** 2.x took a fumadb adapter; storage here
 *   is a SQL client. Either `{ dialect, url }` or a `SqlClient` layer. See
 *   `db/connect.ts`.
 * - **The adapter subpaths are gone.** `@c15t/backend/db/adapters/*` no longer
 *   exists — Drizzle, Prisma, TypeORM, Kysely or Mongo. Those users keep their
 *   database and change only how c15t connects to it. MongoDB has no migration
 *   path at all (RFC §11.8).
 *
 * Database drivers are optional peers, reached through `./sql/*` or loaded on
 * demand by `database: { dialect }`. Domain code depends on `SqlClient` from
 * `effect/sql`, never on a driver package directly.
 *
 * Policy authoring is re-exported rather than reimplemented: the matchers,
 * presets and runtime inspection live in `@c15t/schema` and are shared with
 * every client framework, so a policy pack means the same thing on both sides
 * of the wire.
 */

// Shared with the client packages, so a policy pack authored against these
// resolves identically in the browser and on the server.
export type { PolicyMatch, PolicyRulePresets } from '@c15t/schema';
export {
	EEA_COUNTRY_CODES,
	EU_COUNTRY_CODES,
	inspectPolicyRules,
	policyMatchers,
	policyRulePresets,
	UK_COUNTRY_CODES,
} from '@c15t/schema';
export type { DatabaseClassification } from './db/classify';
// oxlint-disable anti-slop/no-shape-in-symbol-names -- Preserve the published v3 type alias while callers migrate.
/** @deprecated Use `DatabaseClassification` instead. */
export type { DatabaseClassification as Shape } from './db/classify';
// oxlint-enable anti-slop/no-shape-in-symbol-names
export { classify } from './db/classify';
export type { DatabaseConfig, DatabaseOption } from './db/connect';
export {
	DriverNotInstalledError,
	MissingDatabaseError,
	toLayer,
} from './db/connect';
export type { MigrateOptions, MigrateReport, Migration } from './db/migrate';
export { MIGRATIONS, migrate } from './db/migrate';
export { defineConfig } from './define-config';
export type { AppOptions } from './http/context';
export type {
	LegalDocumentSnapshotClaims,
	LegalDocumentSnapshotOptions,
} from './http/legal-document-snapshot';
export {
	createLegalDocumentSnapshotToken,
	verifyLegalDocumentSnapshotToken,
} from './http/legal-document-snapshot';
export type { C15TInstance, C15TOptions } from './instance';
export { c15tInstance } from './instance';
export type { Migrator } from './migrator';
export { createMigrator } from './migrator';
export type { ObservabilityOptions } from './observability/evlog';
export type { SessionOptions, SessionReportContext } from './http/session';
export type { PolicyBuilderInput } from './policy/builder';
export { composePacks, policyBuilder } from './policy/builder';
export { version } from './version';
