/**
 * Errors for a backend response that is not ok.
 *
 * A backend that refuses a request usually says why in a JSON body:
 * `{ message, code }`, or c15t's own `{ message, cause: { code, reason } }`.
 * These helpers read that body so the error says what the backend said,
 * not only the status. Over HTTP/2 `statusText` is empty, so without the
 * body an error reads `responded 429 ` and nothing more.
 *
 * @internal
 */

/** Bodies past this many bytes are not read further. */
const MAX_BODY_BYTES = 16 * 1024;
/** Stop waiting for a body after this long. */
const BODY_TIMEOUT_MS = 2000;
/** Longest backend message an error carries. */
const MAX_MESSAGE_LENGTH = 500;

/**
 * What a failed response's body said, when it said anything readable.
 *
 * @internal
 */
export interface FailedResponseDetail {
	/** `cause.code`, else the top-level `code`. */
	code?: string;
	/** The top-level `message`, cut to a bounded length. */
	message?: string;
	/** `cause.reason`. */
	reason?: string;
}

/**
 * An `Error` for a failed response, with the response's status and the
 * backend's code attached.
 *
 * @internal
 */
export type FailedResponseError = Error & {
	code?: string;
	status: number;
};

const readNonEmptyString = function readNonEmptyString(
	value: unknown
): string | undefined {
	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

/** Drop the rest of a body; an unread body would hold the connection. */
const dropRest = async function dropRest(
	reader: ReadableStreamDefaultReader<Uint8Array>
): Promise<void> {
	try {
		await reader.cancel();
	} catch {
		// Nothing left to release.
	}
};

const readStream = async function readStream(
	body: ReadableStream<Uint8Array>
): Promise<string> {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let text = '';
	let bytes = 0;
	const timer = { id: undefined as ReturnType<typeof setTimeout> | undefined };
	const timeout = new Promise<'timeout'>((resolve) => {
		timer.id = setTimeout(() => resolve('timeout'), BODY_TIMEOUT_MS);
	});
	try {
		while (bytes <= MAX_BODY_BYTES) {
			// oxlint-disable-next-line no-await-in-loop -- Chunks arrive in order.
			const chunk = await Promise.race([reader.read(), timeout]);
			if (chunk === 'timeout' || chunk.done) {
				break;
			}
			bytes += chunk.value.byteLength;
			text += decoder.decode(chunk.value, { stream: true });
		}
	} finally {
		clearTimeout(timer.id);
		// Not awaited: a stream that never ends may never finish cancelling.
		void dropRest(reader);
	}
	return bytes > MAX_BODY_BYTES ? '' : text + decoder.decode();
};

const readText = async function readText(response: Response): Promise<string> {
	if (response.body) {
		return await readStream(response.body);
	}
	return typeof response.text === 'function' ? await response.text() : '';
};

/**
 * Read the body of a failed response for the backend's message and code.
 *
 * Never throws. Reads at most 16 KiB and waits at most two seconds. A body
 * that is not JSON, or JSON without these fields, yields `{}`.
 *
 * @param response - The response that is not ok. Its body is consumed.
 * @returns The backend's message, code and reason, where present.
 * @internal
 */
export const readFailedResponse = async function readFailedResponse(
	response: Response
): Promise<FailedResponseDetail> {
	let parsed: unknown;
	try {
		parsed = JSON.parse(await readText(response));
	} catch {
		return {};
	}
	if (typeof parsed !== 'object' || parsed === null) {
		return {};
	}
	const body = parsed as {
		cause?: { code?: unknown; reason?: unknown } | null;
		code?: unknown;
		message?: unknown;
	};
	const cause =
		typeof body.cause === 'object' && body.cause !== null
			? body.cause
			: undefined;
	const detail: FailedResponseDetail = {};
	const code = readNonEmptyString(cause?.code) ?? readNonEmptyString(body.code);
	if (code) {
		detail.code = code;
	}
	const message = readNonEmptyString(body.message);
	if (message) {
		detail.message =
			message.length > MAX_MESSAGE_LENGTH
				? `${message.slice(0, MAX_MESSAGE_LENGTH - 1)}…`
				: message;
	}
	const reason = readNonEmptyString(cause?.reason);
	if (reason) {
		detail.reason = reason;
	}
	return detail;
};

/**
 * The error message for a failed response: `<prefix> responded <status>`,
 * then the backend's message and code when the body had them, else the
 * status text as before.
 *
 * @param prefix - Names the caller and route, such as
 * `c15t hosted transport: /init`.
 * @param response - The response that is not ok.
 * @param detail - What {@link readFailedResponse} read from its body.
 * @returns The message.
 * @internal
 */
export const describeFailedResponse = function describeFailedResponse(
	prefix: string,
	response: Response,
	detail: FailedResponseDetail
): string {
	const said = detail.message
		? `: ${detail.message}`
		: ` ${response.statusText ?? ''}`;
	const code = detail.code ? ` (${detail.code})` : '';
	return `${prefix} responded ${response.status}${said}${code}`;
};

/**
 * Build the error for a failed response, reading its body for the
 * backend's message and code.
 *
 * @param prefix - Names the caller and route, such as
 * `c15t hosted transport: /init`.
 * @param response - The response that is not ok. Its body is consumed.
 * @returns An `Error` carrying `status`, and `code` when the body had one.
 * @example
 * ```ts
 * if (!response.ok) {
 *   throw await failedResponseError('c15t hosted transport: /init', response);
 * }
 * // c15t hosted transport: /init responded 402: Your plan is out of
 * // consent sessions. (CONSENT_SESSIONS_EXHAUSTED)
 * ```
 * @internal
 */
export const failedResponseError = async function failedResponseError(
	prefix: string,
	response: Response
): Promise<FailedResponseError> {
	const detail = await readFailedResponse(response);
	const error: FailedResponseError = Object.assign(
		new Error(describeFailedResponse(prefix, response, detail)),
		{ status: response.status }
	);
	if (detail.code) {
		error.code = detail.code;
	}
	return error;
};
