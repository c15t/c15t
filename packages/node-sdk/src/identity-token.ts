/**
 * Mints identity tokens: signed proof, from your server, that a browser
 * belongs to one of your users.
 *
 * The browser passes the token to `identify()`. The backend checks it with
 * the same key (its `identityToken.signingKey` option) and only then counts
 * the subject in `subjects.list` and `consents.check` for that user.
 *
 * HS256 over WebCrypto, so it runs in Node, Bun, Deno and edge runtimes
 * without a JWT library.
 */

/** Options for {@link createIdentityToken}. */
export interface C15tIdentityTokenOptions {
	/**
	 * The secret shared with the backend's `identityToken.signingKey`, at
	 * least 32 bytes. Keep it on your server: anyone holding it can sign in as
	 * any user.
	 */
	readonly signingKey: string;
	/**
	 * How long the token is valid, in seconds. Mint a fresh one on each page
	 * load or sign-in rather than storing it.
	 *
	 * @default 3600
	 */
	readonly ttlSeconds?: number;
	/** `iss` claim. Must match the backend's `identityToken.issuer`. @default 'c15t' */
	readonly issuer?: string;
	/** `aud` claim. Must match the backend's `identityToken.audience`. @default 'c15t-identity' */
	readonly audience?: string;
	/** Clock, for tests. @default Date.now */
	readonly now?: () => number;
}

/** The identity a token vouches for. */
export interface C15tIdentityTokenUser {
	/** Your user id. The same value the browser passes as `externalId`. */
	readonly externalId: string;
	/**
	 * Who issued the id, such as `clerk`. When set, the browser must send the
	 * same `identityProvider`.
	 */
	readonly identityProvider?: string;
}

const DEFAULT_TTL_SECONDS = 3600;
/** The backend refuses shorter keys too; see its `identityToken` option. */
const MIN_KEY_BYTES = 32;

const base64url = (bytes: Uint8Array): string => {
	let binary = '';
	for (const byte of bytes) {
		binary += String.fromCodePoint(byte);
	}
	return btoa(binary)
		.replaceAll('+', '-')
		.replaceAll('/', '_')
		.replace(/=+$/u, '');
};

const encodeJson = (value: unknown): string =>
	base64url(new TextEncoder().encode(JSON.stringify(value)));

/**
 * Signs an identity token for one of your users.
 *
 * Call it on your server after the visitor signs in, send the token to the
 * page, and pass it to the browser client's `identify()` as
 * `identityToken`.
 *
 * @param user - Your user id and, optionally, its identity provider.
 * @param options - The shared signing key and token lifetime.
 * @returns A compact JWT.
 * @throws {TypeError} When `externalId` is empty, `signingKey` is shorter
 * than 32 bytes, or `ttlSeconds` is not a positive integer.
 *
 * @example
 * ```ts
 * import { createIdentityToken } from '@c15t/node-sdk';
 *
 * const identityToken = await createIdentityToken(
 *   { externalId: session.user.id },
 *   { signingKey: process.env.C15T_IDENTITY_SIGNING_KEY! }
 * );
 * // In the browser:
 * // await c15t.identify({ externalId: user.id, identityToken });
 * ```
 */
export const createIdentityToken = async function createIdentityToken(
	user: C15tIdentityTokenUser,
	options: C15tIdentityTokenOptions
): Promise<string> {
	if (typeof user?.externalId !== 'string' || user.externalId === '') {
		throw new TypeError('createIdentityToken: externalId must be a string.');
	}
	if (
		typeof options?.signingKey !== 'string' ||
		new TextEncoder().encode(options.signingKey).length < MIN_KEY_BYTES
	) {
		throw new TypeError(
			`createIdentityToken: signingKey must be a string of at least ${MIN_KEY_BYTES} bytes.`
		);
	}
	const ttl = options.ttlSeconds ?? DEFAULT_TTL_SECONDS;
	if (!Number.isSafeInteger(ttl) || ttl <= 0) {
		throw new TypeError(
			'createIdentityToken: ttlSeconds must be a positive integer.'
		);
	}

	const iat = Math.floor((options.now ?? Date.now)() / 1000);
	const header = encodeJson({ alg: 'HS256', typ: 'JWT' });
	const claims: Record<string, number | string> = {
		aud: options.audience || 'c15t-identity',
		exp: iat + ttl,
		iat,
		iss: options.issuer || 'c15t',
		sub: user.externalId,
	};
	if (user.identityProvider !== undefined) {
		claims.idp = user.identityProvider;
	}
	const payload = encodeJson(claims);

	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(options.signingKey),
		{ hash: 'SHA-256', name: 'HMAC' },
		false,
		['sign']
	);
	const signature = await crypto.subtle.sign(
		'HMAC',
		key,
		new TextEncoder().encode(`${header}.${payload}`)
	);

	return `${header}.${payload}.${base64url(new Uint8Array(signature))}`;
};
