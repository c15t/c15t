import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { prepareCompatCell } from '../internals/next-compat/shared/src/suite/prepare-cell';

let directory: string;
let argsPath: string;
let backendPath: string;

beforeEach(async () => {
	directory = await mkdtemp(join(tmpdir(), 'c15t-compat-prepare-'));
	argsPath = join(directory, 'args');
	backendPath = join(directory, 'backend');
	// A real child process records the command and build environment, without
	// packing packages or compiling an app in these orchestration tests.
	await writeFile(
		join(directory, 'bun'),
		'#!/bin/sh\nprintf "%s\\n" "$@" > "$COMPAT_TEST_ARGS"\nprintf "%s" "$NEXT_PUBLIC_COMPAT_BACKEND_URL" > "$COMPAT_TEST_BACKEND"\nexit "$COMPAT_TEST_EXIT"\n',
		{ mode: 0o755 }
	);
	vi.stubEnv('PATH', `${directory}:${process.env.PATH}`);
	vi.stubEnv('COMPAT_TEST_ARGS', argsPath);
	vi.stubEnv('COMPAT_TEST_BACKEND', backendPath);
	vi.stubEnv('COMPAT_TEST_EXIT', '0');
	vi.stubEnv('COMPAT_FORCE_BUILD', '');
	vi.stubEnv('COMPAT_SKIP_BUILD', '');
});

afterEach(async () => {
	vi.unstubAllEnvs();
	await rm(directory, { force: true, recursive: true });
});

describe('compatibility cell preparation', () => {
	it('restores packed packages for a cached app without rebuilding it', async () => {
		await expect(prepareCompatCell(directory, true)).resolves.toBe(false);
		expect(await readFile(argsPath, 'utf8')).toMatch(
			/shared\/scripts\/pack\.ts\n$/u
		);
	});

	it('builds an uncached app with the supplied backend URL', async () => {
		await expect(
			prepareCompatCell(directory, false, {
				NEXT_PUBLIC_COMPAT_BACKEND_URL: 'https://consent.example.com',
			})
		).resolves.toBe(true);
		expect(await readFile(argsPath, 'utf8')).toBe('run\nbuild\n');
		expect(await readFile(backendPath, 'utf8')).toBe(
			'https://consent.example.com'
		);
	});

	it('rebuilds a cached app when forced', async () => {
		vi.stubEnv('COMPAT_FORCE_BUILD', '1');
		await expect(prepareCompatCell(directory, true)).resolves.toBe(true);
		expect(await readFile(argsPath, 'utf8')).toBe('run\nbuild\n');
	});

	it('still installs packages when builds are skipped', async () => {
		vi.stubEnv('COMPAT_FORCE_BUILD', '1');
		vi.stubEnv('COMPAT_SKIP_BUILD', '1');
		await expect(prepareCompatCell(directory, false)).resolves.toBe(false);
		expect(await readFile(argsPath, 'utf8')).toMatch(/pack\.ts\n$/u);
	});

	it('rejects a failed dependency installation before a server can start', async () => {
		vi.stubEnv('COMPAT_TEST_EXIT', '1');
		await expect(prepareCompatCell(directory, true)).rejects.toThrow(
			'failed (exit 1)'
		);
	});
});
