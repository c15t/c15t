/**
 * Signed policy decisions. The token binds a policy ID and canonical fingerprint
 * to the request context and tenant. Saves validate that fingerprint against the
 * current manifest before using its rule.
 *
 * ## Late saves
 *
 * A browser that could not deliver a save queues it and replays it later
 * (on the next page load or when it comes back online), with the click time
 * as `givenAt` and the token it had then. That replay can arrive after the
 * token expired. It is accepted when the token was valid at the decision:
 * the signature, issuer and tenant audience verify, `givenAt` falls within
 * the token's lifetime (with {@link DECISION_CLOCK_TOLERANCE_SECONDS} for
 * client clocks), and the request arrives no later than
 * {@link PolicySnapshotOptions.replayWindowSeconds} after expiry. The
 * submission must still name the policy the current manifest has under that
 * fingerprint, so a replay is never recorded against a policy the visitor
 * did not see.
 */

import { jwtVerify, SignJWT } from 'jose';

const JWT_HEADER = { alg: 'HS256', typ: 'JWT' } as const;
const DEFAULT_ISSUER = 'c15t';
const DEFAULT_AUDIENCE = 'c15t-policy-snapshot';
const DEFAULT_TTL_SECONDS = 1800;
/** Matches how long the browser keeps a failed save for replay. */
const DEFAULT_REPLAY_WINDOW_SECONDS = 7 * 24 * 60 * 60;
/**
 * Slack for a client clock that disagrees with the server's when a late save
 * says when the visitor decided.
 */
export const DECISION_CLOCK_TOLERANCE_SECONDS = 600;

export interface PolicySnapshotOptions {
	readonly signingKey?: string;
	readonly issuer?: string;
	readonly audience?: string;
	readonly ttlSeconds?: number;
	/**
	 * How long after a token expires a save made while it was valid is
	 * still accepted, in seconds. Set `0` to reject every save that arrives
	 * after expiry.
	 *
	 * @default 604800 (7 days, how long the browser keeps a failed save)
	 */
	readonly replayWindowSeconds?: number;
}

export interface PolicySnapshotClaims {
	readonly policyId: string;
	readonly fingerprint: string;
	readonly matchedBy: string;
	readonly country: string | null;
	readonly region: string | null;
	readonly jurisdiction: string;
	readonly model: string;
	readonly tenantId?: string;
	readonly language?: string;
}

const resolveIssuer = function resolveIssuer(
	options: PolicySnapshotOptions
): string {
	return options.issuer?.trim() || DEFAULT_ISSUER;
};

/**
 * Audience is tenant-scoped when a tenant is known.
 *
 * That is what stops a token minted for one tenant verifying against another —
 * without it a snapshot would be portable across tenants, which for signed
 * evidence is a confused-deputy problem rather than a convenience.
 */
const resolveAudience = function resolveAudience(
	options: PolicySnapshotOptions,
	tenantId: string | undefined
): string {
	const configured = options.audience?.trim();
	if (configured) {
		return configured;
	}
	return tenantId ? `${DEFAULT_AUDIENCE}:${tenantId}` : DEFAULT_AUDIENCE;
};

const signingKey = (secret: string): Uint8Array =>
	new TextEncoder().encode(secret);

/**
 * Mints a snapshot token, or returns undefined when signing is not configured.
 *
 * No signing key means no token rather than an unsigned one: evidence that
 * cannot be verified is worse than absent evidence, because a caller may treat
 * its presence as meaningful.
 */
