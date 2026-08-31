/**
 * Creating `c15t-backend.config.ts`.
 *
 * The 2.x version of this asked for an adapter, then a provider, then a
 * connection, and assembled one of five different `adapter:` expressions with
 * a matching import prelude. There is one question now and one shape of
 * output, so what is left worth testing is narrow:
 *
 * - the generated file names the chosen engine and its right connection field;
 * - the connection comes from the environment, not from the file;
 * - an existing config is left alone;
 * - cancelling writes nothing.
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	buildConfig,
	CONFIG_FILENAME,
	ensureBackendConfig,
} from './ensure-backend-config';
import type { Dialect } from './ensure-backend-config';

const prompts = {
	isCancel: (value: unknown) => value === Symbol.for('CANCEL'),
	select: vi.fn(),
};

const createMockContext = (cwd: string) => ({
	cwd,
	error: { handleCancel: vi.fn(() => null) },
	logger: { debug: vi.fn(), note: vi.fn(), success: vi.fn() },
});

const makeTmpDir = (prefix: string) =>
	fs.mkdtemp(path.join(os.tmpdir(), `${prefix}-`));

const readGenerated = (cwd: string) =>
	fs.readFile(path.join(cwd, CONFIG_FILENAME), 'utf8');

const selectResolves = (value: unknown) =>
	prompts.select.mockResolvedValueOnce(value);

beforeEach(() => {
	prompts.select.mockReset();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('buildConfig', () => {
	it.each([
		['postgres', 'url', 'DATABASE_URL'],
		['mysql', 'url', 'DATABASE_URL'],
		['sqlite', 'filename', 'DATABASE_PATH'],
	] as const)('generates %s config', (dialect, field, envVar) => {
		const content = buildConfig(dialect as Dialect);

		expect(content).toContain(`dialect: '${dialect}'`);
		expect(content).toContain(`${field}: process.env.${envVar}`);
		expect(content).toContain('defineConfig');
	});

	it('uses filename rather than url for sqlite', () => {
		// SQLite takes a path, not a URL. Getting this wrong yields a config that
		// satisfies the union and fails at connect time.
		expect(buildConfig('sqlite')).not.toContain('url:');
		expect(buildConfig('postgres')).not.toContain('filename:');
	});
});

describe('ensureBackendConfig', () => {
	it('writes a config for the chosen engine', async () => {
		const cwd = await makeTmpDir('c15t-pg');
		selectResolves('postgres');

		const result = await ensureBackendConfig(
			createMockContext(cwd) as never,
			prompts
		);

		expect(result?.path).toBe(path.join(cwd, CONFIG_FILENAME));
		// Drivers are optional peers, so the chosen engine decides which one is
		// installed.
		expect(result?.dependencies).toEqual(['@effect/sql-pg']);
		expect(await readGenerated(cwd)).toContain("dialect: 'postgres'");
	});

	it('installs the matching driver for sqlite', async () => {
		const cwd = await makeTmpDir('c15t-sqlite');
		selectResolves('sqlite');

		const result = await ensureBackendConfig(
			createMockContext(cwd) as never,
			prompts
		);

		expect(result?.dependencies).toEqual(['@effect/sql-sqlite-node']);
	});

	it('leaves an existing config alone', async () => {
		const cwd = await makeTmpDir('c15t-existing');
		const existing = '// hand-written, do not clobber\n';
		await fs.writeFile(path.join(cwd, CONFIG_FILENAME), existing, 'utf8');

		const result = await ensureBackendConfig(
			createMockContext(cwd) as never,
			prompts
		);

		// Overwriting someone's configured backend would be the worst outcome of
		// running a migration command.
		expect(await readGenerated(cwd)).toBe(existing);
		expect(result?.dependencies).toEqual([]);
		expect(prompts.select).not.toHaveBeenCalled();
	});

	it('writes nothing when cancelled', async () => {
		const cwd = await makeTmpDir('c15t-cancel');
		selectResolves(Symbol.for('CANCEL'));
		const context = createMockContext(cwd);

		const result = await ensureBackendConfig(context as never, prompts);

		expect(result).toBeNull();
		expect(context.error.handleCancel).toHaveBeenCalled();
		await expect(readGenerated(cwd)).rejects.toThrow();
	});
});
