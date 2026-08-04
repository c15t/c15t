import { SignJWT } from 'jose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	createSubjectCapability,
	verifySubjectCapability,
} from './subject-capability';

const SIGNING_KEY = 'subject-capability-test-signing-key';

function createCapability(
	overrides: Partial<Parameters<typeof createSubjectCapability>[0]> = {}
) {
	return createSubjectCapability({
		options: { signingKey: SIGNING_KEY, ttlSeconds: 60 },
		tenantId: 'tenant_123',
		subjectId: 'subject_123',
		action: 'consent:create',
		domain: 'example.com',
		...overrides,
	});
}

function verifyCapability(
	token: string | undefined,
	overrides: Partial<Parameters<typeof verifySubjectCapability>[0]> = {}
) {
	return verifySubjectCapability({
		token,
		options: { signingKey: SIGNING_KEY },
		tenantId: 'tenant_123',
		subjectId: 'subject_123',
		action: 'consent:create',
		domain: 'example.com',
		...overrides,
	});
}

afterEach(() => {
	vi.useRealTimers();
});

describe('subject capability', () => {
	it('creates and verifies an HS256 capability with bound claims', async () => {
		const created = await createCapability();
		const verified = await verifyCapability(created.token);

		expect(created.token.split('.')).toHaveLength(3);
		expect(verified).toEqual({ valid: true, payload: created.payload });
		expect(created.payload).toMatchObject({
			iss: 'c15t',
			aud: 'c15t-subject-capability',
			sub: 'subject_123',
			tenantId: 'tenant_123',
			action: 'consent:create',
			domain: 'example.com',
		});
		expect(created.payload.exp - created.payload.iat).toBe(60);
		expect(created.payload.jti).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
		);
	});

	it('supports custom issuer and audience values', async () => {
		const created = await createCapability({
			options: {
				signingKey: SIGNING_KEY,
				issuer: 'https://consent.example.com',
				audience: 'consent-write-api',
			},
		});

		const verified = await verifyCapability(created.token, {
			options: {
				signingKey: SIGNING_KEY,
				issuer: 'https://consent.example.com',
				audience: 'consent-write-api',
			},
		});

		expect(verified.valid).toBe(true);
	});

	it.each([
		['tenant', { tenantId: 'tenant_other' }],
		['subject', { subjectId: 'subject_other' }],
		['action', { action: 'identity:link' as const }],
		['domain', { domain: 'other.example.com' }],
	])('rejects a mismatched %s binding', async (_name, overrides) => {
		const created = await createCapability();

		await expect(verifyCapability(created.token, overrides)).resolves.toEqual({
			valid: false,
			reason: 'invalid',
		});
	});

	it('treats presence and absence of an optional domain as distinct', async () => {
		const created = await createCapability({ domain: undefined });

		await expect(
			verifyCapability(created.token, { domain: 'example.com' })
		).resolves.toEqual({ valid: false, reason: 'invalid' });
	});

	it('classifies missing, malformed, expired, and tampered tokens', async () => {
		await expect(verifyCapability(undefined)).resolves.toEqual({
			valid: false,
			reason: 'missing',
		});
		await expect(verifyCapability('not-a-jwt')).resolves.toEqual({
			valid: false,
			reason: 'malformed',
		});

		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-08-04T10:00:00Z'));
		const created = await createCapability({
			options: { signingKey: SIGNING_KEY, ttlSeconds: 1 },
		});
		vi.setSystemTime(new Date('2026-08-04T10:00:02Z'));
		await expect(verifyCapability(created.token)).resolves.toEqual({
			valid: false,
			reason: 'expired',
		});

		const [header, payload, signature] = created.token.split('.');
		await expect(
			verifyCapability(`${header}.${payload}x.${signature}`)
		).resolves.toEqual({ valid: false, reason: 'invalid' });
	});

	it('rejects tokens with an unexpected algorithm or type', async () => {
		const issuedAt = Math.floor(Date.now() / 1000);
		const claims = {
			iss: 'c15t',
			aud: 'c15t-subject-capability',
			sub: 'subject_123',
			tenantId: 'tenant_123',
			action: 'consent:create',
			domain: 'example.com',
			iat: issuedAt,
			exp: issuedAt + 60,
			jti: crypto.randomUUID(),
		};
		const key = new TextEncoder().encode(SIGNING_KEY);
		const wrongAlgorithm = await new SignJWT(claims)
			.setProtectedHeader({ alg: 'HS384', typ: 'c15t-subject-capability+jwt' })
			.sign(key);
		const wrongType = await new SignJWT(claims)
			.setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
			.sign(key);

		await expect(verifyCapability(wrongAlgorithm)).resolves.toEqual({
			valid: false,
			reason: 'invalid',
		});
		await expect(verifyCapability(wrongType)).resolves.toEqual({
			valid: false,
			reason: 'invalid',
		});
	});
});
