import { describe, expect, it, vi } from 'vitest';
import { listSubjectsHandler } from './list.handler';

const CREATED_AT = new Date('2026-07-28T00:00:00.000Z');
const GIVEN_AT = new Date('2026-07-28T01:00:00.000Z');

interface SubjectRow {
	id: string;
	externalId: string;
	createdAt: Date;
}

interface ConsentRow {
	id: string;
	subjectId: string;
	policyId: string;
	purposeIds: string[];
	givenAt: Date;
}

interface TestData {
	subjects: SubjectRow[];
	consents: ConsentRow[];
}

type TestWhereBuilder = (
	column: string,
	operator: string,
	value: unknown
) => unknown;

interface TestFindManyOptions {
	where?: (builder: TestWhereBuilder) => unknown;
}

function createTestData(
	subjectCount: number,
	consentsPerSubject: number
): TestData {
	const subjects = Array.from({ length: subjectCount }, (_, subjectIndex) => ({
		id: `sub_${subjectIndex}`,
		externalId: 'user_123',
		createdAt: CREATED_AT,
	}));
	const consents = subjects.flatMap((subject) =>
		Array.from({ length: consentsPerSubject }, (_, consentIndex) => ({
			id: `con_${subject.id}_${consentIndex}`,
			subjectId: subject.id,
			policyId: 'pol_1',
			purposeIds: ['pur_1'],
			givenAt: GIVEN_AT,
		}))
	);

	return { subjects, consents };
}

function subjectIdsFromWhere(options?: TestFindManyOptions) {
	let subjectIds: string[] | undefined;
	options?.where?.((column, operator, value) => {
		if (column === 'subjectId' && operator === 'in' && Array.isArray(value)) {
			subjectIds = value as string[];
		}
	});
	return subjectIds;
}

function tableResult(
	table: string,
	data: TestData,
	options?: TestFindManyOptions
) {
	switch (table) {
		case 'subject':
			return data.subjects;
		case 'consent': {
			const subjectIds = subjectIdsFromWhere(options);
			return subjectIds
				? data.consents.filter((consent) =>
						subjectIds.includes(consent.subjectId)
					)
				: data.consents;
		}
		case 'consentPolicy':
			return [
				{
					id: 'pol_1',
					type: 'privacy_policy',
					version: '1.0.0',
					effectiveDate: CREATED_AT,
				},
			];
		case 'consentPurpose':
			return [{ id: 'pur_1', code: 'analytics' }];
		default:
			return [];
	}
}

function createContext(data: TestData) {
	const db = {
		findMany: vi.fn((table: string, options?: TestFindManyOptions) =>
			Promise.resolve(tableResult(table, data, options))
		),
		transaction: vi.fn(),
	};
	const registry = {
		findLatestPolicyByType: vi.fn().mockResolvedValue({ id: 'pol_1' }),
	};
	const logger = {
		info: vi.fn(),
		debug: vi.fn(),
		error: vi.fn(),
	};
	const context = {
		get: (key: string) =>
			key === 'c15tContext'
				? {
						apiKeyAuthenticated: true,
						db,
						registry,
						logger,
					}
				: undefined,
		req: {
			query: (key: string) => (key === 'externalId' ? 'user_123' : undefined),
		},
		json: vi.fn((value) => value),
	};

	return { context, db, registry };
}

class ConstrainedPool {
	readonly max: number;
	readonly acquisitionTimeoutMs: number;
	readonly queryMs: number;

	active = 0;
	acquired = 0;
	released = 0;
	timedOut = 0;
	maxActive = 0;
	maxWaiting = 0;

	private readonly waiters: Array<{
		resolve: () => void;
		reject: (error: Error) => void;
		timer: ReturnType<typeof setTimeout>;
	}> = [];
	private readonly outstandingByRequest = new Map<string, number>();
	private readonly maxOutstandingByRequest = new Map<string, number>();

