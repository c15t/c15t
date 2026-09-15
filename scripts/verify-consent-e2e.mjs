import { spawnSync } from 'node:child_process';

const result = spawnSync(
	'bun',
	['run', '--cwd', 'examples/shared', 'test:ssr'],
	{ stdio: 'inherit' }
);
process.exitCode = result.status ?? 1;
