/**
 * The guard behind the whole `ui` seam.
 *
 * A single static `import` of a framework surface anywhere the client boot
 * can reach undoes the point of the option: every site's build would then
 * resolve React, Vue and Svelte, and every visitor would download whichever
 * one the bundler could not shake out. These assertions read the sources
 * rather than the bundle, so the failure lands on the line that caused it.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// `URL.pathname` keeps percent-encoding and, on Windows, produces an
// invalid `/C:/…` path; `fileURLToPath` is what the filesystem wants.
const SOURCE_ROOT = fileURLToPath(new URL('..', import.meta.url));

const FRAMEWORK_SPECIFIERS = [
	'@c15t/react',
	'@c15t/svelte',
	'@c15t/vue',
	'react',
	'react-dom',
	'react-dom/client',
	'svelte',
	'vue',
];

const listSources = function listSources(directory: string): string[] {
	const found: string[] = [];
	for (const entry of readdirSync(directory)) {
		const path = join(directory, entry);
		if (statSync(path).isDirectory()) {
			if (entry === '__tests__' || entry === 'components') {
				continue;
			}
			found.push(...listSources(path));
			continue;
		}
		if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
			found.push(path);
		}
	}
	return found;
};

/** `import x from 'y'` and `export * from 'y'`, but never `import('y')`. */
const staticSpecifiers = function staticSpecifiers(source: string): string[] {
	const pattern =
		/^\s*(?:import|export)\b[^;\n]*?from\s+'(?<specifier>[^']+)'/gmu;
	const bare = /^\s*import\s+'(?<specifier>[^']+)'/gmu;
	return [...source.matchAll(pattern), ...source.matchAll(bare)]
		.map((match) => match.groups?.specifier)
		.filter((specifier): specifier is string => specifier !== undefined);
};

describe('framework surfaces are reachable only through import()', () => {
	it.each(listSources(SOURCE_ROOT).map((path) => [path]))(
		'%s imports no framework statically',
		(path) => {
			const source = readFileSync(path, 'utf8');
			const offenders = staticSpecifiers(source).filter(
				(specifier) =>
					FRAMEWORK_SPECIFIERS.includes(specifier) ||
					specifier.startsWith('./ui/react') ||
					specifier.startsWith('./ui/vue') ||
					specifier.startsWith('./ui/svelte') ||
					specifier.includes('/islands/')
			);
			expect(offenders).toEqual([]);
		}
	);

	it.each(['react', 'vue', 'svelte'])(
		'the %s adapter only reaches its framework through import()',
		(name) => {
			const source = readFileSync(
				join(SOURCE_ROOT, 'ui', `${name}.ts`),
				'utf8'
			);
			expect(staticSpecifiers(source)).toEqual([
				'./adapter',
				'./provider-props',
			]);
			expect(source).toMatch(/await Promise\.all\(\[/u);
		}
	);

	it('keeps the adapter registry empty of framework specifiers', () => {
		const source = readFileSync(join(SOURCE_ROOT, 'ui', 'adapter.ts'), 'utf8');
		for (const name of ['./svelte', './react', './vue']) {
			expect(source).not.toContain(`import('${name}')`);
		}
	});

	it('leaves island registration to the integration', () => {
		const componentRoot = join(SOURCE_ROOT, 'components');
		for (const entry of readdirSync(componentRoot)) {
			if (!entry.endsWith('.astro')) {
				continue;
			}
			const source = readFileSync(join(componentRoot, entry), 'utf8');
			expect(source).not.toContain('registerDialogSurface');
			expect(source).not.toContain('@c15t/astro/islands/');
		}
	});
});