	constructor(options: {
		max: number;
		acquisitionTimeoutMs: number;
		queryMs: number;
	}) {
		this.max = options.max;
		this.acquisitionTimeoutMs = options.acquisitionTimeoutMs;
		this.queryMs = options.queryMs;
	}

	get waiting() {
		return this.waiters.length;
	}

	maxOutstanding(requestId: string) {
		return this.maxOutstandingByRequest.get(requestId) ?? 0;
	}

	async query<ResultType>(
		requestId: string,
		run: () => ResultType
	): Promise<ResultType> {
		this.incrementOutstanding(requestId);
		let acquired = false;

		try {
			await this.acquire();
			acquired = true;
			await new Promise((resolve) => setTimeout(resolve, this.queryMs));
			return run();
		} finally {
			if (acquired) this.release();
			this.decrementOutstanding(requestId);
		}
	}

	private incrementOutstanding(requestId: string) {
		const outstanding = (this.outstandingByRequest.get(requestId) ?? 0) + 1;
		this.outstandingByRequest.set(requestId, outstanding);
		this.maxOutstandingByRequest.set(
			requestId,
			Math.max(this.maxOutstanding(requestId), outstanding)
		);
	}

	private decrementOutstanding(requestId: string) {
		const outstanding = (this.outstandingByRequest.get(requestId) ?? 1) - 1;
		if (outstanding === 0) {
			this.outstandingByRequest.delete(requestId);
			return;
		}
		this.outstandingByRequest.set(requestId, outstanding);
	}

	private acquire(): Promise<void> {
		if (this.active < this.max) {
			this.checkout();
			return Promise.resolve();
		}

		return new Promise((resolve, reject) => {
			const waiter = {
				resolve: () => {
					clearTimeout(waiter.timer);
					this.checkout();
					resolve();
				},
				reject,
				timer: setTimeout(() => {
					const index = this.waiters.indexOf(waiter);
					if (index >= 0) this.waiters.splice(index, 1);
					this.timedOut++;
					reject(new Error('timeout exceeded when trying to connect'));
				}, this.acquisitionTimeoutMs),
			};
			this.waiters.push(waiter);
			this.maxWaiting = Math.max(this.maxWaiting, this.waiting);
		});
	}

	private checkout() {
		this.active++;
		this.acquired++;
		this.maxActive = Math.max(this.maxActive, this.active);
	}

	private release() {
		this.active--;
		this.released++;
		const waiter = this.waiters.shift();
		waiter?.resolve();
	}
}

function createPooledContext(
	data: TestData,
	pool: ConstrainedPool,
	requestId: string,
	failTable?: string
) {
	const db = {
		findMany: vi.fn((table: string, options?: TestFindManyOptions) =>
			pool.query(requestId, () => {
				if (table === failTable) throw new Error('forced query failure');
				return tableResult(table, data, options);
			})
		),
		transaction: vi.fn(),
	};
	const registry = {
		findLatestPolicyByType: vi.fn(() =>
			pool.query(requestId, () => ({ id: 'pol_1' }))
		),
	};
	const logger = {
		info: vi.fn(),
		debug: vi.fn(),
		error: vi.fn(),
	};
	const context = {
		get: (key: string) =>
			key === 'c15tContext'
				? {
						apiKeyAuthenticated: true,
						db,
						registry,
						logger,
					}
				: undefined,
		req: {
			query: (key: string) => (key === 'externalId' ? 'user_123' : undefined),
		},
		json: vi.fn((value) => value),
	};

	return { context, db };
}

