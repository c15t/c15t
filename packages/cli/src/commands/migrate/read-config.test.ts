import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('c12', () => ({
	loadConfig: vi.fn(async () => ({
		config: { type: 'kysely', adapter: { id: 'k', type: 'kysely' } },
	})),
}));

vi.mock('@c15t/backend/v2/db/schema', async (importOriginal) => {
	const actual = await (importOriginal() as Promise<Record<string, unknown>>);
	return {
		...actual,
		DB: {
			client: vi.fn(() => ({ __db: true })),
		},
	};
});

import { DB } from '@c15t/backend/v2/db/schema';
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

	it('loads config and returns db and adapter', async () => {
		const context = {
			logger: { info: vi.fn(), debug: vi.fn(), error: vi.fn() },
		} as unknown as Parameters<typeof readConfigAndGetDb>[0];
		const { db, adapter } = await readConfigAndGetDb(context, configPath);
		expect(loadConfig).toHaveBeenCalled();
		expect(DB.client).toHaveBeenCalled();
		expect(db).toEqual({ __db: true });
		expect(adapter).toBe('kysely');
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
