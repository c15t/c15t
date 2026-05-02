import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolvePolicyDecision } from '~/handlers/init/policy';
import { verifyLegalDocumentSnapshotToken } from '~/handlers/legal-document/snapshot';
import { verifyPolicySnapshotToken } from '~/handlers/policy/snapshot';
import {
	buildRuntimeDecisionDedupeKey,
	postSubjectHandler,
} from './post.handler';

vi.mock('~/utils/metrics', () => ({
	getMetrics: vi.fn(() => ({
		recordConsentCreated: vi.fn(),
		recordConsentAccepted: vi.fn(),
		recordConsentRejected: vi.fn(),
	})),
}));

vi.mock('~/db/registry/utils', () => ({
	generateUniqueId: vi.fn().mockResolvedValue('con_new'),
}));

vi.mock('~/handlers/init/policy', () => ({
	resolvePolicyDecision: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('~/handlers/policy/snapshot', () => ({
	verifyPolicySnapshotToken: vi.fn().mockResolvedValue({
		valid: false,
		reason: 'missing',
	}),
}));

vi.mock('~/handlers/legal-document/snapshot', () => ({
	verifyLegalDocumentSnapshotToken: vi.fn().mockResolvedValue({
		valid: false,
		reason: 'missing',
	}),
}));

const GIVEN_AT = 1700000000000;
const GIVEN_AT_DATE = new Date(GIVEN_AT);

const baseInput = {
	type: 'cookie_consent',
	subjectId: 'sub_user1',
	domain: 'example.com',
	givenAt: GIVEN_AT,
	metadata: { source: 'banner' },
};

const mockSubject = { id: 'sub_user1' };
const mockDomain = { id: 'dom_1', name: 'example.com' };
const mockPolicy = { id: 'pol_1', isActive: true };

function createMockRegistry() {
	return {
		findOrCreateSubject: vi.fn().mockResolvedValue(mockSubject),
		findOrCreateDomain: vi.fn().mockResolvedValue(mockDomain),
		findOrCreatePolicy: vi.fn().mockResolvedValue(mockPolicy),
		findOrCreateLegalDocumentPolicy: vi
			.fn()
			.mockResolvedValue({ id: 'pol_legal_1' }),
		findConsentPolicyById: vi.fn(),
		findOrCreateConsentPurposeByCode: vi.fn(),
	};
}

function createMockDb(findFirstResult: unknown = null) {
	const tx = {
		findFirst: vi.fn().mockResolvedValue(null),
		create: vi.fn().mockImplementation(async (table: string) => {
			if (table === 'runtimePolicyDecision') {
				return { id: 'rpd_1' };
			}
			return {
				id: 'con_new',
				givenAt: GIVEN_AT_DATE,
			};
		}),
	};

	return {
		findFirst: vi.fn().mockResolvedValue(findFirstResult),
		transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(tx)),
		__tx: tx,
	};
}

function createMockContext(db: unknown, registry: unknown) {
	const logger = {
		info: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	};

	const ctx = {
		db,
		registry,
		logger,
		ipAddress: '127.0.0.1',
		userAgent: 'TestAgent/1.0',
		iab: undefined,
		policySnapshot: {
			onValidationFailure: 'reject' as const,
		},
		legalDocumentSnapshot: undefined,
		tenantId: undefined,
	};

	let jsonData: unknown;

	return {
		get: (key: string) => {
			if (key === 'c15tContext') return ctx;
			return undefined;
		},
		json: vi.fn((data) => {
			jsonData = data;
			return data;
		}),
		req: {
			json: vi.fn().mockResolvedValue(baseInput),
			raw: new Request('https://c15t.local/subjects', {
				headers: {
					'accept-language': 'en-US',
				},
			}),
		},
		getJsonData: () => jsonData,
		_ctx: ctx,
	};
}

describe('buildRuntimeDecisionDedupeKey', () => {
	it('changes when the rendered language changes', () => {
		const english = buildRuntimeDecisionDedupeKey({
			tenantId: 'ins_123',
			fingerprint: 'a'.repeat(64),
			matchedBy: 'country',
			countryCode: 'DE',
			regionCode: null,
			jurisdiction: 'GDPR',
			language: 'en',
		});
		const german = buildRuntimeDecisionDedupeKey({
			tenantId: 'ins_123',
			fingerprint: 'a'.repeat(64),
			matchedBy: 'country',
			countryCode: 'DE',
			regionCode: null,
			jurisdiction: 'GDPR',
			language: 'de',
		});

		expect(english).not.toBe(german);
	});

	it('stays stable for the same rendered language', () => {
		const first = buildRuntimeDecisionDedupeKey({
			tenantId: 'ins_123',
			fingerprint: 'a'.repeat(64),
			matchedBy: 'country',
			countryCode: 'DE',
			regionCode: null,
			jurisdiction: 'GDPR',
			language: 'en',
		});
		const second = buildRuntimeDecisionDedupeKey({
			tenantId: 'ins_123',
			fingerprint: 'a'.repeat(64),
			matchedBy: 'country',
			countryCode: 'DE',
			regionCode: null,
			jurisdiction: 'GDPR',
			language: 'en',
		});

		expect(first).toBe(second);
	});
});

describe('postSubjectHandler idempotency', () => {
	afterEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	it('should return existing consent on duplicate submission', async () => {
		const existingConsent = {
			id: 'con_existing',
			givenAt: GIVEN_AT_DATE,
		};
		const db = createMockDb(existingConsent);
		const registry = createMockRegistry();
		const mockCtx = createMockContext(db, registry);

		// @ts-expect-error - simplified test context
		await postSubjectHandler(mockCtx);

		const result = mockCtx.getJsonData() as {
			consentId: string;
			subjectId: string;
		};

		expect(result.consentId).toBe('con_existing');
		expect(result.subjectId).toBe('sub_user1');
		expect(db.findFirst).toHaveBeenCalledWith('consent', {
			where: expect.any(Function),
		});
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it('should create new consent when no duplicate exists', async () => {
		const db = createMockDb(null);
		const registry = createMockRegistry();
		const mockCtx = createMockContext(db, registry);

		// @ts-expect-error - simplified test context
		await postSubjectHandler(mockCtx);

		const result = mockCtx.getJsonData() as {
			consentId: string;
			subjectId: string;
		};

		expect(result.consentId).toBe('con_new');
		expect(db.findFirst).toHaveBeenCalled();
		expect(db.transaction).toHaveBeenCalled();
	});

	it('should create separate records for different givenAt timestamps', async () => {
		const db = createMockDb(null);
		const registry = createMockRegistry();

		// First call
		const mockCtx1 = createMockContext(db, registry);
		// @ts-expect-error - simplified test context
		await postSubjectHandler(mockCtx1);

		// Second call with different givenAt
		const mockCtx2 = createMockContext(db, registry);
		mockCtx2.req.json = vi.fn().mockResolvedValue({
			...baseInput,
			givenAt: GIVEN_AT + 1000,
		});
		// @ts-expect-error - simplified test context
		await postSubjectHandler(mockCtx2);

		// Both calls should go through the transaction (findFirst returns null)
		expect(db.transaction).toHaveBeenCalledTimes(2);
	});

	it('should persist metadata and uiSource in consent record', async () => {
		const inputWithMeta = {
			...baseInput,
			metadata: { customKey: 'customValue' },
			uiSource: 'banner',
		};
		const db = createMockDb(null);
		const registry = createMockRegistry();
		const mockCtx = createMockContext(db, registry);
		mockCtx.req.json = vi.fn().mockResolvedValue(inputWithMeta);

		// @ts-expect-error - simplified test context
		await postSubjectHandler(mockCtx);

		// Get the tx.create call
		const transactionFn = db.transaction.mock.calls[0][0];
		const tx = {
			create: vi
				.fn()
				.mockResolvedValue({ id: 'con_new', givenAt: GIVEN_AT_DATE }),
		};
		await transactionFn(tx);

		expect(tx.create).toHaveBeenCalledWith(
			'consent',
			expect.objectContaining({
				metadata: { json: { customKey: 'customValue' } },
				uiSource: 'banner',
			})
		);
	});

	it('should include uiSource in response for new consent', async () => {
		const inputWithSource = {
			...baseInput,
			uiSource: 'dialog',
		};
		const db = createMockDb(null);
		const registry = createMockRegistry();
		const mockCtx = createMockContext(db, registry);
		mockCtx.req.json = vi.fn().mockResolvedValue(inputWithSource);

		// @ts-expect-error - simplified test context
		await postSubjectHandler(mockCtx);

		const result = mockCtx.getJsonData() as {
			uiSource: string;
		};

		expect(result.uiSource).toBe('dialog');
	});

	it('should include uiSource in response for duplicate consent', async () => {
		const inputWithSource = {
			...baseInput,
			uiSource: 'widget',
		};
		const existingConsent = {
			id: 'con_existing',
			givenAt: GIVEN_AT_DATE,
		};
		const db = createMockDb(existingConsent);
		const registry = createMockRegistry();
		const mockCtx = createMockContext(db, registry);
		mockCtx.req.json = vi.fn().mockResolvedValue(inputWithSource);

		// @ts-expect-error - simplified test context
		await postSubjectHandler(mockCtx);

		const result = mockCtx.getJsonData() as {
			uiSource: string;
		};

		expect(result.uiSource).toBe('widget');
	});

	it('should omit metadata from consent record when not provided', async () => {
		const inputNoMeta = {
			type: 'cookie_consent',
			subjectId: 'sub_user1',
			domain: 'example.com',
			givenAt: GIVEN_AT,
		};
		const db = createMockDb(null);
		const registry = createMockRegistry();
		const mockCtx = createMockContext(db, registry);
		mockCtx.req.json = vi.fn().mockResolvedValue(inputNoMeta);

		// @ts-expect-error - simplified test context
		await postSubjectHandler(mockCtx);

		// Get the tx.create call
		const transactionFn = db.transaction.mock.calls[0][0];
		const tx = {
			create: vi
				.fn()
				.mockResolvedValue({ id: 'con_new', givenAt: GIVEN_AT_DATE }),
		};
		await transactionFn(tx);

		expect(tx.create).toHaveBeenCalledWith(
			'consent',
			expect.objectContaining({
				metadata: undefined,
			})
		);
	});

	it('should not record metrics for duplicate submissions', async () => {
		const { getMetrics } = await import('~/utils/metrics');
		const mockMetrics = {
			recordConsentCreated: vi.fn(),
			recordConsentAccepted: vi.fn(),
			recordConsentRejected: vi.fn(),
		};
		vi.mocked(getMetrics).mockReturnValue(mockMetrics as never);

		const existingConsent = {
			id: 'con_existing',
			givenAt: GIVEN_AT_DATE,
		};
		const db = createMockDb(existingConsent);
		const registry = createMockRegistry();
		const mockCtx = createMockContext(db, registry);

		// @ts-expect-error - simplified test context
		await postSubjectHandler(mockCtx);

		expect(mockMetrics.recordConsentCreated).not.toHaveBeenCalled();
		expect(mockMetrics.recordConsentAccepted).not.toHaveBeenCalled();
		expect(mockMetrics.recordConsentRejected).not.toHaveBeenCalled();
	});
});

describe('postSubjectHandler policy purpose enforcement', () => {
	afterEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	it('rejects preferences that include disallowed categories', async () => {
		vi.mocked(resolvePolicyDecision).mockResolvedValue({
			policy: {
				id: 'policy_restrictive',
				model: 'opt-in',
				consent: { scopeMode: 'strict', categories: ['measurement'] },
			},
			matchedBy: 'country',
			fingerprint: 'a'.repeat(64),
		});

		const db = createMockDb(null);
		const registry = createMockRegistry();
		const mockCtx = createMockContext(db, registry);
		mockCtx.req.json = vi.fn().mockResolvedValue({
			...baseInput,
			preferences: {
				measurement: true,
				marketing: true,
			},
		});

		// @ts-expect-error - simplified test context
		await expect(postSubjectHandler(mockCtx)).rejects.toMatchObject({
			status: 400,
			message: 'Preferences include categories not allowed by policy',
		});

		expect(registry.findOrCreateConsentPurposeByCode).not.toHaveBeenCalled();
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it('passes top-level iabEnabled into write-time policy resolution', async () => {
		const db = createMockDb(null);
		const registry = createMockRegistry();
		const mockCtx = createMockContext(db, registry);
		mockCtx._ctx.iab = { enabled: false };

		// @ts-expect-error - simplified test context
		await expect(postSubjectHandler(mockCtx)).resolves.toBeDefined();

		expect(resolvePolicyDecision).toHaveBeenCalledWith(
			expect.objectContaining({
				iabEnabled: false,
			})
		);
	});

	it('rejects missing policy snapshot tokens when reject mode is active', async () => {
		const db = createMockDb(null);
		const registry = createMockRegistry();
		const mockCtx = createMockContext(db, registry);
		mockCtx._ctx.policySnapshot = {
			signingKey: 'test-signing-key',
		};

		// @ts-expect-error - simplified test context
		await expect(postSubjectHandler(mockCtx)).rejects.toMatchObject({
			status: 409,
			message: 'Policy snapshot token is required',
			cause: {
				code: 'POLICY_SNAPSHOT_REQUIRED',
			},
		});

		expect(resolvePolicyDecision).not.toHaveBeenCalled();
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it('rejects invalid policy snapshot tokens when reject mode is active', async () => {
		vi.mocked(verifyPolicySnapshotToken).mockResolvedValue({
			valid: false,
			reason: 'invalid',
		});

		const db = createMockDb(null);
		const registry = createMockRegistry();
		const mockCtx = createMockContext(db, registry);
		mockCtx._ctx.policySnapshot = {
			signingKey: 'test-signing-key',
		};
		mockCtx.req.json = vi.fn().mockResolvedValue({
			...baseInput,
			policySnapshotToken: 'snapshot-token',
		});

		// @ts-expect-error - simplified test context
		await expect(postSubjectHandler(mockCtx)).rejects.toMatchObject({
			status: 409,
			message: 'Policy snapshot token is invalid',
			cause: {
				code: 'POLICY_SNAPSHOT_INVALID',
			},
		});

		expect(resolvePolicyDecision).not.toHaveBeenCalled();
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it('rejects expired policy snapshot tokens when reject mode is active', async () => {
		vi.mocked(verifyPolicySnapshotToken).mockResolvedValue({
			valid: false,
			reason: 'expired',
		});

		const db = createMockDb(null);
		const registry = createMockRegistry();
		const mockCtx = createMockContext(db, registry);
		mockCtx._ctx.policySnapshot = {
			signingKey: 'test-signing-key',
		};
		mockCtx.req.json = vi.fn().mockResolvedValue({
			...baseInput,
			policySnapshotToken: 'snapshot-token',
		});

		// @ts-expect-error - simplified test context
		await expect(postSubjectHandler(mockCtx)).rejects.toMatchObject({
			status: 409,
			message: 'Policy snapshot token has expired',
			cause: {
				code: 'POLICY_SNAPSHOT_EXPIRED',
			},
		});

		expect(resolvePolicyDecision).not.toHaveBeenCalled();
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it('falls back to the current policy decision when resolve_current mode is active', async () => {
		vi.mocked(verifyPolicySnapshotToken).mockResolvedValue({
			valid: false,
			reason: 'invalid',
		});
		vi.mocked(resolvePolicyDecision).mockResolvedValue({
			policy: {
				id: 'policy_current',
				model: 'opt-in',
				consent: { categories: ['measurement'] },
			},
			matchedBy: 'country',
			fingerprint: 'r'.repeat(64),
		});

		const db = createMockDb(null);
		const registry = createMockRegistry();
		const mockCtx = createMockContext(db, registry);
		mockCtx._ctx.policySnapshot = {
			signingKey: 'test-signing-key',
			onValidationFailure: 'resolve_current',
		};
		mockCtx.req.json = vi.fn().mockResolvedValue({
			...baseInput,
			preferences: {
				measurement: true,
			},
			policySnapshotToken: 'snapshot-token',
		});

		// @ts-expect-error - simplified test context
		await expect(postSubjectHandler(mockCtx)).resolves.toBeDefined();

		expect(resolvePolicyDecision).toHaveBeenCalled();
		expect(db.__tx.create).toHaveBeenCalledWith(
			'runtimePolicyDecision',
			expect.objectContaining({
				fingerprint: 'r'.repeat(64),
			})
		);
		expect(db.__tx.create).toHaveBeenCalledWith(
			'consent',
			expect.objectContaining({
				runtimePolicySource: 'write_time_fallback',
			})
		);
	});

	it('rejects /subjects writes when policy resolution fails IAB validation', async () => {
		vi.mocked(resolvePolicyDecision).mockRejectedValueOnce(
			new Error(
				'Policies using consent.model="iab" require top-level iab.enabled=true'
			)
		);

		const db = createMockDb(null);
		const registry = createMockRegistry();
		const mockCtx = createMockContext(db, registry);
		mockCtx._ctx.iab = { enabled: false };

		// @ts-expect-error - simplified test context
		await expect(postSubjectHandler(mockCtx)).rejects.toMatchObject({
			status: 500,
		});

		expect(db.transaction).not.toHaveBeenCalled();
	});

	it('persists out-of-scope categories when scopeMode is permissive', async () => {
		vi.mocked(resolvePolicyDecision).mockResolvedValue({
			policy: {
				id: 'policy_unmanaged',
				model: 'opt-in',
				consent: { scopeMode: 'permissive', categories: ['measurement'] },
			},
			matchedBy: 'country',
			fingerprint: 'u'.repeat(64),
		});

		const db = createMockDb(null);
		const registry = createMockRegistry();
		registry.findOrCreateConsentPurposeByCode = vi
			.fn()
			.mockImplementation(async (code: string) => ({ id: `pur_${code}` }));
		const mockCtx = createMockContext(db, registry);
		mockCtx.req.json = vi.fn().mockResolvedValue({
			...baseInput,
			preferences: {
				measurement: true,
				marketing: true,
			},
		});

		// @ts-expect-error - simplified test context
		await expect(postSubjectHandler(mockCtx)).resolves.toBeDefined();

		expect(registry.findOrCreateConsentPurposeByCode).toHaveBeenCalledTimes(2);
		expect(registry.findOrCreateConsentPurposeByCode).toHaveBeenCalledWith(
			'measurement'
		);
		expect(registry.findOrCreateConsentPurposeByCode).toHaveBeenCalledWith(
			'marketing'
		);
		expect(db.transaction).toHaveBeenCalled();
		expect(
			(
				mockCtx.getJsonData() as {
					appliedPreferences?: Record<string, boolean>;
				}
			).appliedPreferences
		).toEqual({
			measurement: true,
			marketing: true,
		});
	});

	it('returns submitted preferences for necessary-only permissive policies', async () => {
		vi.mocked(resolvePolicyDecision).mockResolvedValue({
			policy: {
				id: 'europe_opt_in',
				model: 'opt-in',
				consent: { scopeMode: 'permissive', categories: ['necessary'] },
			},
			matchedBy: 'country',
			fingerprint: 'e'.repeat(64),
		});

		const db = createMockDb(null);
		const registry = createMockRegistry();
		registry.findOrCreateConsentPurposeByCode = vi
			.fn()
			.mockImplementation(async (code: string) => ({ id: `pur_${code}` }));
		const mockCtx = createMockContext(db, registry);
		mockCtx.req.json = vi.fn().mockResolvedValue({
			...baseInput,
			type: 'cookie_banner',
			preferences: {
				necessary: true,
				measurement: true,
				marketing: true,
			},
			consentAction: 'all',
			uiSource: 'banner',
		});

		// @ts-expect-error - simplified test context
		await expect(postSubjectHandler(mockCtx)).resolves.toBeDefined();

		expect(registry.findOrCreateConsentPurposeByCode).toHaveBeenCalledTimes(3);
		expect(mockCtx.getJsonData()).toEqual(
			expect.objectContaining({
				type: 'cookie_banner',
				appliedPreferences: {
					necessary: true,
					measurement: true,
					marketing: true,
				},
				uiSource: 'banner',
			})
		);
	});

	it('allows all purposes when policy uses wildcard scope', async () => {
		vi.mocked(resolvePolicyDecision).mockResolvedValue({
			policy: {
				id: 'policy_iab',
				model: 'iab',
				consent: { categories: ['*'] },
			},
			matchedBy: 'country',
			fingerprint: 'b'.repeat(64),
		});

		const db = createMockDb(null);
		const registry = createMockRegistry();
		registry.findOrCreateConsentPurposeByCode = vi
			.fn()
			.mockImplementation(async (code: string) => ({ id: `pur_${code}` }));

		const mockCtx = createMockContext(db, registry);
		mockCtx.req.json = vi.fn().mockResolvedValue({
			...baseInput,
			preferences: {
				measurement: true,
				marketing: true,
				functionality: false,
			},
		});

		// @ts-expect-error - simplified test context
		await expect(postSubjectHandler(mockCtx)).resolves.toBeDefined();

		expect(registry.findOrCreateConsentPurposeByCode).toHaveBeenCalledTimes(2);
		expect(registry.findOrCreateConsentPurposeByCode).toHaveBeenCalledWith(
			'measurement'
		);
		expect(registry.findOrCreateConsentPurposeByCode).toHaveBeenCalledWith(
			'marketing'
		);
		expect(db.transaction).toHaveBeenCalled();
	});

	it('prioritizes valid snapshot wildcard scope over restrictive write-time policy', async () => {
		vi.mocked(resolvePolicyDecision).mockRejectedValue(
			new Error(
				'Policies using consent.model="iab" require top-level iab.enabled=true'
			)
		);
		vi.mocked(verifyPolicySnapshotToken).mockResolvedValue({
			valid: true,
			payload: {
				iss: 'c15t',
				aud: 'c15t-policy-snapshot',
				sub: 'policy_iab_snapshot',
				policyId: 'policy_iab_snapshot',
				fingerprint: 'd'.repeat(64),
				matchedBy: 'country',
				country: 'FR',
				region: null,
				jurisdiction: 'GDPR',
				model: 'iab',
				categories: ['*'],
				iat: 1,
				exp: 9_999_999_999,
			},
		});

		const db = createMockDb(null);
		const registry = createMockRegistry();
		registry.findOrCreateConsentPurposeByCode = vi
			.fn()
			.mockImplementation(async (code: string) => ({ id: `pur_${code}` }));

		const mockCtx = createMockContext(db, registry);
		mockCtx.req.json = vi.fn().mockResolvedValue({
			...baseInput,
			preferences: {
				measurement: true,
				marketing: true,
			},
			policySnapshotToken: 'snapshot-token',
		});

		// @ts-expect-error - simplified test context
		await expect(postSubjectHandler(mockCtx)).resolves.toBeDefined();

		expect(db.transaction).toHaveBeenCalled();
		expect(registry.findOrCreateConsentPurposeByCode).toHaveBeenCalledTimes(2);
		expect(resolvePolicyDecision).not.toHaveBeenCalled();
	});

	it('persists runtime policy i18n and preselected categories from write-time fallback', async () => {
		vi.mocked(verifyPolicySnapshotToken).mockResolvedValue({
			valid: false,
			reason: 'missing',
		});
		vi.mocked(resolvePolicyDecision).mockResolvedValue({
			policy: {
				id: 'policy_localized',
				model: 'opt-in',
				i18n: {
					language: 'en',
					messageProfile: 'us_ca',
				},
				consent: {
					categories: ['measurement', 'marketing'],
					preselectedCategories: ['measurement'],
				},
				proof: {
					storeIp: true,
					storeUserAgent: true,
					storeLanguage: false,
				},
			},
			matchedBy: 'country',
			fingerprint: 'e'.repeat(64),
		});

		const db = createMockDb(null);
		const registry = createMockRegistry();
		const mockCtx = createMockContext(db, registry);
		mockCtx.req.raw = new Request('https://c15t.local/subjects', {
			headers: {
				'accept-language': 'en-US',
			},
		});

		// @ts-expect-error - simplified test context
		await expect(postSubjectHandler(mockCtx)).resolves.toBeDefined();

		expect(db.__tx.create).toHaveBeenCalledWith(
			'runtimePolicyDecision',
			expect.objectContaining({
				language: 'en',
				policyI18n: {
					json: {
						language: 'en',
						messageProfile: 'us_ca',
					},
				},
				preselectedCategories: {
					json: ['measurement'],
				},
			})
		);
	});

	it('persists runtime policy i18n and preselected categories from a valid snapshot', async () => {
		vi.mocked(resolvePolicyDecision).mockResolvedValue({
			policy: {
				id: 'policy_restrictive',
				model: 'opt-in',
				consent: { categories: ['measurement'] },
			},
			matchedBy: 'country',
			fingerprint: 'f'.repeat(64),
		});
		vi.mocked(verifyPolicySnapshotToken).mockResolvedValue({
			valid: true,
			payload: {
				iss: 'c15t',
				aud: 'c15t-policy-snapshot',
				sub: 'policy_snapshot_localized',
				policyId: 'policy_snapshot_localized',
				fingerprint: 'g'.repeat(64),
				matchedBy: 'country',
				country: 'FR',
				region: null,
				jurisdiction: 'GDPR',
				language: 'fr',
				model: 'opt-in',
				policyI18n: {
					language: 'fr',
					messageProfile: 'fr',
				},
				categories: ['measurement', 'marketing'],
				preselectedCategories: ['measurement'],
				iat: 1,
				exp: 9_999_999_999,
			},
		});

		const db = createMockDb(null);
		const registry = createMockRegistry();
		const mockCtx = createMockContext(db, registry);
		mockCtx._ctx.policySnapshot = { signingKey: 'test-signing-key' };
		mockCtx.req.json = vi.fn().mockResolvedValue({
			...baseInput,
			policySnapshotToken: 'snapshot-token',
		});

		// @ts-expect-error - simplified test context
		await expect(postSubjectHandler(mockCtx)).resolves.toBeDefined();

		expect(db.__tx.create).toHaveBeenCalledWith(
			'runtimePolicyDecision',
			expect.objectContaining({
				language: 'fr',
				bannerUi: undefined,
				policyI18n: {
					json: {
						language: 'fr',
						messageProfile: 'fr',
					},
				},
				preselectedCategories: {
					json: ['measurement'],
				},
			})
		);
	});

	it('persists runtime policy scrollLock in audit records', async () => {
		vi.mocked(verifyPolicySnapshotToken).mockResolvedValue({
			valid: false,
			reason: 'missing',
		});
		vi.mocked(resolvePolicyDecision).mockResolvedValue({
			policy: {
				id: 'policy_scroll_lock',
				model: 'opt-in',
				ui: {
					mode: 'banner',
					banner: {
						scrollLock: true,
					},
					dialog: {
						scrollLock: false,
					},
				},
			},
			matchedBy: 'country',
			fingerprint: 'h'.repeat(64),
		});

		const db = createMockDb(null);
		const registry = createMockRegistry();
		const mockCtx = createMockContext(db, registry);

		// @ts-expect-error - simplified test context
		await expect(postSubjectHandler(mockCtx)).resolves.toBeDefined();

		expect(db.__tx.create).toHaveBeenCalledWith(
			'runtimePolicyDecision',
			expect.objectContaining({
				bannerUi: {
					json: {
						scrollLock: true,
					},
				},
				dialogUi: {
					json: {
						scrollLock: false,
					},
				},
			})
		);
	});
});

describe('postSubjectHandler legal document snapshots', () => {
	afterEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	beforeEach(() => {
		vi.mocked(verifyLegalDocumentSnapshotToken).mockResolvedValue({
			valid: false,
			reason: 'missing',
		});
	});

	it('rejects legal document consent without token, policyId, or policyHash when verification is disabled', async () => {
		const db = createMockDb(null);
		const registry = createMockRegistry();
		const mockCtx = createMockContext(db, registry);
		mockCtx.req.json = vi.fn().mockResolvedValue({
			...baseInput,
			type: 'privacy_policy',
		});

		// @ts-expect-error - simplified test context
		await expect(postSubjectHandler(mockCtx)).rejects.toMatchObject({
			status: 409,
			message:
				'Legal document consent requires policyId or policyHash when snapshot verification is disabled',
			cause: {
				code: 'LEGAL_DOCUMENT_PROOF_REQUIRED',
			},
		});

		expect(registry.findOrCreatePolicy).not.toHaveBeenCalled();
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it('rejects missing legal document snapshot tokens when verification is enabled', async () => {
		const db = createMockDb(null);
		const registry = createMockRegistry();
		const mockCtx = createMockContext(db, registry);
		mockCtx._ctx.legalDocumentSnapshot = {
			signingKey: 'test-signing-key',
		};
		mockCtx.req.json = vi.fn().mockResolvedValue({
			...baseInput,
			type: 'privacy_policy',
		});

		// @ts-expect-error - simplified test context
		await expect(postSubjectHandler(mockCtx)).rejects.toMatchObject({
			status: 409,
			message: 'Legal document snapshot token is required',
			cause: {
				code: 'LEGAL_DOCUMENT_SNAPSHOT_REQUIRED',
			},
		});

		expect(resolvePolicyDecision).not.toHaveBeenCalled();
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it('rejects invalid legal document snapshot tokens when verification is enabled', async () => {
		vi.mocked(verifyLegalDocumentSnapshotToken).mockResolvedValue({
			valid: false,
			reason: 'invalid',
		});

		const db = createMockDb(null);
		const registry = createMockRegistry();
		const mockCtx = createMockContext(db, registry);
		mockCtx._ctx.legalDocumentSnapshot = {
			signingKey: 'test-signing-key',
		};
		mockCtx.req.json = vi.fn().mockResolvedValue({
			...baseInput,
			type: 'privacy_policy',
			documentSnapshotToken: 'document-token',
		});

		// @ts-expect-error - simplified test context
		await expect(postSubjectHandler(mockCtx)).rejects.toMatchObject({
			status: 409,
			message: 'Legal document snapshot token is invalid',
			cause: {
				code: 'LEGAL_DOCUMENT_SNAPSHOT_INVALID',
			},
		});

		expect(resolvePolicyDecision).not.toHaveBeenCalled();
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it('rejects expired legal document snapshot tokens when verification is enabled', async () => {
		vi.mocked(verifyLegalDocumentSnapshotToken).mockResolvedValue({
			valid: false,
			reason: 'expired',
		});

		const db = createMockDb(null);
		const registry = createMockRegistry();
		const mockCtx = createMockContext(db, registry);
		mockCtx._ctx.legalDocumentSnapshot = {
			signingKey: 'test-signing-key',
		};
		mockCtx.req.json = vi.fn().mockResolvedValue({
			...baseInput,
			type: 'privacy_policy',
			documentSnapshotToken: 'document-token',
		});

		// @ts-expect-error - simplified test context
		await expect(postSubjectHandler(mockCtx)).rejects.toMatchObject({
			status: 409,
			message: 'Legal document snapshot token has expired',
			cause: {
				code: 'LEGAL_DOCUMENT_SNAPSHOT_EXPIRED',
			},
		});

		expect(resolvePolicyDecision).not.toHaveBeenCalled();
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it('rejects legal document snapshot tokens whose type does not match the request', async () => {
		vi.mocked(verifyLegalDocumentSnapshotToken).mockResolvedValue({
			valid: true,
			payload: {
				iss: 'c15t',
				aud: 'c15t-legal-document-snapshot',
				sub: 'hash_123',
				type: 'terms_and_conditions',
				version: '2026-04-07',
				hash: 'hash_123',
				effectiveDate: '2026-04-07T00:00:00.000Z',
				iat: 1,
				exp: 9_999_999_999,
			},
		});

		const db = createMockDb(null);
		const registry = createMockRegistry();
		const mockCtx = createMockContext(db, registry);
		mockCtx._ctx.legalDocumentSnapshot = {
			signingKey: 'test-signing-key',
		};
		mockCtx.req.json = vi.fn().mockResolvedValue({
			...baseInput,
			type: 'privacy_policy',
			documentSnapshotToken: 'document-token',
		});

		// @ts-expect-error - simplified test context
		await expect(postSubjectHandler(mockCtx)).rejects.toMatchObject({
			status: 409,
			message: 'Legal document snapshot token is invalid',
			cause: {
				code: 'LEGAL_DOCUMENT_SNAPSHOT_INVALID',
			},
		});

		expect(registry.findOrCreateLegalDocumentPolicy).not.toHaveBeenCalled();
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it('accepts explicit policyId for legal document consent when verification is disabled', async () => {
		const db = createMockDb(null);
		const registry = createMockRegistry();
		registry.findConsentPolicyById = vi.fn().mockResolvedValue({
			id: 'pol_existing_legal',
			type: 'privacy_policy',
			isActive: true,
		});
		const mockCtx = createMockContext(db, registry);
		mockCtx.req.json = vi.fn().mockResolvedValue({
			...baseInput,
			type: 'privacy_policy',
			policyId: 'pol_existing_legal',
		});

		// @ts-expect-error - simplified test context
		await expect(postSubjectHandler(mockCtx)).resolves.toBeDefined();

		expect(registry.findConsentPolicyById).toHaveBeenCalledWith(
			'pol_existing_legal'
		);
		expect(registry.findOrCreatePolicy).not.toHaveBeenCalled();
		expect(db.__tx.create).toHaveBeenCalledWith(
			'consent',
			expect.objectContaining({
				policyId: 'pol_existing_legal',
			})
		);
	});

	it('creates consent against the token-backed legal document policy', async () => {
		vi.mocked(verifyLegalDocumentSnapshotToken).mockResolvedValue({
			valid: true,
			payload: {
				iss: 'c15t',
				aud: 'c15t-legal-document-snapshot',
				sub: 'hash_123',
				type: 'privacy_policy',
				version: '2026-04-07',
				hash: 'hash_123',
				effectiveDate: '2026-04-07T00:00:00.000Z',
				iat: 1,
				exp: 9_999_999_999,
			},
		});

		const db = createMockDb(null);
		const registry = createMockRegistry();
		const mockCtx = createMockContext(db, registry);
		mockCtx._ctx.legalDocumentSnapshot = {
			signingKey: 'test-signing-key',
		};
		mockCtx.req.json = vi.fn().mockResolvedValue({
			...baseInput,
			type: 'privacy_policy',
			documentSnapshotToken: 'document-token',
		});

		// @ts-expect-error - simplified test context
		await expect(postSubjectHandler(mockCtx)).resolves.toBeDefined();

		expect(registry.findOrCreateLegalDocumentPolicy).toHaveBeenCalledWith({
			type: 'privacy_policy',
			version: '2026-04-07',
			hash: 'hash_123',
			effectiveDate: new Date('2026-04-07T00:00:00.000Z'),
		});
		expect(resolvePolicyDecision).not.toHaveBeenCalled();
		expect(db.__tx.create).not.toHaveBeenCalledWith(
			'runtimePolicyDecision',
			expect.anything()
		);
		expect(db.__tx.create).toHaveBeenCalledWith(
			'consent',
			expect.objectContaining({
				policyId: 'pol_legal_1',
				runtimePolicyDecisionId: undefined,
				runtimePolicySource: undefined,
			})
		);
	});
});
