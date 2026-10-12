#!/usr/bin/env node
/**
 * Restores `'use client'` directives on built dist files.
 *
 * rslib (bundleless + minify) drops leading directives, which breaks any
 * true React Server Component consumer importing package files directly
 * (client-only modules get treated as server code). This walks `src`,
 * finds modules that start with a use-client directive, and prepends it to
 * the corresponding `dist/**` `.js`/`.mjs` outputs.
 *
 * Usage: node ../shared/restore-client-directives.mjs [srcDir] [distDir...]
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const [srcArg = 'src', ...distArgs] = process.argv.slice(2);
const srcDir = resolve(srcArg);
const distDirs = (distArgs.length > 0 ? distArgs : ['dist']).map((d) =>
	resolve(d)
);

const DIRECTIVE = /^(?:'use client'|"use client");?\s*\n/u;

const walk = function* walk(dir) {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			if (entry === 'node_modules' || entry.startsWith('__tests__')) {
				continue;
			}
			yield* walk(full);
		} else if (
			/\.(?<capture1>ts|tsx|js|jsx)$/u.test(entry) &&
			!/\.test\./u.test(entry)
		) {
			yield full;
		}
	}
};

let restored = 0;
for (const file of walk(srcDir)) {
	const source = readFileSync(file, 'utf8');
	if (!DIRECTIVE.test(source)) {
		continue;
	}
	const rel = relative(srcDir, file).replace(/\.(?<capture1>tsx?|jsx?)$/u, '');
	for (const distDir of distDirs) {
		for (const ext of ['.js', '.mjs']) {
			const target = join(distDir, `${rel}${ext}`);
			try {
				const built = readFileSync(target, 'utf8');
				if (
					!built.startsWith('"use client"') &&
					!built.startsWith("'use client'")
				) {
					writeFileSync(target, `"use client";\n${built}`);
					restored += 1;
				}
			} catch {
				// output variant doesn't exist — fine
			}
		}
	}
}
console.log(`[restore-client-directives] restored ${restored} file(s)`);
