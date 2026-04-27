import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('c12', () => ({
	loadConfig: vi.fn(async () => ({
		config: { adapter: { id: 'k', type: 'kysely' } },
	})),
}));

vi.mock('@c15t/backend/db/schema', async (importOriginal) => {
	const actual = await (importOriginal() as Promise<Record<string, unknown>>);

	type Factory = {
		client: ReturnType<typeof vi.fn>;
		names: ReturnType<typeof vi.fn> & { prefix: ReturnType<typeof vi.fn> };
	};
	const factory = {
		client: vi.fn(() => ({ __db: true })),
	} as Factory;
	const namesFn = vi.fn(() => factory) as Factory['names'];
	namesFn.prefix = vi.fn(() => factory);
	factory.names = namesFn;

	return {
		...actual,
		DB: factory,
	};
});

import { DB, snakeCaseTables } from '@c15t/backend/db/schema';
import { loadConfig } from 'c12';
import { readConfigAndGetDb } from './read-config';

const BACKEND_NOT_FOUND_RE = /Backend config not found/;
const UNKNOWN_ERROR_RE = /Unknown error loading backend config: boom/;

function createTmpDir(prefix: string) {
	return fs.mkdtemp(path.join(os.tmpdir(), `${prefix}-`));
}

describe('readConfigAndGetDb', () => {
	let cwd: string;
	let configPath: string;
	beforeEach(async () => {
		vi.clearAllMocks();
		cwd = await createTmpDir('read-config');
		configPath = path.join(cwd, 'c15t-backend.config.ts');
		await fs.writeFile(configPath, 'export default {}');
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await fs.rm(cwd, { recursive: true, force: true });
	});

	it('throws when file is missing', async () => {
		await expect(
			readConfigAndGetDb(
				{
					logger: { info: vi.fn(), debug: vi.fn(), error: vi.fn() },
				} as unknown as Parameters<typeof readConfigAndGetDb>[0],
				path.join(cwd, 'missing.config.ts')
			)
		).rejects.toThrow(BACKEND_NOT_FOUND_RE);
	});

	it('loads config and returns db', async () => {
		const context = {
			logger: { info: vi.fn(), debug: vi.fn(), error: vi.fn() },
		} as unknown as Parameters<typeof readConfigAndGetDb>[0];
		const { db } = await readConfigAndGetDb(context, configPath);
		expect(loadConfig).toHaveBeenCalled();
		expect(DB.client).toHaveBeenCalled();
		expect(db).toEqual({ __db: true });
	});

	it('applies naming variants to factory before creating client', async () => {
		(
			vi.mocked(loadConfig) as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce({
			config: {
				adapter: { id: 'k', type: 'kysely' },
				naming: { tables: snakeCaseTables() },
			},
		});
		const context = {
			logger: { info: vi.fn(), debug: vi.fn(), error: vi.fn() },
		} as unknown as Parameters<typeof readConfigAndGetDb>[0];
		await readConfigAndGetDb(context, configPath);
		const namesFn = (DB as unknown as { names: ReturnType<typeof vi.fn> })
			.names;
		expect(namesFn).toHaveBeenCalledTimes(1);
		const variants = namesFn.mock.calls[0]?.[0] as Record<
			string,
			{ sql: string; mongodb: string }
		>;
		// v2-only column on consent must be renamed (regression for buildTablesMap merge)
		expect(variants['consent.tcString']).toEqual({
			sql: 'tc_string',
			mongodb: 'tc_string',
		});
		// v2-only column on subject must be renamed
		expect(variants['subject.tenantId']).toEqual({
			sql: 'tenant_id',
			mongodb: 'tenant_id',
		});
		// v2-only table must be renamed
		expect(variants.runtimePolicyDecision).toEqual({
			sql: 'runtime_policy_decision',
			mongodb: 'runtime_policy_decision',
		});
		expect(DB.client).toHaveBeenCalled();
		const namesOrder = namesFn.mock.invocationCallOrder[0] ?? 0;
		const clientOrder =
			(DB as unknown as { client: ReturnType<typeof vi.fn> }).client.mock
				.invocationCallOrder[0] ?? 0;
		expect(namesOrder).toBeLessThan(clientOrder);
	});

	it('skips names() when naming is omitted (no-op fast path)', async () => {
		(
			vi.mocked(loadConfig) as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce({
			config: { adapter: { id: 'k', type: 'kysely' } },
		});
		const context = {
			logger: { info: vi.fn(), debug: vi.fn(), error: vi.fn() },
		} as unknown as Parameters<typeof readConfigAndGetDb>[0];
		await readConfigAndGetDb(context, configPath);
		const namesFn = (DB as unknown as { names: ReturnType<typeof vi.fn> })
			.names;
		expect(namesFn).not.toHaveBeenCalled();
	});

	it('applies tablePrefix to factory before creating client', async () => {
		(
			vi.mocked(loadConfig) as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValueOnce({
			config: {
				adapter: { id: 'k', type: 'kysely' },
				tablePrefix: 'c15t_',
			},
		});
		const context = {
			logger: { info: vi.fn(), debug: vi.fn(), error: vi.fn() },
		} as unknown as Parameters<typeof readConfigAndGetDb>[0];
		await readConfigAndGetDb(context, configPath);
		const prefixFn = (
			DB as unknown as {
				names: { prefix: ReturnType<typeof vi.fn> };
			}
		).names.prefix;
		expect(prefixFn).toHaveBeenCalledWith('c15t_');
		const prefixOrder = prefixFn.mock.invocationCallOrder[0] ?? 0;
		const clientOrder =
			(DB as unknown as { client: ReturnType<typeof vi.fn> }).client.mock
				.invocationCallOrder[0] ?? 0;
		expect(prefixOrder).toBeLessThan(clientOrder);
	});

	it('rethrows non-Error as wrapped Error', async () => {
		(
			vi.mocked(loadConfig) as unknown as ReturnType<typeof vi.fn>
		).mockRejectedValueOnce('boom');
		const context = {
			logger: { info: vi.fn(), debug: vi.fn(), error: vi.fn() },
		} as unknown as Parameters<typeof readConfigAndGetDb>[0];
		await expect(readConfigAndGetDb(context, configPath)).rejects.toThrow(
			UNKNOWN_ERROR_RE
		);
	});
});
