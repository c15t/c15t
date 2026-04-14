import { describe, expect, it } from 'vitest';
import {
	createLegalDocumentSnapshotToken,
	verifyLegalDocumentSnapshotToken,
} from './snapshot';

describe('legal document snapshot token', () => {
	it('returns missing when the token is absent', async () => {
		const verified = await verifyLegalDocumentSnapshotToken({
			options: { signingKey: 'test-signing-key' },
		});

		expect(verified).toEqual({
			valid: false,
			reason: 'missing',
		});
	});

	it('creates and verifies a valid token', async () => {
		const tokenResult = await createLegalDocumentSnapshotToken({
			options: { signingKey: 'test-signing-key' },
			tenantId: 'ins_123',
			type: 'privacy_policy',
			version: '2026-04-07',
			hash: 'hash_123',
			effectiveDate: '2026-04-07T00:00:00.000Z',
		});

		expect(tokenResult).toBeDefined();
		expect(tokenResult?.token.split('.')).toHaveLength(3);

		const verified = await verifyLegalDocumentSnapshotToken({
			token: tokenResult?.token,
			options: { signingKey: 'test-signing-key' },
			tenantId: 'ins_123',
		});

		expect(verified.valid).toBe(true);
		if (!verified.valid) {
			throw new Error('Expected valid legal document snapshot');
		}

		expect(verified.payload.iss).toBe('c15t');
		expect(verified.payload.aud).toBe('c15t-legal-document-snapshot:ins_123');
		expect(verified.payload.sub).toBe('hash_123');
		expect(verified.payload.version).toBe('2026-04-07');
		expect(verified.payload.hash).toBe('hash_123');
		expect(verified.payload.effectiveDate).toBe('2026-04-07T00:00:00.000Z');
	});

	it('rejects tampered token payloads', async () => {
		const tokenResult = await createLegalDocumentSnapshotToken({
			options: { signingKey: 'test-signing-key' },
			type: 'privacy_policy',
			version: '2026-04-07',
			hash: 'hash_123',
			effectiveDate: '2026-04-07T00:00:00.000Z',
		});

		const [header, payload, signature] = (tokenResult?.token ?? '').split('.');
		const tamperedPayload = `${header}.${payload}x.${signature}`;

		const verified = await verifyLegalDocumentSnapshotToken({
			token: tamperedPayload,
			options: { signingKey: 'test-signing-key' },
		});

		expect(verified).toEqual({
			valid: false,
			reason: 'invalid',
		});
	});

	it('rejects expired tokens', async () => {
		const tokenResult = await createLegalDocumentSnapshotToken({
			options: { signingKey: 'test-signing-key' },
			type: 'privacy_policy',
			version: '2026-04-07',
			hash: 'hash_123',
			effectiveDate: '2026-04-07T00:00:00.000Z',
			ttlSeconds: -1,
		});

		const verified = await verifyLegalDocumentSnapshotToken({
			token: tokenResult?.token,
			options: { signingKey: 'test-signing-key' },
		});

		expect(verified).toEqual({
			valid: false,
			reason: 'expired',
		});
	});

	it('rejects tokens when the tenant context does not match', async () => {
		const tokenResult = await createLegalDocumentSnapshotToken({
			options: { signingKey: 'test-signing-key' },
			tenantId: 'ins_123',
			type: 'privacy_policy',
			version: '2026-04-07',
			hash: 'hash_123',
			effectiveDate: '2026-04-07T00:00:00.000Z',
		});

		const verified = await verifyLegalDocumentSnapshotToken({
			token: tokenResult?.token,
			options: { signingKey: 'test-signing-key' },
			tenantId: 'ins_456',
		});

		expect(verified).toEqual({
			valid: false,
			reason: 'invalid',
		});
	});

	it('supports custom issuer and audience claims', async () => {
		const tokenResult = await createLegalDocumentSnapshotToken({
			options: {
				signingKey: 'test-signing-key',
				issuer: 'consent.example.com',
				audience: 'legal-documents-api',
			},
			tenantId: 'ins_123',
			type: 'privacy_policy',
			version: '2026-04-07',
			hash: 'hash_123',
			effectiveDate: '2026-04-07T00:00:00.000Z',
		});

		const verified = await verifyLegalDocumentSnapshotToken({
			token: tokenResult?.token,
			options: {
				signingKey: 'test-signing-key',
				issuer: 'consent.example.com',
				audience: 'legal-documents-api',
			},
			tenantId: 'ins_123',
		});

		expect(verified.valid).toBe(true);
		if (!verified.valid) {
			throw new Error('Expected valid legal document snapshot');
		}
		expect(verified.payload.iss).toBe('consent.example.com');
		expect(verified.payload.aud).toBe('legal-documents-api');
	});
});
