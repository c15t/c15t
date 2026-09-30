/**
 * Builds every Tailwind matrix fixture in the current workspace (`v3/` or
 * `v4/`), one at a time. Pass fixture ids to build only those.
 *
 * ```sh
 * bun run --cwd benchmarks/tailwind-matrix/v4 build
 * bun run --cwd benchmarks/tailwind-matrix/v3 build vue nuxt
 * ```
 */
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

import { TAILWIND_MATRIX_FIXTURES } from './fixtures';

const workspace = process.cwd();
const only = new Set(process.argv.slice(2));
const failed: string[] = [];

for (const fixture of TAILWIND_MATRIX_FIXTURES) {
	if (only.size > 0 && !only.has(fixture.id)) {
		continue;
	}
	const [bin, ...args] = fixture.build;
	console.log(`\n> ${fixture.label}: ${bin} ${args.join(' ')}`);
	const result = spawnSync(join(workspace, 'node_modules', '.bin', bin), args, {
		cwd: join(workspace, fixture.id),
		env: { ...process.env, NODE_ENV: 'production' },
		stdio: 'inherit',
	});
	if (result.status !== 0) {
		failed.push(fixture.label);
	}
}

if (failed.length > 0) {
	console.error(`\nFailed to build: ${failed.join(', ')}`);
	process.exit(1);
}
