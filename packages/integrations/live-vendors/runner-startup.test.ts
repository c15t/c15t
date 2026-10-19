import { spawnSync } from 'node:child_process';

import { expect, it } from 'vitest';

it('starts the Bun runner before validating the vendor filter', () => {
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
			cwd: new URL('../', import.meta.url),
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
