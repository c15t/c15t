/**
 * evlog wiring for the Hono app.
 *
 * Everything that knows evlog exists lives here and in `./log.ts`. The rest of
 * the package sees the `Log` service.
 *
 * ## On by default, quiet by default
 *
 * Logging is **on** out of the box, because a backend that tells a new
 * self-hoster nothing when a request fails is a backend they debug with
 * guesswork. `@c15t/backend` 2.x defaults its logger to `level: 'error'`, so
 * it already reports failures; this keeps that and adds warnings.
 *
 * What it does *not* do by default is emit a line per successful request.
 * That is the part which would be a real change on upgrade — new stdout
 * volume and a bigger bill on a hosted log pipeline — and it is one option
 * away (`level: 'info'`) for anyone who wants the full wide-event stream.
 *
 * So the default is: **silence when things work, a line when they do not.**
 *
 * ## How the level is actually enforced
 *
 * Two mechanisms, because one is not enough, and the reason is worth knowing
 * before changing any of it.
 *
 * Hono catches a thrown handler error and turns it into a 500 *response*
 * rather than letting it propagate, so evlog's middleware sees a status and
 * never an exception. The wide event's level therefore stays `info` even for
 * a 500 — head sampling alone would drop the very requests worth keeping.
 *
 * - `gradeLevel` runs inside evlog's wrapper, reads the final status, and
 *   marks the event `warn` (4xx) or `error` (5xx) before it is emitted.
 * - A `keep` callback force-keeps anything from 400 up, so a failure survives
 *   head sampling regardless.
 *
 * Verified end to end rather than reasoned about: with `rates: { info: 0 }`
 * alone, a 500 was silently dropped.
 *
 * ## Redaction
 *
 * On by default whenever logging is on. This service handles IP addresses and
 * puts them on consent records, so the failure mode of forgetting is a
 * compliance incident rather than an untidy log. Turning it off is deliberate.
 */

import { initLogger } from 'evlog';
import type { AuditableLogger } from 'evlog';
import { evlog } from 'evlog/hono';
import type { EvlogHonoOptions } from 'evlog/hono';
import type { MiddlewareHandler } from 'hono';

import type { RequestLog } from './log';

/**
 * How much of the request stream reaches the log.
 *
 * - `silent` — nothing. No middleware is registered at all.
 * - `error` — failed requests only (5xx).
 * - `warn` — failures and rejections (4xx and 5xx). **The default.**
 * - `info` — every request, the full wide-event stream.
 * - `inherit` — leave evlog's global configuration alone and log whatever the
 *   host application already decided. For an app that configures evlog itself
 *   and does not want a library overriding it.
 */
export type ObservabilityLevel =
	| 'silent'
	| 'error'
	| 'warn'
	| 'info'
	| 'inherit';

export interface ObservabilityOptions {
	/** Defaults to `'warn'` — failures and rejections, nothing else. */
	readonly level?: ObservabilityLevel;
	/**
	 * Service name on every event.
	 *
	 * **Sets global evlog state**, as does any `level` other than `'inherit'`:
	 * evlog resolves sampling and service name from process-level
	 * configuration rather than per middleware. Two instances in one process
	 * share it, and the last one built wins. `level: 'inherit'` is the way out.
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
	/** Force-keeps an event that sampling would otherwise drop. */
	readonly keep?: EvlogHonoOptions['keep'];
}

const DEFAULT_LEVEL: ObservabilityLevel = 'warn';

/** The lowest status that counts as worth keeping, per level. */
const keepFrom: Record<Exclude<ObservabilityLevel, 'silent'>, number> = {
	error: 500,
	// Everything is kept anyway; the threshold is unreachable rather than
	// special-cased.
	info: 0,
	inherit: Number.POSITIVE_INFINITY,

	warn: 400,
};

/**
 * Head-sampling rates for a level.
 *
 * `undefined` means "do not touch the global configuration" — only
 * `'inherit'`, whose whole purpose is to leave the host's settings alone.
 */
const ratesFor = (
	level: ObservabilityLevel
): Record<string, number> | undefined => {
	switch (level) {
		case 'error':
			return { debug: 0, info: 0, warn: 0 };
		case 'warn':
			return { debug: 0, info: 0 };
		case 'info':
			return { debug: 100, info: 100, warn: 100 };
		default:
			return undefined;
	}
};

/**
 * Turns our options into evlog's.
 *
 * Separate from `middleware` so the defaults are assertable directly. Two of
 * them are policy rather than pass-through, and nothing else can catch either
 * regressing: `redact`, because no field this package sets on an event
 * contains PII today so an end-to-end test would pass either way; and `keep`,
 * because it is what stops the default level discarding failures.
 */
export const resolveOptions = function resolveOptions(
	options: ObservabilityOptions
): EvlogHonoOptions {
	const level = options.level ?? DEFAULT_LEVEL;
	const threshold =
		level === 'silent' ? Number.POSITIVE_INFINITY : keepFrom[level];
	const caller = options.keep;

	return {
		drain: options.drain,
		enrich: options.enrich,
		exclude: options.exclude ? [...options.exclude] : undefined,
		include: options.include ? [...options.include] : undefined,
		keep: async (ctx) => {
			if ((ctx.status ?? 200) >= threshold) {
				ctx.shouldKeep = true;
			}
			// The caller's own rule runs too, and can only ever keep more.
			await caller?.(ctx);
		},

		// Defaults on; see the file header.
		redact: options.redact ?? true,
	};
};

/**
 * Marks the event `warn` or `error` from the response status.
 *
 * Registered immediately after evlog's middleware so it runs *inside* that
 * wrapper: it needs the final status, and the event has to be graded before
 * evlog emits it.
 *
 * Without this every event is `info`, including 500s, because Hono answers a
 * thrown handler error with a response rather than propagating it.
 */
export const gradeLevel: MiddlewareHandler = async (c, runNext) => {
	await runNext();

	const log: AuditableLogger | undefined = c.get('log');
	if (log === undefined) {
		return;
	}

	const { status } = c.res;
	if (status >= 500) {
		log.setLevel('error');
	} else if (status >= 400) {
		log.setLevel('warn');
	}
};

/**
 * The middleware, or `undefined` when logging is off.
 *
 * `undefined` rather than a pass-through so `level: 'silent'` costs nothing
 * per request and does not appear in a stack trace.
 */
export const middleware = function middleware(
	options: ObservabilityOptions | undefined
): MiddlewareHandler | undefined {
	const level = options?.level ?? DEFAULT_LEVEL;
	if (level === 'silent') {
		return undefined;
	}

	const rates = ratesFor(level);
	if (rates !== undefined || options?.service !== undefined) {
		const loggerOptions: {
			env?: { service: string };
			sampling?: { rates: ReturnType<typeof ratesFor> };
		} = {};
		if (options?.service !== undefined) {
			loggerOptions.env = { service: options.service };
		}
		if (rates !== undefined) {
			loggerOptions.sampling = { rates };
		}
		initLogger(loggerOptions);
	}

	return evlog(resolveOptions(options ?? {}));
};

/**
 * Adapts evlog's request logger to the narrow `RequestLog` the app depends on.
 *
 * Tolerates its absence: when logging is off, or the route was skipped via
 * `include`/`exclude`, `c.get('log')` is undefined and handlers still need
 * somewhere to write.
 */
export const toRequestLog = function toRequestLog(
	logger: AuditableLogger | undefined
): RequestLog | undefined {
	if (logger === undefined) {
		return undefined;
	}
	return {
		error: (error, fields) => logger.error(error, fields),
		set: (fields) => logger.set(fields),
	};
};
