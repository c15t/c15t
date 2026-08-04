/**
 * `@c15t/backend-next` — the Effect rewrite of `@c15t/backend`.
 *
 * Developed in parallel with the shipping package and renamed to
 * `@c15t/backend` at cutover. The design, the staging, and the reasoning
 * behind each decision live in `internals/rfcs/0004-backend-effect-rewrite.md`.
 *
 * Two invariants hold for everything in this package:
 *
 * - **The 2.0.0 schema is frozen.** No schema changes before cutover. That is
 *   what makes this a provably behaviour-preserving rewrite rather than an
 *   open-ended one, and it is what lets the benchmark arms compare like for
 *   like (RFC §7).
 * - **Wire compatibility with `@c15t/backend` 2.x is a hard requirement.** No
 *   new endpoints, no response-shape changes.
 *
 * Database drivers are reached through the `./sql/*` subpaths, each of which
 * isolates one optional peer dependency. Domain code depends on `SqlClient`
 * from `effect/unstable/sql`, never on a driver package directly.
 */

export {};