describe('listSubjectsHandler', () => {
	it('skips consent and enrichment queries when no subjects match', async () => {
		const { context, db, registry } = createContext(createTestData(0, 0));

		await expect(listSubjectsHandler(context as never)).resolves.toEqual({
			subjects: [],
		});
		expect(db.findMany).toHaveBeenCalledTimes(1);
		expect(db.findMany).toHaveBeenCalledWith(
			'subject',
			expect.objectContaining({ where: expect.any(Function) })
		);
		expect(registry.findLatestPolicyByType).not.toHaveBeenCalled();
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it.each([
		{ subjectCount: 2, consentsPerSubject: 1 },
		{ subjectCount: 100, consentsPerSubject: 3 },
	])('batches $subjectCount subjects with $consentsPerSubject consents each into five queries', async ({
		subjectCount,
		consentsPerSubject,
	}) => {
		const data = createTestData(subjectCount, consentsPerSubject);
		const { context, db, registry } = createContext(data);

		const result = (await listSubjectsHandler(context as never)) as {
			subjects: Array<{ id: string; consents: unknown[] }>;
		};

		expect(db.findMany.mock.calls.map(([table]) => table)).toEqual([
			'subject',
			'consent',
			'consentPolicy',
			'consentPurpose',
		]);
		expect(registry.findLatestPolicyByType).toHaveBeenCalledTimes(1);
		expect(db.findMany).toHaveBeenCalledTimes(4);
		expect(result.subjects).toHaveLength(subjectCount);
		expect(
			result.subjects.every(
				(subject) => subject.consents.length === consentsPerSubject
			)
		).toBe(true);

		const consentWhere = db.findMany.mock.calls.find(
			([table]) => table === 'consent'
		)?.[1].where;
		const builder = vi.fn();
		consentWhere?.(builder);
		expect(builder).toHaveBeenCalledWith(
			'subjectId',
			'in',
			data.subjects.map((subject) => subject.id)
		);
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it('queries large subject lists in bounded batches', async () => {
		const data = createTestData(501, 1);
		const { context, db } = createContext(data);

		const result = (await listSubjectsHandler(context as never)) as {
			subjects: Array<{ consents: unknown[] }>;
		};

		const consentCalls = db.findMany.mock.calls.filter(
			([table]) => table === 'consent'
		);
		expect(
			consentCalls.map(([, options]) => subjectIdsFromWhere(options)?.length)
		).toEqual([500, 1]);
		expect(
			result.subjects.every((subject) => subject.consents.length === 1)
		).toBe(true);
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it('bounds concurrent GET workload to one acquisition per request', async () => {
		const requestCount = 4;
		const pool = new ConstrainedPool({
			max: 2,
			acquisitionTimeoutMs: 250,
			queryMs: 5,
		});
		const requests = Array.from({ length: requestCount }, (_, index) => {
			const requestId = `request_${index}`;
			const { context } = createPooledContext(
				createTestData(501, 2),
				pool,
				requestId
			);
			return { requestId, response: listSubjectsHandler(context as never) };
		});

		const responses = await Promise.all(
			requests.map(({ response }) => response)
		);

		expect(responses).toHaveLength(requestCount);
		expect(pool.maxActive).toBe(2);
		expect(pool.maxWaiting).toBeLessThanOrEqual(requestCount - pool.max);
		expect(pool.timedOut).toBe(0);
		expect(pool.active).toBe(0);
		expect(pool.waiting).toBe(0);
		expect(pool.acquired).toBe(pool.released);
		for (const { requestId } of requests) {
			expect(pool.maxOutstanding(requestId)).toBe(1);
		}
	});

	it('has no checked-out or queued work after a query fails', async () => {
		const pool = new ConstrainedPool({
			max: 1,
			acquisitionTimeoutMs: 250,
			queryMs: 5,
		});
		const { context, db } = createPooledContext(
			createTestData(50, 2),
			pool,
			'failing_request',
			'consentPolicy'
		);

		await expect(listSubjectsHandler(context as never)).rejects.toMatchObject({
			status: 500,
		});
		expect(pool.active).toBe(0);
		expect(pool.waiting).toBe(0);
		expect(pool.acquired).toBe(pool.released);
		expect(pool.maxOutstanding('failing_request')).toBe(1);
		expect(db.transaction).not.toHaveBeenCalled();
	});
});
