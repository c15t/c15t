/**
 * The banner's static import graph must not reach the dialog's style map.
 *
 * A `@c15t/ui` class map imports its stylesheet, so a banner module that
 * imports the dialog's map puts the dialog stylesheet wherever the banner
 * goes. `description.vue` did, and in Nuxt that made the dialog's rules
 * (14.7 KB raw) part of every page's render-blocking entry CSS. The dialog
 * loads them with its own lazy chunk.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { describe, expect, test } from 'vitest';

const componentsDir = join(__dirname, '../runtime/components');

const DIALOG_STYLE_MAPS = [
	'@c15t/ui/styles/components/consent-dialog',
	'@c15t/ui/styles/components/iab-consent-dialog',
];

/** Static (non-type) import specifiers of a module. */
const staticImports = function staticImports(source: string): string[] {
	return [
		...source.matchAll(
			/^import\s+(?!type\b)(?:[^'";]*?\s+from\s+)?['"](?<specifier>[^'"]+)['"]/gmu
		),
	].map((match) => match.groups?.specifier ?? '');
};

const resolveRelative = function resolveRelative(
	from: string,
	specifier: string
): string | undefined {
	const base = resolve(dirname(from), specifier);
	return [base, `${base}.ts`, join(base, 'index.ts')].find(
		(candidate) => existsSync(candidate) && /\.(?:ts|vue)$/u.test(candidate)
	);
};

/** Every module reachable from `entry` through static relative imports. */
const staticGraph = function staticGraph(entry: string): Map<string, string[]> {
	const graph = new Map<string, string[]>();
	const pending = [entry];
	while (pending.length > 0) {
		const file = pending.pop() as string;
		if (graph.has(file)) {
			continue;
		}
		const specifiers = staticImports(readFileSync(file, 'utf8'));
		graph.set(file, specifiers);
		for (const specifier of specifiers) {
			if (specifier.startsWith('.')) {
				const next = resolveRelative(file, specifier);
				if (next) {
					pending.push(next);
				}
			}
		}
	}
	return graph;
};

describe('banner style imports', () => {
	test('no module the banner imports statically imports a dialog style map', () => {
		const graph = staticGraph(join(componentsDir, 'prompt.vue'));
		const offenders = [...graph.entries()]
			.filter(([, specifiers]) =>
				specifiers.some((specifier) => DIALOG_STYLE_MAPS.includes(specifier))
			)
			.map(([file]) => file.replace(`${componentsDir}/`, ''));

		expect(graph.size).toBeGreaterThan(5);
		expect(offenders).toEqual([]);
	});

	test('the dialog still imports its own style map', () => {
		const graph = staticGraph(join(componentsDir, 'manager.vue'));
		const importers = [...graph.entries()].filter(([, specifiers]) =>
			specifiers.includes('@c15t/ui/styles/components/consent-dialog')
		);

		expect(importers.length).toBeGreaterThan(0);
	});
});

/** Every component stylesheet a module graph imports statically. */
const staticStylesheets = function staticStylesheets(entry: string): string[] {
	return [...staticGraph(entry).values()]
		.flat()
		.filter((specifier) =>
			/^@c15t\/ui\/styles\/components\/.+\.css$/u.test(specifier)
		);
};

describe('root style imports', () => {
	test('the Nuxt root imports no stylesheet statically: Nuxt would link it from the entry', () => {
		// Nuxt inlines the styles of each component it server-renders. A
		// stylesheet in the entry's static graph also becomes a
		// render-blocking <link>, because the entry has no other way to
		// bring it to the browser.
		expect(staticStylesheets(join(componentsDir, 'nuxt-root.vue'))).toEqual([]);
	});

	test('neither root imports the dialog trigger statically: it renders only after mount', () => {
		for (const root of ['root.vue', 'nuxt-root.vue']) {
			expect(staticStylesheets(join(componentsDir, root)), root).not.toContain(
				'@c15t/ui/styles/components/consent-dialog-trigger.css'
			);
		}
	});
});
