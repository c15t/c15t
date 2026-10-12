/**
 * Sends one endpoint call: validation, auth, retries, timeouts and response
 * classification. Every outcome resolves as a result; nothing here throws to
 * the caller.
 */

import {
	POLICY_CONTRACT_HEADER,
	POLICY_CONTRACT_VERSION,
} from '@c15t/schema/types';

import type { C15tConfigurationIssue } from './configuration-error';
import { DecodeError } from './contract';
import type { Endpoint } from './contract';
import { C15tError, isStalePolicyReason } from './errors';
import type {
	C15tApiErrorCode,
	C15tClientErrorCode,
	C15tIssue,
	StalePolicyReason,
} from './errors';
import { decodeCallOptions } from './options';
import type {
	C15tRequestEvent,
	ResolvedCallOptions,
	ResolvedOptions,
	ResolvedRetry,
} from './options';
import { buildPath } from './path';
import type { C15tFailure, C15tResult, C15tSuccess } from './result';
import { version } from './version';

/** Statuses worth repeating for an idempotent request. */
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

/** Headers the client owns. Caller headers cannot replace them. */
const ownedHeaders = (
	options: ResolvedOptions,
	requestId: string,
	hasBody: boolean
): Record<string, string> => {
	const headers: Record<string, string> = {
		accept: 'application/json',
		[POLICY_CONTRACT_HEADER]: String(POLICY_CONTRACT_VERSION),
		'x-c15t-version': version,
		'x-request-id': requestId,
	};
	if (hasBody) {
		headers['content-type'] = 'application/json';
	}
	if (options.apiKey !== undefined) {
		headers.authorization = `Bearer ${options.apiKey}`;
	}
	return headers;
};

/** Lower-cases header names so the owned headers reliably win. */
const normalizeHeaders = (
	headers: Readonly<Record<string, string>>
): Record<string, string> =>
	Object.fromEntries(
		Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value])
	);

