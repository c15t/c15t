import { describe, expect, it, vi } from 'vitest';
import type { WriteReplayClaim } from '~/types';
import {
	buildWriteReplayId,
	buildWriteRequestFingerprint,
	type ConsumeWriteReplayOptions,
	consumeWriteReplay,
} from './replay';

type ReplayDatabase = ConsumeWriteReplayOptions['database'];
type ReplayRecord = {
	id: string;
	tenantId: string | null;
	audience: string;
	tokenId: string;
	requestFingerprint: string;
	expiresAt: Date;
};

const claim: WriteReplayClaim = {
	tokenId: 'credential-1',
	tenantId: 'tenant-a',
	audience: 'subject-1',
	requestFingerprint: 'sha256:request-a',
	expiresAt: new Date('2030-01-01T00:00:00.000Z'),
};

function createDatabase() {
	const records = new Map<string, ReplayRecord>();
	const create = vi.fn(async (_table: string, value: ReplayRecord) => {
		if (records.has(value.id)) {
			throw Object.assign(new Error('duplicate key'), { code: '23505' });
		}
		records.set(value.id, value);
		return value;
	});
	const findFirst = vi.fn(async () => records.values().next().value ?? null);

	return {
		database: { create, findFirst } as unknown as ReplayDatabase,
		create,
		findFirst,
		records,
	};
}

describe('buildWriteReplayId', () => {
	it('is stable across fingerprints but scoped by credential identity', async () => {
		const first = await buildWriteReplayId(claim);
		const alteredRequest = await buildWriteReplayId({
			...claim,
			requestFingerprint: 'sha256:request-b',
		});
		const otherTenant = await buildWriteReplayId({
			...claim,
			tenantId: 'tenant-b',
		});

		expect(first).toBe(alteredRequest);
		expect(first).toMatch(/^wrp_/);
		expect(otherTenant).not.toBe(first);
	});
});

describe('buildWriteRequestFingerprint', () => {
	it('recursively sorts object keys while preserving array order', async () => {
		const first = await buildWriteRequestFingerprint({
			action: 'consent:create',
			body: {
				preferences: { analytics: true, marketing: false },
				domain: 'example.com',
				purposes: ['analytics', 'marketing'],
			},
		});
		const reordered = await buildWriteRequestFingerprint({
			body: {
				purposes: ['analytics', 'marketing'],
				domain: 'example.com',
				preferences: { marketing: false, analytics: true },
			},
			action: 'consent:create',
		});
		const altered = await buildWriteRequestFingerprint({
			action: 'consent:create',
			body: {
				preferences: { analytics: false, marketing: false },
				domain: 'example.com',
				purposes: ['analytics', 'marketing'],
			},
		});

		expect(first).toBe(reordered);
		expect(first).toMatch(/^sha256:[a-f0-9]{64}$/);
		expect(altered).not.toBe(first);
	});

	it('lets exact semantic retries pass while altered requests are rejected', async () => {
		const { database } = createDatabase();
		const firstFingerprint = await buildWriteRequestFingerprint({
			domain: 'example.com',
			preferences: { analytics: true, marketing: false },
		});
		const reorderedFingerprint = await buildWriteRequestFingerprint({
			preferences: { marketing: false, analytics: true },
			domain: 'example.com',
		});
		const alteredFingerprint = await buildWriteRequestFingerprint({
			domain: 'example.com',
			preferences: { analytics: false, marketing: false },
		});

		await consumeWriteReplay({
			claim: { ...claim, requestFingerprint: firstFingerprint },
			database,
		});
		await expect(
			consumeWriteReplay({
				claim: { ...claim, requestFingerprint: reorderedFingerprint },
				database,
			})
		).resolves.toEqual({ status: 'idempotent' });
		await expect(
			consumeWriteReplay({
				claim: { ...claim, requestFingerprint: alteredFingerprint },
				database,
			})
		).resolves.toEqual({ status: 'replayed' });
	});
});

describe('consumeWriteReplay', () => {
	it('atomically inserts before performing a read', async () => {
		const { database, create, findFirst } = createDatabase();

		await expect(consumeWriteReplay({ claim, database })).resolves.toEqual({
			status: 'consumed',
		});
		expect(create).toHaveBeenCalledOnce();
		expect(findFirst).not.toHaveBeenCalled();
	});

	it('treats an exact retry as idempotent', async () => {
		const { database } = createDatabase();

		await consumeWriteReplay({ claim, database });
		await expect(consumeWriteReplay({ claim, database })).resolves.toEqual({
			status: 'idempotent',
		});
	});

	it('rejects the same credential with an altered fingerprint', async () => {
		const { database } = createDatabase();

		await consumeWriteReplay({ claim, database });
		await expect(
			consumeWriteReplay({
				claim: { ...claim, requestFingerprint: 'sha256:request-b' },
				database,
			})
		).resolves.toEqual({ status: 'replayed' });
	});

	it('allows only one concurrent consumer and makes its exact peer idempotent', async () => {
		const { database } = createDatabase();
		const results = await Promise.all([
			consumeWriteReplay({ claim, database }),
			consumeWriteReplay({ claim, database }),
		]);

		expect(results).toEqual([{ status: 'consumed' }, { status: 'idempotent' }]);
	});

	it('does not hide non-unique database errors', async () => {
		const error = new Error('database unavailable');
		const database = {
			create: vi.fn(async () => {
				throw error;
			}),
			findFirst: vi.fn(),
		} as unknown as ReplayDatabase;

		await expect(consumeWriteReplay({ claim, database })).rejects.toBe(error);
	});

	it('supports boolean and richer custom store results', async () => {
		const { database } = createDatabase();

		await expect(
			consumeWriteReplay({
				claim,
				database,
				replayStore: { consume: async () => true },
			})
		).resolves.toEqual({ status: 'consumed' });

		await expect(
			consumeWriteReplay({
				claim,
				database,
				replayStore: {
					consume: async () => ({ status: 'idempotent' }),
				},
			})
		).resolves.toEqual({ status: 'idempotent' });

		await expect(
			consumeWriteReplay({
				claim,
				database,
				replayStore: { consume: async () => false },
			})
		).resolves.toEqual({ status: 'replayed' });
	});
});
