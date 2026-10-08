/**
 * Signed proof that a subject belongs to an external identity.
 *
 * `PATCH /subjects/:id` and `POST /subjects` take an `externalId` from the
 * browser. Reads by external id (`GET /subjects?externalId=`,
 * `GET /consents/check`) feed server-side decisions, so they count only
 * links the caller proved. Two proofs count:
 *
 * - an API key on the request, for calls from the customer's own server;
 * - an identity token: an HS256 JWT the customer's server signs with a key
 *   it shares with this backend, naming the external id in `sub`. The
 *   browser receives it after sign-in and passes it to `identify()`.
 *
 * The token names the identity, not the subject. The customer's server does
 * not know which subject id the browser holds, and does not need to: the
 * token says "whoever holds this is user X", and is short-lived so a leaked
 * one stops working soon.
 *
 * `@c15t/node-sdk`'s `createIdentityToken` mints tokens in this format.
 */

import { jwtVerify } from 'jose';

/** Default `iss`, matching `@c15t/node-sdk`'s `createIdentityToken`. */
export const DEFAULT_IDENTITY_ISSUER = 'c15t';
/** Default `aud`, matching `@c15t/node-sdk`'s `createIdentityToken`. */
export const DEFAULT_IDENTITY_AUDIENCE = 'c15t-identity';

export interface IdentityTokenOptions {
	/**
	 * Shared HS256 secret. Without it no identity token verifies, and only
	 * API-key requests can verify a link.
	 *
	 * Use a key for this backend's tenant alone. Anyone holding it can link
	 * any subject to any external id.
	 */
	readonly signingKey?: string;
	/** Expected `iss`. Defaults to `c15t`. */
	readonly issuer?: string;
	/** Expected `aud`. Defaults to `c15t-identity`. */
	readonly audience?: string;
}

/**
 * Shortest accepted signing key, in UTF-8 bytes: HS256's own output size.
 * Every token is an offline guessing target for its key, so a short one can
 * be recovered from any token a browser sees.
 */
export const MIN_IDENTITY_SIGNING_KEY_BYTES = 32;

/**
 * Refuses an identity signing key too short to resist offline guessing.
 *
 * @param options - The instance's options.
 * @throws {Error} When `identityToken.signingKey` is set but is not a string
 * of at least {@link MIN_IDENTITY_SIGNING_KEY_BYTES} UTF-8 bytes.
 * @internal
 */
export const assertIdentityTokenOptions =
	function assertIdentityTokenOptions(options: {
		readonly identityToken?: IdentityTokenOptions;
	}): void {
		const key: unknown = options.identityToken?.signingKey;
		if (key === undefined) {
			return;
		}
		if (
			typeof key !== 'string' ||
			new TextEncoder().encode(key).length < MIN_IDENTITY_SIGNING_KEY_BYTES
		) {
			throw new Error(
				`[c15t] identityToken.signingKey must be at least ${MIN_IDENTITY_SIGNING_KEY_BYTES} bytes. Generate one with \`openssl rand -base64 32\`.`
			);
		}
	};

/** What a request proved about the identity it links. */
export type IdentityVerification =
	| {
			readonly verified: true;
			readonly by: 'api_key' | 'identity_token';
	  }
	| {
			readonly verified: false;
			/**
			 * `none`: no proof was offered. `invalid`: a token was offered and
			 * did not verify, or names a different identity.
			 */
			readonly reason: 'invalid' | 'none';
	  };

const UNVERIFIED: IdentityVerification = { reason: 'none', verified: false };
const INVALID: IdentityVerification = { reason: 'invalid', verified: false };

/**
 * Checks what a request proves about `externalId`.
 *
 * An API key wins over a token. A token must carry `exp`, verify against the
 * configured key, issuer and audience, and name `externalId` in `sub`. When
 * it also names an identity provider in `idp`, that must match too.
 *
 * Any token failure collapses to `invalid` without saying why, for the same
 * reason as the snapshot tokens: telling a caller which check failed tells
 * them what to fix.
 *
 * @param input - The identity being linked and the proof offered.
 * @param options - The instance's `identityToken` option.
 * @returns Whether the link is verified, and how.
 */
export const verifyIdentity = async function verifyIdentity(
	input: {
		readonly externalId: string;
		readonly identityProvider: string | undefined;
		readonly token: string | undefined;
		readonly hasApiKey: boolean;
	},
	options: IdentityTokenOptions | undefined
): Promise<IdentityVerification> {
	if (input.hasApiKey) {
		return { by: 'api_key', verified: true };
	}
	if (input.token === undefined) {
		return UNVERIFIED;
	}
	if (!options?.signingKey) {
		return INVALID;
	}

	try {
		const { payload } = await jwtVerify(
			input.token,
			new TextEncoder().encode(options.signingKey),
			{
				algorithms: ['HS256'],
				// Verbatim, as `createIdentityToken` signs them; empty means default.
				audience: options.audience || DEFAULT_IDENTITY_AUDIENCE,
				issuer: options.issuer || DEFAULT_IDENTITY_ISSUER,
				requiredClaims: ['exp', 'sub'],
			}
		);
		if (payload.sub !== input.externalId) {
			return INVALID;
		}
		if (
			payload.idp !== undefined &&
			payload.idp !== (input.identityProvider ?? 'external')
		) {
			return INVALID;
		}
		return { by: 'identity_token', verified: true };
	} catch {
		return INVALID;
	}
};