const buildUrl = (
	baseUrl: URL,
	path: string,
	query: Readonly<Record<string, string | undefined>> | undefined
): URL => {
	// `baseUrl` always ends in `/`, so a relative path keeps its prefix.
	const url = new URL(path.replace(/^\//u, ''), baseUrl);
	for (const [name, value] of Object.entries(query ?? {})) {
		if (value !== undefined) {
			url.searchParams.set(name, value);
		}
	}
	return url;
};

const emit = (options: ResolvedOptions, event: C15tRequestEvent): void => {
	try {
		options.onEvent?.(event);
	} catch {
		// An observer must not change the outcome of the call it observes.
	}
};

/**
 * Parses `Retry-After` as seconds or an HTTP date.
 *
 * @returns Milliseconds to wait, or `undefined` when absent or unreadable.
 */
const parseRetryAfter = (value: string | null): number | undefined => {
	if (value === null) {
		return undefined;
	}
	const trimmed = value.trim();
	if (/^\d+$/u.test(trimmed)) {
		return Number(trimmed) * 1000;
	}
	const date = Date.parse(trimmed);
	return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
};

/** Full-jitter exponential backoff. */
const backoff = (retry: ResolvedRetry, attempt: number): number =>
	Math.floor(
		Math.random() *
			Math.min(retry.maxDelayMs, retry.initialDelayMs * 2 ** attempt)
	);

/** Waits, resolving early with `false` when the signal aborts. */
const wait = (ms: number, signal: AbortSignal | undefined): Promise<boolean> =>
	new Promise((resolve) => {
		if (signal?.aborted) {
			resolve(false);
			return;
		}
		// Aborting `cleanup` removes the abort listener once the wait is over,
		// so a long-lived caller signal does not collect one per retry.
		const cleanup = new AbortController();
		const timer = setTimeout(() => {
			cleanup.abort();
			resolve(true);
		}, ms);
		signal?.addEventListener(
			'abort',
			() => {
				clearTimeout(timer);
				resolve(false);
			},
			{ once: true, signal: cleanup.signal }
		);
	});

interface ErrorBody {
	message?: string;
	code?: string;
	reason?: StalePolicyReason;
}

/** The backend's error body: `{ message, cause: { code, reason? } }`. */
const readErrorBody = (text: string): ErrorBody => {
	let body: unknown;
	try {
		body = JSON.parse(text);
	} catch {
		return {};
	}
	if (typeof body !== 'object' || body === null) {
		return {};
	}
	const { message, cause } = body as {
		message?: unknown;
		cause?: { code?: unknown; reason?: unknown };
	};
	const parsed: ErrorBody = {};
	if (typeof message === 'string') {
		parsed.message = message;
	}
	if (typeof cause?.code === 'string') {
		parsed.code = cause.code;
	}
	if (isStalePolicyReason(cause?.reason)) {
		parsed.reason = cause.reason;
	}
	return parsed;
};

type AttemptOutcome<Data, Code extends string> =
	| { readonly kind: 'done'; readonly result: C15tResult<Data, Code> }
	| {
			readonly kind: 'retry';
			readonly error: C15tError<Code | C15tClientErrorCode>;
			readonly retryAfterMs: number | undefined;
	  };

const failure = <Code extends string>(
	error: C15tError<Code>
): C15tFailure<Code> => ({ error, ok: false });

const invalidInput = (
	endpoint: { readonly name: string },
	cause: unknown
): C15tFailure<'INVALID_INPUT'> => {
	const message = cause instanceof Error ? cause.message : String(cause);
	return failure(
		new C15tError({
			cause,
			code: 'INVALID_INPUT',
			issues: [{ message }],
			message: `Invalid input for ${endpoint.name}: ${message}`,
		})
	);
};

const aborted = (
	endpoint: { readonly name: string },
	requestId: string,
	cause: unknown
): C15tFailure<'ABORTED'> =>
	failure(
		new C15tError({
			cause,
			code: 'ABORTED',
			message: `${endpoint.name} was aborted.`,
			requestId,
		})
	);

const describeIssues = (issues: readonly C15tIssue[]): string =>
	issues
		.slice(0, 5)
		.map((issue) =>
			issue.path && issue.path.length > 0
				? `${issue.path.map(String).join('.')}: ${issue.message}`
				: issue.message
		)
		.join('; ');

const decodeSuccess = <Input, Data, Code extends C15tApiErrorCode>(
	endpoint: Endpoint<string, Input, Data, Code>,
	response: Response,
	text: string,
	requestId: string,
	input: Input
): C15tResult<Data, Code> => {
	try {
		const body: unknown = text === '' ? null : JSON.parse(text);
		const success: C15tSuccess<Data> = {
			data: endpoint.decode(body, response, input),
			headers: response.headers,
			ok: true,
			requestId,
			status: response.status,
		};
		return success;
	} catch (error) {
		return failure(
			new C15tError({
				cause: error,
				code: 'UNEXPECTED_RESPONSE',
				message:
					error instanceof DecodeError
						? `${endpoint.name} returned a body without the documented shape: ${error.message}`
						: `${endpoint.name} returned a body that is not JSON.`,
				requestId,
				status: response.status,
			})
		);
	}
};

const classifyResponse = async <Input, Data, Code extends C15tApiErrorCode>(
	endpoint: Endpoint<string, Input, Data, Code>,
	response: Response,
	requestId: string,
	input: Input
): Promise<AttemptOutcome<Data, Code>> => {
	const text = await response.text();
	const accepts =
		endpoint.accepts ?? ((code: number) => code >= 200 && code < 300);

	if (accepts(response.status)) {
		return {
			kind: 'done',
			result: decodeSuccess(endpoint, response, text, requestId, input),
		};
	}

	const body = readErrorBody(text);
	const retryable = RETRYABLE_STATUSES.has(response.status);
	const declared =
		body.code !== undefined &&
		(endpoint.errorCodes as readonly string[]).includes(body.code);
	const error: C15tError<Code | 'UNEXPECTED_RESPONSE'> = declared
		? new C15tError<Code>({
				code: body.code as Code,
				message:
					body.message ?? `Request failed with status ${response.status}.`,
				reason: body.reason,
				requestId,
				retryable,
				status: response.status,
			})
		: new C15tError<'UNEXPECTED_RESPONSE'>({
				code: 'UNEXPECTED_RESPONSE',
				message:
					body.message ??
					`${endpoint.name} failed with status ${response.status}${
						body.code === undefined ? '' : ` and undocumented code ${body.code}`
					}.`,
				requestId,
				retryable,
				serverCode: body.code,
				status: response.status,
			});

	if (retryable && endpoint.idempotent) {
		return {
			error,
			kind: 'retry',
			retryAfterMs: parseRetryAfter(response.headers.get('retry-after')),
		};
	}
	return { kind: 'done', result: failure(error) };
};

/** Everything one call needs across its attempts. */
interface CallPlan<Input, Data, Code extends C15tApiErrorCode> {
	readonly options: ResolvedOptions;
	readonly input: Input;
	readonly endpoint: Endpoint<string, Input, Data, Code>;
	readonly call: ResolvedCallOptions;
	readonly url: URL;
	readonly init: Omit<RequestInit, 'signal'>;
}

/** Sends one attempt and classifies what came back. */
const attemptOnce = async <Input, Data, Code extends C15tApiErrorCode>(
	plan: CallPlan<Input, Data, Code>,
	attempt: number
): Promise<AttemptOutcome<Data, Code>> => {
	const { call, endpoint, options } = plan;
	let timeout: AbortSignal | undefined;
	const eventBase = {
		attempt,
		method: endpoint.method,
		path: endpoint.path,
		requestId: call.requestId,
	} as const;
	const startedAt = Date.now();
	emit(options, { ...eventBase, type: 'request' });

	try {
		timeout = AbortSignal.timeout(call.timeoutMs);
		const signal =
			call.signal === undefined
				? timeout
				: AbortSignal.any([call.signal, timeout]);
		const response = await options.fetch(plan.url, { ...plan.init, signal });
		// The body is read under the same signal, so the timeout covers it.
		const outcome = await classifyResponse(
			endpoint,
			response,
			call.requestId,
			plan.input
		);
		emit(options, {
			...eventBase,
			durationMs: Date.now() - startedAt,
			status: response.status,
			type: 'response',
		});
		return outcome;
	} catch (error) {
		if (call.signal?.aborted) {
			return {
				kind: 'done',
				result: aborted(endpoint, call.requestId, error),
			};
		}
		if (timeout === undefined) {
			return { kind: 'done', result: invalidInput(endpoint, error) };
		}
		const timedOut = timeout.aborted;
		const transportError = new C15tError({
			cause: error,
			code: timedOut ? 'TIMEOUT' : 'NETWORK_ERROR',
			message: timedOut
				? `${endpoint.name} timed out after ${call.timeoutMs}ms.`
				: `${endpoint.name} failed before a response arrived: ${
						error instanceof Error ? error.message : String(error)
					}`,
			requestId: call.requestId,
			retryable: true,
		});
		return endpoint.idempotent
			? { error: transportError, kind: 'retry', retryAfterMs: undefined }
			: { kind: 'done', result: failure(transportError) };
	}
};

/** Runs attempts until one is final or the retry budget is spent. */
const runAttempts = async <Input, Data, Code extends C15tApiErrorCode>(
	plan: CallPlan<Input, Data, Code>,
	attempt: number
): Promise<C15tResult<Data, Code>> => {
	const { call, endpoint, options } = plan;
	if (call.signal?.aborted) {
		return aborted(endpoint, call.requestId, call.signal.reason);
	}

	const outcome = await attemptOnce(plan, attempt);
	if (outcome.kind === 'done') {
		return outcome.result;
	}

	const delayMs = outcome.retryAfterMs ?? backoff(call.retry, attempt);
	if (attempt >= call.retry.maxRetries || delayMs > call.retry.maxDelayMs) {
		return failure(outcome.error);
	}
	emit(options, {
		attempt,
		delayMs,
		error: outcome.error as C15tError,
		method: endpoint.method,
		path: endpoint.path,
		requestId: call.requestId,
		type: 'retry',
	});
	if (!(await wait(delayMs, call.signal))) {
		return aborted(endpoint, call.requestId, call.signal?.reason);
	}
	return runAttempts(plan, attempt + 1);
};

/** Validates the input and call options; an empty list means send. */
const collectIssues = async <Input>(
	endpoint: {
		readonly validate: (input: Input) => Promise<readonly C15tIssue[]>;
	},
	input: Input,
	optionIssues: readonly C15tConfigurationIssue[]
): Promise<readonly C15tIssue[]> => {
	const fromOptions = optionIssues.map((issue) => ({
		message: issue.message,
		path: issue.option.split('.'),
	}));
	try {
		return [...fromOptions, ...(await endpoint.validate(input))];
	} catch (error) {
		// Validation runs on caller-supplied values; anything it trips over is
		// the input's problem, not a reason to reject.
		return [
			...fromOptions,
			{ message: error instanceof Error ? error.message : String(error) },
		];
	}
};

/**
 * Calls one endpoint.
 *
 * @param options - Decoded client options.
 * @param endpoint - The route to call.
 * @param input - The endpoint's input, validated before anything is sent.
 * @param rawCallOptions - The caller's per-call options, decoded here.
 * @returns The call's result. Never rejects.
 */
export const send = async function send<
	Path extends string,
	Input,
	Data,
	Code extends C15tApiErrorCode,
>(
	options: ResolvedOptions,
	endpoint: Endpoint<Path, Input, Data, Code>,
	input: Input,
	rawCallOptions: unknown
): Promise<C15tResult<Data, Code>> {
	try {
		const optionIssues: C15tConfigurationIssue[] = [];
		const call = decodeCallOptions(rawCallOptions, options, optionIssues);

		const issues = await collectIssues(endpoint, input, optionIssues);
		if (issues.length > 0) {
			return failure(
				new C15tError({
					code: 'INVALID_INPUT',
					issues,
					message: `Invalid input for ${endpoint.name}: ${describeIssues(issues)}`,
				})
			);
		}

		if (endpoint.auth === 'api-key' && options.apiKey === undefined) {
			return failure(
				new C15tError({
					code: 'MISSING_API_KEY',
					message: `${endpoint.name} needs an API key. Pass apiKey to createC15tClient.`,
				})
			);
		}

		const prepared = endpoint.prepare(input);
		const hasBody = prepared.body !== undefined;
		const init: RequestInit = {
			headers: {
				...normalizeHeaders(call.headers),
				...normalizeHeaders(prepared.headers ?? {}),
				...ownedHeaders(options, call.requestId, hasBody),
			},
			method: endpoint.method,
		};
		if (hasBody) {
			init.body = JSON.stringify(prepared.body);
		}

		return runAttempts(
			{
				call,
				endpoint: endpoint as Endpoint<string, Input, Data, Code>,
				init,
				input,
				options,
				url: buildUrl(
					options.baseUrl,
					buildPath(endpoint.path, prepared.params),
					prepared.query
				),
			},
			0
		);
	} catch (error) {
		return invalidInput(endpoint, error);
	}
};
