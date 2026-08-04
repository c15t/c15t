import { HTTPException } from 'hono/http-exception';
import type { WriteAbuseControl, WriteAbuseControlContext } from '~/types';

/** Stable outcomes from an application-provided abuse-control hook. */
export type WriteAbuseControlResult =
	| { status: 'allowed' }
	| {
			status: 'denied';
			reason?: string;
			retryAfterSeconds?: number;
	  }
	| { status: 'error'; error: unknown };

/** Stable error codes exposed by {@link enforceWriteAbuseControl}. */
export type WriteAbuseControlErrorCode =
	| 'WRITE_ABUSE_CONTROL_DENIED'
	| 'WRITE_ABUSE_CONTROL_UNAVAILABLE';

/** HTTP-compatible failure from write abuse controls. */
export class WriteAbuseControlError extends HTTPException {
	readonly code: WriteAbuseControlErrorCode;
	readonly retryAfterSeconds?: number;

	constructor(
		status: 429 | 503,
		code: WriteAbuseControlErrorCode,
		message: string,
		options: {
			reason?: string;
			retryAfterSeconds?: number;
			error?: unknown;
		} = {}
	) {
		super(status, {
			message,
			cause: {
				code,
				reason: options.reason,
				retryAfterSeconds: options.retryAfterSeconds,
				error: options.error,
			},
		});
		this.name = 'WriteAbuseControlError';
		this.code = code;
		this.retryAfterSeconds = options.retryAfterSeconds;
	}
}

function isValidRetryDelay(value: number | undefined): boolean {
	return (
		value === undefined ||
		(Number.isInteger(value) && Number.isFinite(value) && value >= 0)
	);
}

/**
 * Executes an abuse-control hook without leaking provider-specific errors into
 * control flow.
 *
 * Missing hooks allow the write, preserving legacy behavior. Thrown errors and
 * malformed decisions produce the stable `error` result so callers can fail
 * closed and emit consistent HTTP responses.
 *
 * @param control - Optional application-provided control
 * @param context - Trusted request context for the write
 * @returns Stable allow, deny, or error result
 */
export async function runWriteAbuseControl(
	control: WriteAbuseControl | undefined,
	context: WriteAbuseControlContext
): Promise<WriteAbuseControlResult> {
	if (!control) {
		return { status: 'allowed' };
	}

	try {
		const decision = await control(context);
		if (
			typeof decision !== 'object' ||
			decision === null ||
			typeof decision.allowed !== 'boolean' ||
			!isValidRetryDelay(decision.retryAfterSeconds)
		) {
			return {
				status: 'error',
				error: new TypeError('Abuse-control hook returned an invalid decision'),
			};
		}

		if (decision.allowed) {
			return { status: 'allowed' };
		}

		return {
			status: 'denied',
			reason: decision.reason,
			retryAfterSeconds: decision.retryAfterSeconds,
		};
	} catch (error) {
		return { status: 'error', error };
	}
}

/**
 * Runs configured abuse controls and throws an HTTP-compatible error unless
 * the write is allowed.
 *
 * @param control - Optional application-provided control
 * @param context - Trusted request context for the write
 * @returns The stable allowed result
 * @throws {WriteAbuseControlError} With 429 on denial or 503 on hook failure
 */
export async function enforceWriteAbuseControl(
	control: WriteAbuseControl | undefined,
	context: WriteAbuseControlContext
): Promise<{ status: 'allowed' }> {
	const result = await runWriteAbuseControl(control, context);

	if (result.status === 'denied') {
		throw new WriteAbuseControlError(
			429,
			'WRITE_ABUSE_CONTROL_DENIED',
			'Write rejected by abuse controls',
			result
		);
	}

	if (result.status === 'error') {
		throw new WriteAbuseControlError(
			503,
			'WRITE_ABUSE_CONTROL_UNAVAILABLE',
			'Write abuse controls are unavailable',
			{ error: result.error }
		);
	}

	return result;
}
