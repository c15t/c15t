import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, expect, it } from 'vitest';

const fixtures: string[] = [];

afterEach(() => {
	for (const fixture of fixtures.splice(0)) {
		rmSync(fixture, { force: true, recursive: true });
	}
});

it('starts the Bun runner before validating the vendor filter', () => {
	const source = fileURLToPath(new URL('../', import.meta.url));
	const fixture = mkdtempSync(join(tmpdir(), 'c15t-probe-startup-'));
	fixtures.push(fixture);
	for (const entry of ['src', 'live-vendors', 'package.json']) {
		cpSync(join(source, entry), join(fixture, entry), { recursive: true });
	}
	symlinkSync(
		join(source, 'node_modules'),
		join(fixture, 'node_modules'),
		'dir'
	);

	const result = spawnSync(
		'bun',
		[
			'--tsconfig-override',
			'live-vendors/tsconfig.json',
			'live-vendors/runner.ts',
			'--vendor',
			'unknown-startup-test-vendor',
		],
		{
			cwd: fixture,
			encoding: 'utf8',
			timeout: 30_000,
		}
	);

	expect(result.error).toBeUndefined();
	expect(result.status).toBe(1);
	expect(result.stderr).toContain(
		'Unknown vendor "unknown-startup-test-vendor". Known vendors:'
	);
});
