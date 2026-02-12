import { afterEach, describe, expect, it, vi } from 'vitest';
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
				create: vi.fn().mockResolvedValue({
					id: 'con_new',
					givenAt: GIVEN_AT_DATE,
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
