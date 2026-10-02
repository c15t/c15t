import { C15tConfigurationError } from './configuration-error';
import type { C15tConfigurationIssue } from './configuration-error';
import type { C15tError } from './errors';

/** Retry behaviour for idempotent endpoints. */
export interface C15tRetryOptions {
	/**
	 * Attempts after the first, for retryable failures only.
	 * @default 2
	 */
	readonly maxRetries?: number;
	/**
	 * Upper bound of the first backoff, in milliseconds. Each retry doubles it,
	 * and the actual delay is a random value below the bound (full jitter).
	 * Must be an integer from 0 to 2147483647.
	 * @default 200
	 */
	readonly initialDelayMs?: number;
	/**
	 * Longest the client waits before a retry, in milliseconds. A
	 * `Retry-After` longer than this ends retrying instead.
	 * Must be an integer from 0 to 2147483647.
	 * @default 5000
	 */
	readonly maxDelayMs?: number;
}

/** What happened during one call, for logging and metrics. */
export type C15tRequestEvent =
	| {
			readonly type: 'request';
			readonly method: string;
			readonly path: string;
			readonly requestId: string;
			/** 0 for the first attempt. */
			readonly attempt: number;
	  }
	| {
			readonly type: 'response';
			readonly method: string;
			readonly path: string;
			readonly requestId: string;
			readonly attempt: number;
			readonly status: number;
			readonly durationMs: number;
	  }
	| {
			readonly type: 'retry';
			readonly method: string;
			readonly path: string;
			readonly requestId: string;
			/** The attempt that failed. */
			readonly attempt: number;
			readonly delayMs: number;
			readonly error: C15tError;
	  };

/** Options for {@link createC15tClient}. */
export interface C15tClientOptions {
	/**
	 * Where the c15t backend is mounted, path included, such as
	 * `https://example.com/api/c15t` or your hosted instance URL.
	 */
	readonly baseUrl: string | URL;
	/**
	 * API key, sent as `Authorization: Bearer`. Required for
	 * `subjects.list`, `experiments.summary` and `legalDocuments.publish`;
	 * a client created without one does not have those methods.
	 *
	 * The client reads no environment variables. Pass the key explicitly.
	 */
	readonly apiKey?: string | undefined;
	/**
	 * `fetch` implementation. Defaults to `globalThis.fetch`. Use it for
	 * tracing, proxies or tests.
	 */
	readonly fetch?: typeof globalThis.fetch;
	/** Headers sent with every request. */
	readonly headers?: Readonly<Record<string, string>>;
	/**
	 * Deadline for one attempt in milliseconds, response body included.
	 * Must be an integer from 1 to 2147483647.
	 * @default 10000
	 */
	readonly timeoutMs?: number;
	/**
	 * Retry behaviour for idempotent endpoints, or `false` to never retry.
	 */
	readonly retry?: C15tRetryOptions | false;
	/**
	 * Called for each request, response and retry. Errors it throws are
	 * ignored.
	 */
	readonly onEvent?: (event: C15tRequestEvent) => void;
}

/** Options accepted by every method as its last argument. */
export interface C15tCallOptions {
	/** Aborts the call, including a pending retry. Resolves as `ABORTED`. */
	readonly signal?: AbortSignal;
	/** Overrides the client's `timeoutMs` for this call. */
	readonly timeoutMs?: number;
	/** Headers for this call, merged over the client's. */
	readonly headers?: Readonly<Record<string, string>>;
	/** Overrides the client's retry behaviour for this call. */
	readonly retry?: C15tRetryOptions | false;
	/**
	 * `x-request-id` to send, such as the id of the request being handled.
	 * Defaults to a random UUID.
	 */
	readonly requestId?: string;
}

/** Retry settings with every default applied. */
export interface ResolvedRetry {
	readonly maxRetries: number;
	readonly initialDelayMs: number;
	readonly maxDelayMs: number;
}

/** Client options after decoding. */
export interface ResolvedOptions {
	readonly baseUrl: URL;
	readonly apiKey: string | undefined;
	readonly fetch: typeof globalThis.fetch;
	readonly headers: Readonly<Record<string, string>>;
	readonly timeoutMs: number;
	readonly retry: ResolvedRetry;
	readonly onEvent: ((event: C15tRequestEvent) => void) | undefined;
}

