/**
 * Loading the backend config.
 *
 * The case worth the most here is the upgrade one: a 2.x config has `adapter`
 * and no `database`, and the error has to say so rather than report a missing
 * field the operator has never heard of.
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { readDatabaseConfig } from './read-config';

const loadConfig = vi.fn(() =>
	Promise.resolve({
		config: { database: { dialect: 'postgres', url: 'postgres://x/y' } },
	})
);
const dependencies = {
	loadConfig,
};
const NOT_FOUND_RE = /Backend config not found/u;

const createTmpDir = (prefix: string) =>
	fs.mkdtemp(path.join(os.tmpdir(), `${prefix}-`));

const context = () =>
	({
		logger: { debug: vi.fn(), error: vi.fn(), info: vi.fn() },
	}) as unknown as Parameters<typeof readDatabaseConfig>[0];

describe('readDatabaseConfig', () => {
	let cwd: string;
	let configPath: string;

	beforeEach(async () => {
		cwd = await createTmpDir('read-config');
		configPath = path.join(cwd, 'c15t-backend.config.ts');
		await fs.writeFile(configPath, 'export default {}');
		loadConfig.mockResolvedValue({
			config: { database: { dialect: 'postgres', url: 'postgres://x/y' } },
		});
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await fs.rm(cwd, { force: true, recursive: true });
	});

	it('throws when the file is missing', async () => {
		await expect(
			readDatabaseConfig(
				context(),
				path.join(cwd, 'missing.config.ts'),
				dependencies
			)
		).rejects.toThrow(NOT_FOUND_RE);
	});

	it('returns the database option', async () => {
		await expect(
			readDatabaseConfig(context(), configPath, dependencies)
		).resolves.toEqual({
			dialect: 'postgres',
			url: 'postgres://x/y',
		});
	});

	it('names the 2.x adapter field when database is missing', async () => {
		loadConfig.mockResolvedValueOnce({
			config: { adapter: { id: 'kysely' } },
		});

		// The exact situation of someone upgrading. "Missing database" alone
		// would not tell them their existing, previously-valid config is the
		// reason.
		await expect(
			readDatabaseConfig(context(), configPath, dependencies)
		).rejects.toThrow(/adapter/u);
	});

	it('passes a caller-supplied layer straight through', async () => {
		const layer = { __layer: true };
		loadConfig.mockResolvedValueOnce({
			config: { database: layer },
		});

		// A config file is code, and someone will reasonably build their own
		// client in it to share a pool.
		await expect(
			readDatabaseConfig(context(), configPath, dependencies)
		).resolves.toBe(layer);
	});

	it('wraps a non-Error throw', async () => {
		loadConfig.mockRejectedValueOnce('boom');

		await expect(
			readDatabaseConfig(context(), configPath, dependencies)
		).rejects.toThrow(/Unknown error loading backend config: boom/u);
	});
});
