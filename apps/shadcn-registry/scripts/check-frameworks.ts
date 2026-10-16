/**
 * Type-checks the Next.js and TanStack Start copies of the UI items. The
 * build rewrites their `c15t/react` imports to the framework's entry point,
 * so this writes those copies to `dist/framework-check` and runs tsc on
 * them with each base's vendored ui and the framework's setup files.
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

import { toFrameworkSource } from '../src/build-registry';
import { bases, frameworks, sourceFolderByBase } from '../src/items';

const appDir = path.resolve(import.meta.dirname, '..');
const checkDir = path.join(appDir, 'dist/framework-check');
const tsc = path.join(appDir, 'node_modules/.bin/tsc');

rmSync(checkDir, { force: true, recursive: true });

let failed = false;
// The React copies are the sources, which tsconfig.<base>.json checks.
for (const framework of frameworks.filter((name) => name !== 'react')) {
	for (const base of bases) {
		const outDir = path.join(checkDir, framework, base);
		const sourceDir = path.join(appDir, 'registry', sourceFolderByBase[base]);
		mkdirSync(path.join(outDir, 'c15t'), { recursive: true });

		for (const file of readdirSync(sourceDir)) {
			const source = path.join(sourceDir, file);
			writeFileSync(
				path.join(outDir, 'c15t', file),
				toFrameworkSource(
					readFileSync(source, 'utf8'),
					path.relative(appDir, source),
					framework
				)
			);
		}
		cpSync(
			path.join(appDir, 'registry/setup', framework),
			path.join(outDir, 'setup'),
			{ recursive: true }
		);

		const toApp = path.relative(outDir, appDir);
		const vendor = `${toApp}/vendor/${base}`;
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
				extends: `${toApp}/tsconfig.${base}.json`,
				include: ['c15t', 'setup', vendor],
			})
		);

		const result = spawnSync(tsc, ['-p', path.join(outDir, 'tsconfig.json')], {
			stdio: 'inherit',
		});
		if (result.status !== 0) {
			console.error(`${framework} copies for ${base} failed to type-check.`);
			failed = true;
		}
	}
}

process.exitCode = failed ? 1 : 0;
