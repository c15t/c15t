import { execFileSync } from 'node:child_process';

import fg from 'fast-glob';

// Keep symlinks and modes intact. Do not ship node_modules between jobs.
const paths = fg.sync(
	[
		'packages/*/dist',
		'packages/*/dist-types',
		'packages/*/src/version.ts',
		'packages/*/src/lib/version.ts',
		'.turbo/cache',
	],
	{ dot: true, onlyDirectories: false, onlyFiles: false }
);
if (!paths.some((path) => path.endsWith('/dist'))) {
	throw new Error('No built package outputs to hand off.');
}
execFileSync('tar', ['-cf', 'ci-build.tar', 'ci-plan.json', ...paths], {
	stdio: 'inherit',
});
