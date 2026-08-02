/**
 * evlog wiring for the Hono app.
 *
 * Everything that knows evlog exists lives here and in `./log.ts`. The rest of
 * the package sees the `Log` service.
 *
 * ## Opt-in, and why
 *
 * `@c15t/backend` builds its logger with `level ?? 'error'`, so a default
 * deployment emits nothing per request. This package is a drop-in replacement
 * for it, so turning on a wide event per request by default would change
 * observable behaviour at cutover — new stdout volume, and potentially new
 * cost, for someone who only upgraded a version. `observability.enabled` is
 * therefore `false` unless asked for.
 *
 * Redaction is the opposite: on by default whenever logging is on. This
 * service handles IP addresses and puts them on consent records, so the
 * failure mode of forgetting is a compliance incident rather than an untidy
 * log. Turning it off has to be deliberate.
 */

import { type AuditableLogger, initLogger } from 'evlog';
import { type EvlogHonoOptions, evlog } from 'evlog/hono';
import type { MiddlewareHandler } from 'hono';
import type { RequestLog } from './log';

export interface ObservabilityOptions {
	/**
	 * Emit one wide event per request.
	 *
	 * Off by default, matching `@c15t/backend`'s error-only logger. See the
	 * note at the top of this file.
	 */
	readonly enabled?: boolean;
	/**
	 * Service name on every event.
	 *
	 * **Sets global evlog state** via `initLogger`, because evlog resolves the
	 * service name from process-level configuration rather than per
	 * middleware. Left unset, whatever the host application configured wins —
	 * which is the right default for an embedded backend, and the reason this
	 * is not defaulted to `'c15t'`.
	 */
	readonly service?: string;
	/** Route globs to log. Unset logs every route. */
	readonly include?: readonly string[];
	/** Route globs to skip. Takes precedence over `include`. */
	readonly exclude?: readonly string[];
	/**
	 * PII auto-redaction — email, IPv4, JWT, bearer tokens.
	 *
	 * On unless explicitly disabled.
	 */
	readonly redact?: EvlogHonoOptions['redact'];
	/** Where events go. Console when unset. */
	readonly drain?: EvlogHonoOptions['drain'];
	/** Adds fields to every event after emit, before drain. */
	readonly enrich?: EvlogHonoOptions['enrich'];
	/** Tail sampling — force-keep an event that would otherwise be dropped. */
	readonly keep?: EvlogHonoOptions['keep'];
}

/**
 * Turns our options into evlog's.
 *
 * Separate from `middleware` so the defaults are assertable directly. The one
 * that matters is `redact`, which is a policy decision rather than a
 * pass-through, and which nothing else can catch regressing: no field this
 * package currently sets on an event contains PII, so an end-to-end test of
 * redaction would pass whether it were on or off.
 */
export function resolveOptions(
	options: ObservabilityOptions
): EvlogHonoOptions {
	return {
		include: options.include ? [...options.include] : undefined,
		exclude: options.exclude ? [...options.exclude] : undefined,
		// Defaults on; see the file header.
		redact: options.redact ?? true,
		drain: options.drain,
		enrich: options.enrich,
		keep: options.keep,
	};
}

/**
 * The middleware, or `undefined` when observability is off.
 *
 * `undefined` rather than a pass-through middleware so the disabled path costs
 * nothing per request and does not appear in a stack trace.
 */
export function middleware(
	options: ObservabilityOptions | undefined
): MiddlewareHandler | undefined {
	if (options?.enabled !== true) {
		return undefined;
	}

	if (options.service !== undefined) {
		initLogger({ env: { service: options.service } });
	}

	return evlog(resolveOptions(options));
}

/**
 * Adapts evlog's request logger to the narrow `RequestLog` the app depends on.
 *
 * Tolerates its absence: when the middleware is not registered, or skipped the
 * route via `include`/`exclude`, `c.get('log')` is undefined and handlers
 * still need somewhere to write.
 */
export function toRequestLog(
	logger: AuditableLogger | undefined
): RequestLog | undefined {
	if (logger === undefined) {
		return undefined;
	}
	return {
		set: (fields) => logger.set(fields),
		error: (error, fields) => logger.error(error, fields),
	};
}