export const createPolicySnapshotToken =
	async function createPolicySnapshotToken(
		claims: PolicySnapshotClaims,
		options: PolicySnapshotOptions | undefined
	): Promise<{ token: string; payload: Record<string, unknown> } | undefined> {
		if (!options?.signingKey) {
			return undefined;
		}

		const iat = Math.floor(Date.now() / 1000);
		const exp = iat + (options.ttlSeconds ?? DEFAULT_TTL_SECONDS);

		const payload = {
			aud: resolveAudience(options, claims.tenantId),
			country: claims.country,
			exp,
			fingerprint: claims.fingerprint,
			iat,
			iss: resolveIssuer(options),
			jurisdiction: claims.jurisdiction,
			language: claims.language,
			matchedBy: claims.matchedBy,
			model: claims.model,
			policyId: claims.policyId,
			region: claims.region,
			sub: claims.policyId,
			tenantId: claims.tenantId,
		};

		const token = await new SignJWT(payload)
			.setProtectedHeader(JWT_HEADER)
			.setIssuedAt(iat)
			.setExpirationTime(exp)
			.sign(signingKey(options.signingKey));

		return { payload, token };
	};

/** When a save says the visitor decided, and when it arrived. */
export interface SnapshotTiming {
	/** The submission's `givenAt`, epoch milliseconds. */
	readonly decidedAt: number;
	/** Server clock at the request, epoch milliseconds. */
	readonly receivedAt: number;
}

export type SnapshotVerification =
	| {
			readonly valid: true;
			readonly payload: Record<string, unknown>;
			/** The token had expired when the save arrived. */
			readonly late: boolean;
	  }
	| {
			readonly valid: false;
			readonly reason: 'missing' | 'invalid' | 'expired';
	  };

const isExpiredError = (error: unknown): boolean =>
	typeof error === 'object' &&
	error !== null &&
	(error as { code?: unknown }).code === 'ERR_JWT_EXPIRED';

/**
 * Verifies a token against the configured key, issuer and tenant audience.
 *
 * A bad signature, issuer, audience or shape collapses to `invalid` rather
 * than reporting which: that would tell an attacker which part of a forged
 * token to fix next. `expired` is reported separately because jose only
 * checks expiry after the signature verified, and `exp` is readable in the
 * token anyway, so it reveals nothing. A client can then stop retrying.
 *
 * With `timing`, a token that expired before the request is accepted as
 * `late` when it was still valid at `decidedAt` and the request is within
 * the replay window. See the module comment.
 */
export const verifyPolicySnapshotToken =
	async function verifyPolicySnapshotToken(
		token: string | undefined,
		options: PolicySnapshotOptions | undefined,
		tenantId: string | undefined,
		timing?: SnapshotTiming
	): Promise<SnapshotVerification> {
		if (!options?.signingKey || !token) {
			return { reason: 'missing', valid: false };
		}
		const key = signingKey(options.signingKey);
		const claims = {
			audience: resolveAudience(options, tenantId),
			issuer: resolveIssuer(options),
		};

		try {
			const { payload } = await jwtVerify(token, key, {
				...claims,
				currentDate:
					timing === undefined ? undefined : new Date(timing.receivedAt),
			});
			return {
				late: false,
				payload: payload as Record<string, unknown>,
				valid: true,
			};
		} catch (error) {
			if (!isExpiredError(error)) {
				return { reason: 'invalid', valid: false };
			}
		}
		if (!timing) {
			return { reason: 'expired', valid: false };
		}

		const windowSeconds =
			options.replayWindowSeconds ?? DEFAULT_REPLAY_WINDOW_SECONDS;
		try {
			// Expiry measured at the decision rather than at arrival.
			const { payload } = await jwtVerify(token, key, {
				...claims,
				clockTolerance: DECISION_CLOCK_TOLERANCE_SECONDS,
				currentDate: new Date(timing.decidedAt),
			});
			const { exp, iat } = payload;
			if (
				typeof exp !== 'number' ||
				typeof iat !== 'number' ||
				timing.decidedAt < (iat - DECISION_CLOCK_TOLERANCE_SECONDS) * 1000 ||
				timing.receivedAt > (exp + windowSeconds) * 1000
			) {
				return { reason: 'expired', valid: false };
			}
			return {
				late: true,
				payload: payload as Record<string, unknown>,
				valid: true,
			};
		} catch {
			return { reason: 'expired', valid: false };
		}
	};
