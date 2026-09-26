/**
 * A consent save the backend refused for good.
 *
 * Most failed saves are worth retrying: the network dropped, the backend
 * was down. Some are not. The backend answers these codes when the
 * evidence in the save can never be recorded, however often it is sent:
 *
 * - `POLICY_SNAPSHOT_EXPIRED`: the policy snapshot token had expired when
 *   the visitor chose, or the replay arrived after the backend's replay
 *   window.
 * - `POLICY_SNAPSHOT_INVALID`: the token does not verify.
 * - `POLICY_SNAPSHOT_REQUIRED`: the save carries no token and the backend
 *   requires one.
 * - `STALE_POLICY`: the policy the save names is no longer the one the
 *   backend has (reason `policy-changed`), or its decision inputs no
 *   longer resolve to it.
 *
 * Transports throw a {@link ConsentSaveRejectedError} for these, and the
 * kernel drops the save instead of queueing it for replay. The choice
 * stays recorded in the browser either way. A custom transport can throw
 * one too.
 */

const PERMANENT_REJECTION_CODES: ReadonlySet<string> = new Set([
	'POLICY_SNAPSHOT_EXPIRED',
	'POLICY_SNAPSHOT_INVALID',
	'POLICY_SNAPSHOT_REQUIRED',
	'STALE_POLICY',
]);

/**
 * Thrown by a transport's `save` when the backend refused the save and a
 * retry would be refused the same way. The kernel does not queue it.
 *
 * @example
 * ```ts
 * // In a custom transport: this save will never be accepted, so don't
 * // queue it for replay.
 * if (response.status === 410) {
 *   throw new ConsentSaveRejectedError({
 *     code: 'GONE',
 *     message: 'The consent endpoint no longer accepts this save',
 *     status: 410,
 *   });
 * }
 * ```
 */
export class ConsentSaveRejectedError extends Error {
	/** Brand checked by {@link isConsentSaveRejection} across bundle copies. */
	readonly c15tSaveRejected = true;
	/** The backend's `cause.code`, for example `POLICY_SNAPSHOT_EXPIRED`. */
	readonly code: string;
	/** The backend's `cause.reason`, when it gave one. */
	readonly reason: string | undefined;
	/** HTTP status of the refusal. */
	readonly status: number;

	constructor(options: {
		code: string;
		message: string;
		reason?: string;
		status: number;
	}) {
		super(options.message);
		this.name = 'ConsentSaveRejectedError';
		this.code = options.code;
		this.reason = options.reason;
		this.status = options.status;
	}
}

/**
 * Whether `error` is a save the backend refused for good. Checks a brand
 * rather than `instanceof`, so it holds across duplicated package copies.
 *
 * @param error - Anything a transport threw.
 * @returns `true` for a {@link ConsentSaveRejectedError}.
 */
export const isConsentSaveRejection = function isConsentSaveRejection(
	error: unknown
): error is ConsentSaveRejectedError {
	return (
		typeof error === 'object' &&
		error !== null &&
		(error as { c15tSaveRejected?: unknown }).c15tSaveRejected === true
	);
};

/**
 * The error to throw for a failed `POST /subjects` response: a
 * {@link ConsentSaveRejectedError} for a permanent refusal, otherwise a
 * plain `Error` the kernel retries.
 *
 * @param response - The non-2xx response.
 * @param label - Prefix for the error message, naming the transport.
 * @returns The error to throw.
 * @internal
 */
export const saveFailure = async function saveFailure(
	response: Response,
	label: string
): Promise<Error> {
	const message = `${label}: /subjects responded ${response.status} ${response.statusText}`;
	if (response.status !== 409 && response.status !== 422) {
		return new Error(message);
	}
	let cause: { code?: unknown; reason?: unknown } | undefined;
	try {
		cause = ((await response.json()) as { cause?: typeof cause })?.cause;
	} catch {
		// An unreadable body is not a refusal we can trust; retry it.
	}
	const code = typeof cause?.code === 'string' ? cause.code : undefined;
	if (!code || !PERMANENT_REJECTION_CODES.has(code)) {
		return new Error(message);
	}
	return new ConsentSaveRejectedError({
		code,
		message: `${message} (${code})`,
		reason: typeof cause?.reason === 'string' ? cause.reason : undefined,
		status: response.status,
	});
};
