/**
 * Copies .module.css source files to dist/ so that Vite-based consumers
 * (e.g. @c15t/svelte) can resolve raw CSS instead of the rspack
 * style-loader JS bundles produced by `injectStyles: true`.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const SRC = join(ROOT, 'src/styles');
const DIST = join(ROOT, 'dist/styles');

function walk(dir: string) {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			walk(full);
		} else if (entry.endsWith('.module.css')) {
			const rel = relative(SRC, full);
			const dest = join(DIST, rel);
			const destDir = dirname(dest);
			if (!existsSync(destDir)) {
				mkdirSync(destDir, { recursive: true });
			}
			cpSync(full, dest);
			console.log(`  copied ${rel}`);
		}
	}
}

console.log('Copying CSS modules to dist...');
walk(SRC);
console.log('Done.');