export const DEFAULT_TIMEOUT_MS = 10_000;
export const MAX_RETRIES_LIMIT = 10;
// Node clamps larger timer delays to 1ms, including AbortSignal.timeout.
const MAX_TIMER_DELAY_MS = 2_147_483_647;
export const NO_RETRY: ResolvedRetry = {
	initialDelayMs: 0,
	maxDelayMs: 0,
	maxRetries: 0,
};
const DEFAULT_RETRY: ResolvedRetry = {
	initialDelayMs: 200,
	maxDelayMs: 5000,
	maxRetries: 2,
};

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonNegativeInteger = (value: unknown): value is number =>
	typeof value === 'number' && Number.isInteger(value) && value >= 0;

const isTimerDelay = (value: unknown): value is number =>
	isNonNegativeInteger(value) && value <= MAX_TIMER_DELAY_MS;

const isTimeout = (value: unknown): value is number =>
	isTimerDelay(value) && value > 0;

const decodeBaseUrl = (
	value: unknown,
	hasApiKey: boolean,
	issues: C15tConfigurationIssue[]
): URL | undefined => {
	if (typeof value !== 'string' && !(value instanceof URL)) {
		issues.push({
			message: 'Pass the backend URL as a string or URL.',
			option: 'baseUrl',
		});
		return undefined;
	}
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		issues.push({
			message: `"${String(value)}" is not an absolute URL. Include the scheme, such as https://example.com/api/c15t.`,
			option: 'baseUrl',
		});
		return undefined;
	}
	if (url.protocol !== 'https:' && url.protocol !== 'http:') {
		issues.push({
			message: `Use an http: or https: URL, not ${url.protocol}.`,
			option: 'baseUrl',
		});
		return undefined;
	}
	if (url.search !== '' || url.hash !== '') {
		issues.push({
			message: 'Remove the query string and fragment from the base URL.',
			option: 'baseUrl',
		});
		return undefined;
	}
	if (
		hasApiKey &&
		url.protocol === 'http:' &&
		!LOOPBACK_HOSTS.has(url.hostname)
	) {
		issues.push({
			message:
				'Use https: when sending an API key. Plain http: is accepted only for localhost, 127.0.0.1 and [::1], because anywhere else the key travels in the clear.',
			option: 'baseUrl',
		});
		return undefined;
	}
	if (!url.pathname.endsWith('/')) {
		url.pathname = `${url.pathname}/`;
	}
	return url;
};

const decodeHeaders = (
	value: unknown,
	option: string,
	issues: C15tConfigurationIssue[]
): Readonly<Record<string, string>> => {
	if (value === undefined) {
		return {};
	}
	if (
		!isRecord(value) ||
		!Object.values(value).every((entry) => typeof entry === 'string')
	) {
		issues.push({
			message: 'Pass headers as an object of string values.',
			option,
		});
		return {};
	}
	return value as Readonly<Record<string, string>>;
};

/**
 * Decodes retry options. Shared with per-call options, which is why it takes
 * the option path to report.
 */
export const decodeRetry = function decodeRetry(
	value: unknown,
	option: string,
	issues: C15tConfigurationIssue[],
	fallback: ResolvedRetry = DEFAULT_RETRY
): ResolvedRetry {
	if (value === undefined) {
		return fallback;
	}
	if (value === false) {
		return NO_RETRY;
	}
	if (!isRecord(value)) {
		issues.push({
			message: 'Pass retry options as an object, or false to disable retries.',
			option,
		});
		return fallback;
	}
	// A partial override keeps the fields it leaves out: per-call options fall
	// back to the client's settings, unless the client disabled retries.
	const base = fallback === NO_RETRY ? DEFAULT_RETRY : fallback;
	const maxRetries = value.maxRetries ?? base.maxRetries;
	const initialDelayMs = value.initialDelayMs ?? base.initialDelayMs;
	const maxDelayMs = value.maxDelayMs ?? base.maxDelayMs;
	let valid = true;
	if (!isNonNegativeInteger(maxRetries) || maxRetries > MAX_RETRIES_LIMIT) {
		issues.push({
			message: `Use an integer from 0 to ${MAX_RETRIES_LIMIT}.`,
			option: `${option}.maxRetries`,
		});
		valid = false;
	}
	if (!isTimerDelay(initialDelayMs)) {
		issues.push({
			message: `Use an integer from 0 to ${MAX_TIMER_DELAY_MS} milliseconds.`,
			option: `${option}.initialDelayMs`,
		});
		valid = false;
	}
	if (!isTimerDelay(maxDelayMs)) {
		issues.push({
			message: `Use an integer from 0 to ${MAX_TIMER_DELAY_MS} milliseconds.`,
			option: `${option}.maxDelayMs`,
		});
		valid = false;
	}
	if (!valid) {
		return fallback;
	}
	return {
		initialDelayMs: initialDelayMs as number,
		maxDelayMs: maxDelayMs as number,
		maxRetries: maxRetries as number,
	};
};

