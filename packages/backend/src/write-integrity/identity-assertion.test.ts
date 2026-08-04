import { SignJWT } from 'jose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	createIdentityAssertion,
	verifyIdentityAssertion,
} from './identity-assertion';

const SIGNING_KEY = 'identity-assertion-test-signing-key';

function createAssertion(
	overrides: Partial<Parameters<typeof createIdentityAssertion>[0]> = {}
) {
	return createIdentityAssertion({
		options: { signingKey: SIGNING_KEY, ttlSeconds: 60 },
		tenantId: 'tenant_123',
		subjectId: 'subject_123',
		action: 'identity:link',
		domain: 'example.com',
		externalId: 'user_123',
		identityProvider: 'clerk',
		...overrides,
	});
}

function verifyAssertion(
	token: string | undefined,
	overrides: Partial<Parameters<typeof verifyIdentityAssertion>[0]> = {}
) {
	return verifyIdentityAssertion({
		token,
		options: { verificationKey: SIGNING_KEY },
		tenantId: 'tenant_123',
		subjectId: 'subject_123',
		action: 'identity:link',
		domain: 'example.com',
		externalId: 'user_123',
		identityProvider: 'clerk',
		...overrides,
	});
}

afterEach(() => {
	vi.useRealTimers();
});

describe('identity assertion', () => {
	it('creates and verifies an assertion for one exact external identity', async () => {
		const created = await createAssertion();
		const verified = await verifyAssertion(created.token);

		expect(verified).toEqual({ valid: true, payload: created.payload });
		expect(created.payload).toMatchObject({
			iss: 'c15t-app',
			aud: 'c15t-identity-assertion',
			sub: 'subject_123',
			tenantId: 'tenant_123',
			action: 'identity:link',
			domain: 'example.com',
			externalId: 'user_123',
			identityProvider: 'clerk',
		});
		expect(created.payload.jti).toEqual(expect.any(String));
	});

	it.each([
		['tenant', { tenantId: 'tenant_other' }],
		['subject', { subjectId: 'subject_other' }],
		['action', { action: 'identity:reassign' as const }],
		['domain', { domain: 'other.example.com' }],
		['external ID', { externalId: 'user_other' }],
		['identity provider', { identityProvider: 'auth0' }],
	])('rejects a mismatched %s binding', async (_name, overrides) => {
		const created = await createAssertion();

		await expect(verifyAssertion(created.token, overrides)).resolves.toEqual({
			valid: false,
			reason: 'invalid',
		});
	});

	it('rejects a token signed with a different key', async () => {
		const created = await createAssertion();

		await expect(
			verifyAssertion(created.token, {
				options: { verificationKey: 'different-signing-key' },
			})
		).resolves.toEqual({ valid: false, reason: 'invalid' });
	});

	it('enforces the configured maximum assertion age', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-08-04T10:00:00Z'));
		const created = await createAssertion({
			options: { signingKey: SIGNING_KEY, ttlSeconds: 600 },
		});
		vi.setSystemTime(new Date('2026-08-04T10:05:01Z'));

		await expect(verifyAssertion(created.token)).resolves.toEqual({
			valid: false,
			reason: 'expired',
		});
	});

	it('classifies missing, malformed, expired, and tampered tokens', async () => {
		await expect(verifyAssertion(undefined)).resolves.toEqual({
			valid: false,
			reason: 'missing',
		});
		await expect(verifyAssertion('not-a-jwt')).resolves.toEqual({
			valid: false,
			reason: 'malformed',
		});

		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-08-04T10:00:00Z'));
		const created = await createAssertion({
			options: { signingKey: SIGNING_KEY, ttlSeconds: 1 },
		});
		vi.setSystemTime(new Date('2026-08-04T10:00:02Z'));
		await expect(verifyAssertion(created.token)).resolves.toEqual({
			valid: false,
			reason: 'expired',
		});

		const [header, payload, signature] = created.token.split('.');
		await expect(
			verifyAssertion(`${header}.${payload}x.${signature}`)
		).resolves.toEqual({ valid: false, reason: 'invalid' });
	});

	it('rejects tokens with an unexpected algorithm or type', async () => {
		const issuedAt = Math.floor(Date.now() / 1000);
		const claims = {
			iss: 'c15t-app',
			aud: 'c15t-identity-assertion',
			sub: 'subject_123',
			tenantId: 'tenant_123',
			action: 'identity:link',
			domain: 'example.com',
			externalId: 'user_123',
			identityProvider: 'clerk',
			iat: issuedAt,
			exp: issuedAt + 60,
			jti: crypto.randomUUID(),
		};
		const key = new TextEncoder().encode(SIGNING_KEY);
		const wrongAlgorithm = await new SignJWT(claims)
			.setProtectedHeader({ alg: 'HS384', typ: 'c15t-identity-assertion+jwt' })
			.sign(key);
		const wrongType = await new SignJWT(claims)
			.setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
			.sign(key);

		await expect(verifyAssertion(wrongAlgorithm)).resolves.toEqual({
			valid: false,
			reason: 'invalid',
		});
		await expect(verifyAssertion(wrongType)).resolves.toEqual({
			valid: false,
			reason: 'invalid',
		});
	});
});
