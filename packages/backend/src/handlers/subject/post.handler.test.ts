import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolvePolicyDecision } from '~/handlers/init/policy';
import { verifyPolicySnapshotToken } from '~/handlers/policy/snapshot';
import { postSubjectHandler } from './post.handler';

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
	verifyPolicySnapshotToken: vi.fn().mockResolvedValue(null),
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
		findConsentPolicyById: vi.fn(),
		findOrCreateConsentPurposeByCode: vi.fn(),
	};
}

function createMockDb(findFirstResult: unknown = null) {
	return {
		findFirst: vi.fn().mockResolvedValue(findFirstResult),
		transaction: vi.fn(async (fn: (tx: unknown) => unknown) => {
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
			return fn(tx);
		}),
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
		},
		getJsonData: () => jsonData,
		_ctx: ctx,
	};
}

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

	it('rejects preferences that include disallowed purposes', async () => {
		vi.mocked(resolvePolicyDecision).mockResolvedValue({
			policy: {
				id: 'policy_restrictive',
				model: 'opt-in',
				consent: { scopeMode: 'strict', purposeIds: ['measurement'] },
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
			message: 'Preferences include purposes not allowed by policy',
		});

		expect(registry.findOrCreateConsentPurposeByCode).not.toHaveBeenCalled();
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it('ignores out-of-scope purposes when scopeMode is unmanaged', async () => {
		vi.mocked(resolvePolicyDecision).mockResolvedValue({
			policy: {
				id: 'policy_unmanaged',
				model: 'opt-in',
				consent: { scopeMode: 'unmanaged', purposeIds: ['measurement'] },
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

		expect(registry.findOrCreateConsentPurposeByCode).toHaveBeenCalledTimes(1);
		expect(registry.findOrCreateConsentPurposeByCode).toHaveBeenCalledWith(
			'measurement'
		);
		expect(db.transaction).toHaveBeenCalled();
	});

	it('allows all purposes when policy uses wildcard scope', async () => {
		vi.mocked(resolvePolicyDecision).mockResolvedValue({
			policy: {
				id: 'policy_iab',
				model: 'iab',
				consent: { purposeIds: ['*'] },
			},
			matchedBy: 'jurisdiction',
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
		vi.mocked(resolvePolicyDecision).mockResolvedValue({
			policy: {
				id: 'policy_restrictive',
				model: 'opt-in',
				consent: { purposeIds: ['measurement'] },
			},
			matchedBy: 'country',
			fingerprint: 'c'.repeat(64),
		});
		vi.mocked(verifyPolicySnapshotToken).mockResolvedValue({
			policyId: 'policy_iab_snapshot',
			fingerprint: 'd'.repeat(64),
			matchedBy: 'country',
			country: 'FR',
			region: null,
			jurisdiction: 'GDPR',
			model: 'iab',
			purposeIds: ['*'],
			iat: 1,
			exp: 9_999_999_999,
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
	});
});
