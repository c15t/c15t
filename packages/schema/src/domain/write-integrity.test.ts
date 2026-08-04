import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { consentSchema, consentWriteSourceSchema } from './consent';
import { domainSchema } from './domain';
import { writeReplaySchema } from './write-replay';

describe('consent write provenance schemas', () => {
	it.each([
		'legacy',
		'anonymous',
		'subject_capability',
		'identity_assertion',
		'api_key',
	])('accepts the %s write source', (source) => {
		expect(v.is(consentWriteSourceSchema, source)).toBe(true);
	});

	it('keeps provenance optional for legacy consent records', () => {
		const result = v.safeParse(consentSchema, {
			id: 'cns_legacy',
			subjectId: 'sub_legacy',
			domainId: 'dom_legacy',
			purposeIds: [],
		});

		expect(result.success).toBe(true);
	});

	it('validates stored provenance independently from runtime policy evidence', () => {
		const result = v.safeParse(consentSchema, {
			id: 'cns_secure',
			subjectId: 'sub_secure',
			domainId: 'dom_secure',
			purposeIds: [],
			runtimePolicySource: 'snapshot_token',
			writeSource: 'subject_capability',
			writeCredentialId: 'capability_1',
			writeIssuer: 'https://issuer.example',
			writeOrigin: 'https://app.example',
		});

		expect(result.success).toBe(true);
	});
});

describe('domain integrity schema', () => {
	it('allows a missing scope key on legacy rows', () => {
		expect(
			v.is(domainSchema, {
				id: 'dom_legacy',
				name: 'legacy.example',
			})
		).toBe(true);
	});
});

describe('write replay schema', () => {
	it('requires the credential binding and expiry fields', () => {
		expect(
			v.is(writeReplaySchema, {
				id: 'replay_1',
				audience: 'subject_1',
				tokenId: 'credential_1',
				requestFingerprint: 'sha256:fingerprint',
				expiresAt: new Date('2030-01-01T00:00:00.000Z'),
			})
		).toBe(true);

		expect(
			v.is(writeReplaySchema, {
				id: 'replay_1',
				audience: 'subject_1',
				tokenId: 'credential_1',
				expiresAt: new Date('2030-01-01T00:00:00.000Z'),
			})
		).toBe(false);
	});
});