/**
 * Decodes client options from `unknown`.
 *
 * TypeScript catches most mistakes at the call site, but JavaScript callers
 * and options assembled at runtime reach the same code, so every option is
 * checked here and every problem is reported in one throw.
 *
 * @throws {C15tConfigurationError} When any option is invalid.
 */
export const decodeOptions = function decodeOptions(
	options: unknown
): ResolvedOptions {
	const issues: C15tConfigurationIssue[] = [];
	if (!isRecord(options)) {
		throw new C15tConfigurationError([
			{
				message: 'Pass an options object with at least baseUrl.',
				option: 'options',
			},
		]);
	}

	let apiKey: string | undefined;
	if (options.apiKey !== undefined) {
		if (typeof options.apiKey === 'string' && options.apiKey.trim() !== '') {
			({ apiKey } = options as { apiKey: string });
		} else {
			issues.push({
				message:
					'Pass the API key as a non-empty string, or leave it out for a client without key-only methods.',
				option: 'apiKey',
			});
		}
	}

	const baseUrl = decodeBaseUrl(
		options.baseUrl,
		options.apiKey !== undefined,
		issues
	);

	const fetchImpl = options.fetch ?? globalThis.fetch;
	if (typeof fetchImpl !== 'function') {
		issues.push({
			message:
				'Pass a fetch function. This runtime has no global fetch, so it must be provided.',
			option: 'fetch',
		});
	}

	const headers = decodeHeaders(options.headers, 'headers', issues);

	const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	if (!isTimeout(timeoutMs)) {
		issues.push({
			message: `Use an integer from 1 to ${MAX_TIMER_DELAY_MS} milliseconds.`,
			option: 'timeoutMs',
		});
	}

	const retry = decodeRetry(options.retry, 'retry', issues);

	if (options.onEvent !== undefined && typeof options.onEvent !== 'function') {
		issues.push({ message: 'Pass a function.', option: 'onEvent' });
	}

	if (issues.length > 0 || baseUrl === undefined) {
		throw new C15tConfigurationError(issues);
	}

	return {
		apiKey,
		baseUrl,
		// Called as a plain function: native fetch on Workers and in browsers
		// throws "Illegal invocation" when `this` is any other object.
		fetch: (input, init) => (fetchImpl as typeof globalThis.fetch)(input, init),
		headers,
		onEvent: options.onEvent as ResolvedOptions['onEvent'],
		retry,
		timeoutMs: timeoutMs as number,
	};
};

/** Call options after decoding, with client defaults applied. */
export interface ResolvedCallOptions {
	readonly signal: AbortSignal | undefined;
	readonly timeoutMs: number;
	readonly headers: Readonly<Record<string, string>>;
	readonly retry: ResolvedRetry;
	readonly requestId: string;
}

/**
 * Decodes per-call options. Unlike client options, a bad value here is
 * reported as an `INVALID_INPUT` result rather than thrown, because methods
 * never throw.
 */
export const decodeCallOptions = function decodeCallOptions(
	value: unknown,
	client: ResolvedOptions,
	issues: C15tConfigurationIssue[]
): ResolvedCallOptions {
	const options = isRecord(value) ? value : {};
	if (value !== undefined && !isRecord(value)) {
		issues.push({
			message: 'Pass call options as an object.',
			option: 'options',
		});
	}
	const { signal } = options;
	if (signal !== undefined && !(signal instanceof AbortSignal)) {
		issues.push({ message: 'Pass an AbortSignal.', option: 'options.signal' });
	}
	const timeoutMs = options.timeoutMs ?? client.timeoutMs;
	if (!isTimeout(timeoutMs)) {
		issues.push({
			message: `Use an integer from 1 to ${MAX_TIMER_DELAY_MS} milliseconds.`,
			option: 'options.timeoutMs',
		});
	}
	const requestId = options.requestId ?? crypto.randomUUID();
	if (typeof requestId !== 'string' || requestId === '') {
		issues.push({
			message: 'Use a non-empty string.',
			option: 'options.requestId',
		});
	}
	return {
		headers: {
			...client.headers,
			...decodeHeaders(options.headers, 'options.headers', issues),
		},
		requestId: typeof requestId === 'string' ? requestId : '',
		retry: decodeRetry(options.retry, 'options.retry', issues, client.retry),
		signal: signal instanceof AbortSignal ? signal : undefined,
		timeoutMs: isTimeout(timeoutMs) ? timeoutMs : client.timeoutMs,
	};
};
