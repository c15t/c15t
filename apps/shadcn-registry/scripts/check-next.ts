/**
 * Type-checks the Next.js copies of the UI items. The build rewrites
 * `c15t/react` imports to `c15t/next`, so this writes those copies to
 * `dist/next-check` and runs tsc on them with each base's vendored ui.
 */
import { spawnSync } from 'node:child_process';
import {
	cpSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import path from 'node:path';

import { toNextSource } from '../src/build-registry';
import { bases, sourceFolderByBase } from '../src/items';

const appDir = path.resolve(import.meta.dirname, '..');
const checkDir = path.join(appDir, 'dist/next-check');
const tsc = path.join(appDir, 'node_modules/.bin/tsc');

rmSync(checkDir, { force: true, recursive: true });

let failed = false;
for (const base of bases) {
	const outDir = path.join(checkDir, base);
	const sourceDir = path.join(appDir, 'registry', sourceFolderByBase[base]);
	mkdirSync(path.join(outDir, 'c15t'), { recursive: true });

	for (const file of readdirSync(sourceDir)) {
		const source = path.join(sourceDir, file);
		writeFileSync(
			path.join(outDir, 'c15t', file),
			toNextSource(readFileSync(source, 'utf8'), path.relative(appDir, source))
		);
	}
	cpSync(path.join(appDir, 'registry/setup/next'), path.join(outDir, 'setup'), {
		recursive: true,
	});

	const vendor = `../../../vendor/${base}`;
	writeFileSync(
		path.join(outDir, 'tsconfig.json'),
		JSON.stringify({
			compilerOptions: {
				paths: {
					'@/components/c15t/*': ['./c15t/*'],
					'@/components/ui/*': [`${vendor}/components/ui/*`],
					'@/lib/utils': [`${vendor}/lib/utils`],
				},
			},
			extends: `../../../tsconfig.${base}.json`,
			include: ['c15t', 'setup', vendor],
		})
	);

	const result = spawnSync(tsc, ['-p', path.join(outDir, 'tsconfig.json')], {
		stdio: 'inherit',
	});
	if (result.status !== 0) {
		console.error(`Next.js copies for ${base} failed to type-check.`);
		failed = true;
	}
}

process.exitCode = failed ? 1 : 0;
