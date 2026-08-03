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

vi.mock('c12', () => ({
	loadConfig: vi.fn(async () => ({
		config: { database: { dialect: 'postgres', url: 'postgres://x/y' } },
	})),
}));

import { loadConfig } from 'c12';
import { readDatabaseConfig } from './read-config';

const NOT_FOUND_RE = /Backend config not found/;

const createTmpDir = (prefix: string) =>
	fs.mkdtemp(path.join(os.tmpdir(), `${prefix}-`));

const context = () =>
	({
		logger: { info: vi.fn(), debug: vi.fn(), error: vi.fn() },
	}) as unknown as Parameters<typeof readDatabaseConfig>[0];

describe('readDatabaseConfig', () => {
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

	it('throws when the file is missing', async () => {
		await expect(
			readDatabaseConfig(context(), path.join(cwd, 'missing.config.ts'))
		).rejects.toThrow(NOT_FOUND_RE);
	});

	it('returns the database option', async () => {
		await expect(readDatabaseConfig(context(), configPath)).resolves.toEqual({
			dialect: 'postgres',
			url: 'postgres://x/y',
		});
	});

	it('names the 2.x adapter field when database is missing', async () => {
		(loadConfig as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			config: { adapter: { id: 'kysely' } },
		});

		// The exact situation of someone upgrading. "Missing database" alone
		// would not tell them their existing, previously-valid config is the
		// reason.
		await expect(readDatabaseConfig(context(), configPath)).rejects.toThrow(
			/adapter/
		);
	});

	it('passes a caller-supplied layer straight through', async () => {
		const layer = { __layer: true };
		(loadConfig as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			config: { database: layer },
		});

		// A config file is code, and someone will reasonably build their own
		// client in it to share a pool.
		await expect(readDatabaseConfig(context(), configPath)).resolves.toBe(
			layer
		);
	});

	it('wraps a non-Error throw', async () => {
		(loadConfig as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
			'boom'
		);

		await expect(readDatabaseConfig(context(), configPath)).rejects.toThrow(
			/Unknown error loading backend config: boom/
		);
	});
});
