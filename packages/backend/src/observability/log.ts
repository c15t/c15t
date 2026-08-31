/**
 * The request log, as an Effect service.
 *
 * RFC 0004 §5 replaces `@c15t/logger` in the backend with evlog: one **wide
 * event per request** carrying everything worth knowing about it, rather than
 * `logger.debug` calls scattered across 22 files. A wide event is queryable
 * in a way that a stream of prose lines is not — "which tenant's consent
 * writes are slow" is a filter, not a grep.
 *
 * ## Why a narrow interface rather than evlog's logger
 *
 * The service shape is `RequestLog`, two methods wide, not evlog's
 * `AuditableLogger`. Three reasons, in order of how much they matter:
 *
 * - Handlers depend on "somewhere to record fields", not on evlog. Swapping
 *   the backend, or running with none, changes this file and nothing else.
 * - The disabled case becomes a trivial no-op rather than a hand-written stub
 *   of somebody else's interface that drifts when they add a method.
 * - Tests assert against a recording implementation in three lines.
 *
 * ## Why it is a service and not a parameter
 *
 * evlog's Hono binding attaches the logger with `c.set('log', …)` and sets up
 * no async storage, so `useLogger()` does not work there — verified against
 * 2.22.4 rather than taken from the docs. The logger therefore has to be
 * carried explicitly, and Effect's Context is how this package already
 * carries request-scoped values (see `db/tenant.ts`). `makeRun` provides it
 * once per request, so a handler that wants to record a field just asks.
 */

import { Context, Effect, Layer } from 'effect';

/** Fields to merge into the current request's wide event. */
export type LogFields = Record<string, unknown>;

/**
 * Somewhere to record what happened during a request.
 *
 * Deliberately not a log-level API. There is one event per request; handlers
 * add facts to it and the middleware emits it once, so there is no `debug`
 * or `info` to choose between.
 */
export interface RequestLog {
	/** Merge fields into this request's event. */
	readonly set: (fields: LogFields) => void;
	/** Record that this request failed. */
	readonly error: (error: Error, fields?: LogFields) => void;
}

export class Log extends Context.Service<Log, RequestLog>()('Log') {}

/**
 * Records nothing.
 *
 * Not the default — `AppOptions.observability` defaults to `level: 'warn'`,
 * which is quiet for a successful request and prints a line for a failed one.
 * This is what you get by asking for `level: 'silent'`.
 *
 * It is also what non-request code gets: migrations, benchmarks and repository
 * tests have no wide event to attach to.
 */
export const silent: Layer.Layer<Log> = Layer.succeed(Log, {
	error: () => {
		/* empty */
	},
	set: () => {
		/* empty */
	},
});

/** Wraps a concrete logger — in practice evlog's, from `c.get('log')`. */
export const layer = (log: RequestLog): Layer.Layer<Log> =>
	Layer.succeed(Log, log);

/**
 * Records fields on the current request's event.
 *
 * @example
 * ```ts
 * yield* setFields({ consent: { created: true, id } });
 * ```
 */
export const setFields = (fields: LogFields): Effect.Effect<void, never, Log> =>
	Effect.map(Log, (log) => {
		log.set(fields);
	});
