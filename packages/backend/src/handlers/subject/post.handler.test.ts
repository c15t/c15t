import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolvePolicyDecision } from '~/handlers/init/policy';
import { verifyLegalDocumentSnapshotToken } from '~/handlers/legal-document/snapshot';
import { verifyPolicySnapshotToken } from '~/handlers/policy/snapshot';
import type { C15TGeoLocation } from '~/types';
import { buildConsentId } from './consent-idempotency';
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
		tenantId: undefined as string | undefined,
		geo: undefined as C15TGeoLocation | null | undefined,
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

describe('buildConsentId', () => {
	const baseIdentity = {
		tenantId: 'ins_123',
		subjectId: 'sub_user1',
		domainId: 'dom_1',
		policyId: 'pol_1',
		givenAt: GIVEN_AT_DATE,
	};

	it('stays stable for identical consent submissions', async () => {
		await expect(buildConsentId(baseIdentity)).resolves.toBe(
			await buildConsentId(baseIdentity)
		);
	});

	it('produces a prefixed base58 id in the same shape as random ids', async () => {
		await expect(buildConsentId(baseIdentity)).resolves.toMatch(
			/^cns_[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/
		);
	});

	it.each([
		['tenant', { tenantId: 'ins_other' }],
		['subject', { subjectId: 'sub_user2' }],
		['domain', { domainId: 'dom_2' }],
		['policy', { policyId: 'pol_2' }],
		['givenAt', { givenAt: new Date(GIVEN_AT + 1) }],
	])('changes when the %s changes', async (_field, override) => {
		await expect(
			buildConsentId({ ...baseIdentity, ...override })
		).resolves.not.toBe(await buildConsentId(baseIdentity));
	});

	it('distinguishes a missing tenant from a tenant literally named "default"', async () => {
		await expect(
			buildConsentId({ ...baseIdentity, tenantId: undefined })
		).resolves.not.toBe(
			await buildConsentId({ ...baseIdentity, tenantId: 'default' })
		);
	});

	it('orders ids chronologically by givenAt', async () => {
		const earlier = await buildConsentId(baseIdentity);
		const later = await buildConsentId({
			...baseIdentity,
			givenAt: new Date(GIVEN_AT + 60_000),
		});

		expect(earlier < later).toBe(true);
	});
});

describe('postSubjectHandler givenAt clamping', () => {
	const FAR_FUTURE = GIVEN_AT + 300_001;

	afterEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	function createClampContext(givenAt: number) {
		const db = createMockDb(null);
		const mockCtx = createMockContext(db, createMockRegistry());
		mockCtx.req.json = vi.fn().mockResolvedValue({ ...baseInput, givenAt });
		return { db, mockCtx };
	}

	function consentPayload(db: ReturnType<typeof createMockDb>) {
		return db.__tx.create.mock.calls.find(
			(call) => call[0] === 'consent'
		)?.[1] as Record<string, unknown> | undefined;
	}

	it('records server time when the client clock runs far ahead', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(GIVEN_AT));
		const { db, mockCtx } = createClampContext(FAR_FUTURE);

		// @ts-expect-error - simplified test context
		await postSubjectHandler(mockCtx);

		expect(consentPayload(db)?.givenAt).toEqual(new Date(GIVEN_AT));
		expect(mockCtx._ctx.logger.warn).toHaveBeenCalledWith(
			'Consent givenAt was too far in the future and was clamped to server time',
			expect.objectContaining({
				requestedGivenAt: new Date(FAR_FUTURE).toISOString(),
				clampedGivenAt: new Date(GIVEN_AT).toISOString(),
			})
		);
	});

	it('keeps the consent id stable across retries of a clamped submission', async () => {
		// Regression: clamping to `Date.now()` moves the recorded timestamp on
		// every attempt. If the id were derived from the recorded value, a client
		// with a skewed clock would write a new row per retry.
		vi.useFakeTimers();

		vi.setSystemTime(new Date(GIVEN_AT));
		const first = createClampContext(FAR_FUTURE);
		// @ts-expect-error - simplified test context
		await postSubjectHandler(first.mockCtx);

		vi.setSystemTime(new Date(GIVEN_AT + 90_000));
		const second = createClampContext(FAR_FUTURE);
		// @ts-expect-error - simplified test context
		await postSubjectHandler(second.mockCtx);

		const firstPayload = consentPayload(first.db);
		const secondPayload = consentPayload(second.db);

		expect(secondPayload?.id).toBe(firstPayload?.id);
		// The recorded timestamps really did differ — the ids matching is not
		// because the clamp was a no-op.
		expect(secondPayload?.givenAt).not.toEqual(firstPayload?.givenAt);
	});

	it('finds a pre-deterministic row by the raw timestamp after clamping', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(GIVEN_AT));
		const { db, mockCtx } = createClampContext(FAR_FUTURE);
		const legacyConsent = {
			id: 'con_legacy',
			subjectId: 'sub_user1',
			domainId: 'dom_1',
			policyId: 'pol_1',
			givenAt: new Date(FAR_FUTURE),
		};
		type ConditionBuilder = ((
			column: string,
			operator: string,
			value: unknown
		) => boolean) & {
			and: (...conditions: boolean[]) => boolean;
			isNull: (column: string) => boolean;
		};
		const conditionBuilder = ((
			column: string,
			_operator: string,
			value: unknown
		) => {
			const rowValue = legacyConsent[column as keyof typeof legacyConsent];
			return rowValue instanceof Date && value instanceof Date
				? rowValue.getTime() === value.getTime()
				: rowValue === value;
		}) as ConditionBuilder;
		conditionBuilder.and = (...conditions) => conditions.every(Boolean);
		conditionBuilder.isNull = (column) =>
			legacyConsent[column as keyof typeof legacyConsent] == null;

		db.findFirst = vi.fn(
			async (
				_table: string,
				options: { where: (builder: ConditionBuilder) => boolean }
			) => (options.where(conditionBuilder) ? legacyConsent : null)
		);

		// @ts-expect-error - simplified test context
		await postSubjectHandler(mockCtx);

		expect(mockCtx.getJsonData()).toEqual(
			expect.objectContaining({
				consentId: 'con_legacy',
				givenAt: new Date(FAR_FUTURE),
			})
		);
		// The deterministic ID misses the older random-ID row, then the legacy
		// lookup finds it using the raw timestamp stored before clamping existed.
		expect(db.findFirst).toHaveBeenCalledTimes(2);
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it('keeps the client’s original claim on the record when clamped', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(GIVEN_AT));
		const { db, mockCtx } = createClampContext(FAR_FUTURE);

		// @ts-expect-error - simplified test context
		await postSubjectHandler(mockCtx);

		expect(consentPayload(db)?.metadata).toEqual({
			json: expect.objectContaining({
				clientGivenAt: new Date(FAR_FUTURE).toISOString(),
			}),
		});
	});

	it('does not annotate metadata when the timestamp is within tolerance', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(GIVEN_AT));
		const { db, mockCtx } = createClampContext(GIVEN_AT + 300_000);

		// @ts-expect-error - simplified test context
		await postSubjectHandler(mockCtx);

		const payload = consentPayload(db);
		expect(payload?.givenAt).toEqual(new Date(GIVEN_AT + 300_000));
		expect(payload?.metadata).toEqual({
			json: expect.not.objectContaining({ clientGivenAt: expect.anything() }),
		});
		expect(mockCtx._ctx.logger.warn).not.toHaveBeenCalledWith(
			'Consent givenAt was too far in the future and was clamped to server time',
			expect.anything()
		);
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

	it('checks legacy rows after a deterministic lookup misses', async () => {
		const db = createMockDb(null);
		const registry = createMockRegistry();
		const mockCtx = createMockContext(db, registry);
		mockCtx.req.json = vi.fn().mockResolvedValue({
			...baseInput,
			givenAt: Date.now(),
		});

		// @ts-expect-error - simplified test context
		await postSubjectHandler(mockCtx);

		// This second lookup is required during rolling deployments: an older
		// process can write a random-ID row after this process has started.
		expect(db.findFirst).toHaveBeenCalledTimes(2);
		expect(db.__tx.findFirst).not.toHaveBeenCalledWith('consent', {
			where: expect.any(Function),
		});
	});

	it('falls back to submission fields for a legacy random-id record', async () => {
		const existingConsent = {
			id: 'con_legacy_random',
			givenAt: GIVEN_AT_DATE,
		};
		const db = createMockDb(null);
		db.findFirst = vi
			.fn()
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(existingConsent);
		const registry = createMockRegistry();
		const mockCtx = createMockContext(db, registry);

		// @ts-expect-error - simplified test context
		await postSubjectHandler(mockCtx);

		expect(db.findFirst).toHaveBeenCalledTimes(2);
		expect(db.transaction).not.toHaveBeenCalled();
		expect(mockCtx.getJsonData()).toEqual(
			expect.objectContaining({ consentId: 'con_legacy_random' })
		);
		const legacyWhere = db.findFirst.mock.calls[1]?.[1].where;
		const conditionBuilder = Object.assign(
			vi.fn(() => true),
			{
				and: vi.fn(() => true),
				isNull: vi.fn(() => true),
			}
		);
		legacyWhere(conditionBuilder);
		expect(conditionBuilder.isNull).toHaveBeenCalledWith('tenantId');
	});

	it('scopes the legacy fallback to the current tenant', async () => {
		const db = createMockDb(null);
		db.findFirst = vi.fn().mockResolvedValue(null);
		const registry = createMockRegistry();
		const mockCtx = createMockContext(db, registry);
		mockCtx._ctx.tenantId = 'ins_123';

		// @ts-expect-error - simplified test context
		await postSubjectHandler(mockCtx);

		const legacyWhere = db.findFirst.mock.calls[1]?.[1].where;
		const conditionBuilder = Object.assign(
			vi.fn(() => true),
			{
				and: vi.fn(() => true),
				isNull: vi.fn(() => true),
			}
		);
		legacyWhere(conditionBuilder);
		expect(conditionBuilder).toHaveBeenCalledWith('tenantId', '=', 'ins_123');
	});

	it('should return existing consent when a concurrent insert wins the race', async () => {
		const existingConsent = {
			id: 'con_existing',
			givenAt: GIVEN_AT_DATE,
		};
		const db = createMockDb(null);
		// Pre-check misses, then the post-rollback recovery lookup finds the
		// record committed by the concurrent request.
		db.findFirst = vi
			.fn()
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(existingConsent);
		db.__tx.create = vi
			.fn()
			.mockRejectedValueOnce(
				Object.assign(new Error('duplicate key value'), { code: '23505' })
			);
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
		expect(db.transaction).toHaveBeenCalledTimes(1);
		// The losing insert used the deterministic id, which is what made the
		// database reject it instead of writing a duplicate.
		expect(db.__tx.create).toHaveBeenCalledWith(
			'consent',
			expect.objectContaining({
				id: await buildConsentId({
					subjectId: 'sub_user1',
					domainId: 'dom_1',
					policyId: 'pol_1',
					givenAt: GIVEN_AT_DATE,
				}),
			})
		);
	});

	it('should retry the transaction when the winning record is not yet visible', async () => {
		const existingConsent = {
			id: 'con_existing',
			givenAt: GIVEN_AT_DATE,
		};
		const db = createMockDb(null);
		// Neither the pre-check nor the recovery lookup sees the winner yet,
		// so the handler retries the insert instead of reading again inside
		// the transaction.
		db.findFirst = vi.fn().mockResolvedValue(null);
		db.__tx.create = vi
			.fn()
			.mockRejectedValueOnce(new Error('unique conflict'))
			.mockResolvedValueOnce(existingConsent);
		const registry = createMockRegistry();
		const mockCtx = createMockContext(db, registry);

		// @ts-expect-error - simplified test context
		await postSubjectHandler(mockCtx);

		const result = mockCtx.getJsonData() as {
			consentId: string;
		};

		expect(result.consentId).toBe('con_existing');
		expect(db.transaction).toHaveBeenCalledTimes(2);
		expect(db.__tx.create).toHaveBeenCalledTimes(2);
	});

	it('should not retry or swallow non-unique-constraint errors', async () => {
		const db = createMockDb(null);
		db.__tx.create = vi.fn().mockRejectedValue(new Error('connection reset'));
		const registry = createMockRegistry();
		const mockCtx = createMockContext(db, registry);

		// @ts-expect-error - simplified test context
		await expect(postSubjectHandler(mockCtx)).rejects.toThrow();

		expect(db.transaction).toHaveBeenCalledTimes(1);
	});

	it('should give up after exhausting retries on a persistent conflict', async () => {
		const db = createMockDb(null);
		// Every attempt conflicts and the winner is never visible, so the handler
		// must surface the error rather than loop forever.
		db.findFirst = vi.fn().mockResolvedValue(null);
		db.__tx.create = vi
			.fn()
			.mockRejectedValue(
				Object.assign(new Error('duplicate key value'), { code: '23505' })
			);
		const registry = createMockRegistry();
		const mockCtx = createMockContext(db, registry);

		// @ts-expect-error - simplified test context
		await expect(postSubjectHandler(mockCtx)).rejects.toThrow();

		// Bounded: the retry loop stops instead of spinning on the conflict.
		expect(db.transaction).toHaveBeenCalledTimes(3);
	});

	it('should write the consent record under a deterministic id', async () => {
		const db = createMockDb(null);
		const registry = createMockRegistry();
		const mockCtx = createMockContext(db, registry);

		// @ts-expect-error - simplified test context
		await postSubjectHandler(mockCtx);

		const payload = db.__tx.create.mock.calls.find(
			(call) => call[0] === 'consent'
		)?.[1] as Record<string, unknown>;

		expect(payload.id).toBe(
			await buildConsentId({
				subjectId: 'sub_user1',
				domainId: 'dom_1',
				policyId: 'pol_1',
				givenAt: GIVEN_AT_DATE,
			})
		);
		expect(payload).not.toHaveProperty('dedupeKey');
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
			findFirst: vi.fn().mockResolvedValue(null),
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
			findFirst: vi.fn().mockResolvedValue(null),
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

	it('allows necessary preferences in strict scope even when omitted from policy categories', async () => {
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
		registry.findOrCreateConsentPurposeByCode = vi
			.fn()
			.mockImplementation(async (code: string) => ({ id: `purpose_${code}` }));
		const mockCtx = createMockContext(db, registry);
		mockCtx.req.json = vi.fn().mockResolvedValue({
			...baseInput,
			preferences: {
				necessary: true,
				measurement: true,
			},
		});

		// @ts-expect-error - simplified test context
		await postSubjectHandler(mockCtx);

		expect(registry.findOrCreateConsentPurposeByCode).toHaveBeenCalledWith(
			'necessary'
		);
		expect(registry.findOrCreateConsentPurposeByCode).toHaveBeenCalledWith(
			'measurement'
		);
		expect(db.__tx.create).toHaveBeenCalledWith(
			'consent',
			expect.objectContaining({
				purposeIds: {
					json: ['purpose_necessary', 'purpose_measurement'],
				},
			})
		);
		expect(mockCtx.getJsonData()).toEqual(
			expect.objectContaining({
				appliedPreferences: {
					necessary: true,
					measurement: true,
				},
			})
		);
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

	it('uses request-scoped geo for write-time policy fallback', async () => {
		vi.mocked(resolvePolicyDecision).mockResolvedValue({
			policy: {
				id: 'us_ca',
				model: 'opt-out',
				consent: { categories: ['measurement'] },
			},
			matchedBy: 'region',
			fingerprint: 'g'.repeat(64),
		});

		const db = createMockDb(null);
		const registry = createMockRegistry();
		const mockCtx = createMockContext(db, registry);
		mockCtx._ctx.geo = {
			country: { code: 'US' },
			subdivision: { code: 'CA' },
		};

		// @ts-expect-error - simplified test context
		await expect(postSubjectHandler(mockCtx)).resolves.toBeDefined();

		expect(resolvePolicyDecision).toHaveBeenCalledWith(
			expect.objectContaining({
				countryCode: 'US',
				regionCode: 'CA',
				jurisdiction: 'CCPA',
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

	it('treats a suffixed legal-document type as legal document consent', async () => {
		const db = createMockDb(null);
		const registry = createMockRegistry();
		const mockCtx = createMockContext(db, registry);
		mockCtx._ctx.legalDocumentSnapshot = {
			signingKey: 'test-signing-key',
		};
		mockCtx.req.json = vi.fn().mockResolvedValue({
			...baseInput,
			type: 'terms_and_conditions_b2b',
		});

		// @ts-expect-error - simplified test context
		await expect(postSubjectHandler(mockCtx)).rejects.toMatchObject({
			status: 409,
			message: 'Legal document snapshot token is required',
			cause: {
				code: 'LEGAL_DOCUMENT_SNAPSHOT_REQUIRED',
			},
		});

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
