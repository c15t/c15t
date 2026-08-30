import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import {
	postSubjectInputSchema,
	postSubjectOutputSchema,
	subjectPolicyBasedInputSchema,
} from '../api/subject/post';
import {
	consentPolicySchema,
	legalDocumentPolicyTypeSchema,
} from './consent-policy';

describe('legalDocumentPolicyTypeSchema', () => {
	it.each(['privacy_policy', 'dpa', 'terms_and_conditions'])(
		'accepts the base legal-document type %s',
		(type) => {
			expect(v.is(legalDocumentPolicyTypeSchema, type)).toBe(true);
		}
	);

	it.each([
		'terms_and_conditions_b2b',
		'terms_and_conditions_b2c',
		'privacy_policy_v2',
		'dpa_2026',
	])('accepts the suffixed legal-document variant %s', (type) => {
		expect(v.is(legalDocumentPolicyTypeSchema, type)).toBe(true);
	});

	it.each([
		'terms_and_conditions2', // suffix without the `_` boundary
		'privacy_policyx',
		'terms_and_conditions_', // `_` boundary with empty suffix
		'privacy_policy_',
		'dpa_',
		'terms',
		'',
		'cookie_banner',
		'marketing_communications',
	])('rejects the non-legal-document or boundary-violating type %s', (type) => {
		expect(v.is(legalDocumentPolicyTypeSchema, type)).toBe(false);
	});

	it.each([42, null, undefined, {}, ['privacy_policy']])(
		'rejects the non-string value %j',
		(value) => {
			expect(v.is(legalDocumentPolicyTypeSchema, value)).toBe(false);
		}
	);
});

const baseInput = {
	subjectId: 'sub_2jv6z8n4q9',
	domain: 'example.com',
	givenAt: 1_735_689_600_000,
};

describe('subjectPolicyBasedInputSchema', () => {
	it('accepts a suffixed legal-document type', () => {
		const result = v.safeParse(subjectPolicyBasedInputSchema, {
			...baseInput,
			type: 'terms_and_conditions_b2b',
			policyHash: 'sha256:abc123',
		});

		expect(result.success).toBe(true);
	});
});

describe('consentPolicySchema', () => {
	it('accepts a stored policy with a suffixed legal-document type', () => {
		const result = v.safeParse(consentPolicySchema, {
			id: 'pol_123',
			version: '2026-04-07',
			type: 'terms_and_conditions_b2b',
			hash: 'sha256:abc123',
			effectiveDate: new Date('2026-04-07T00:00:00.000Z'),
			isActive: true,
			createdAt: new Date('2026-04-07T00:00:00.000Z'),
			tenantId: null,
		});

		expect(result.success).toBe(true);
	});
});

describe('postSubjectInputSchema variant routing', () => {
	it('routes a suffixed legal-document type to the policy-based branch', () => {
		const result = v.safeParse(postSubjectInputSchema, {
			...baseInput,
			type: 'terms_and_conditions_b2b',
			policyHash: 'sha256:abc123',
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.output.type).toBe('terms_and_conditions_b2b');
		}
	});

	it('still rejects an unknown consent type', () => {
		const result = v.safeParse(postSubjectInputSchema, {
			...baseInput,
			type: 'totally_unknown_type',
		});

		expect(result.success).toBe(false);
	});
});

describe('postSubjectOutputSchema', () => {
	it('accepts a response with a suffixed legal-document type', () => {
		const result = v.safeParse(postSubjectOutputSchema, {
			subjectId: 'sub_2jv6z8n4q9',
			consentId: 'cns_123',
			domainId: 'dom_123',
			domain: 'example.com',
			type: 'terms_and_conditions_b2b',
			givenAt: new Date('2026-04-07T00:00:00.000Z'),
		});

		expect(result.success).toBe(true);
	});
});
