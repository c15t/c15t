/**
 * The banner's static import graph must not reach the dialog or IAB class
 * maps. Bundlers keep whole modules, so any of them reached from the banner
 * ships in the first load of every page that renders it, together with the
 * stylesheet the class map imports.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { describe, expect, test } from 'vitest';

const LIB = resolve(__dirname, '../lib');

const IMPORT_PATTERN =
	/(?:^|\n)\s*(?:import|export)\s+(?!type\b)(?:[^'";]*?\sfrom\s+)?['"](?<specifier>[^'"]+)['"]/gu;

const resolveRelative = function resolveRelative(
	from: string,
	specifier: string
): string | null {
	const base = resolve(dirname(from), specifier);
	for (const candidate of [base, `${base}.ts`, `${base}/index.ts`]) {
		try {
			readFileSync(candidate);
			return candidate;
		} catch {
			// try the next candidate
		}
	}
	return null;
};

/** Every `@c15t/ui/styles/components/*` class map `entry` reaches statically. */
const classMapsReachedFrom = function classMapsReachedFrom(
	entry: string
): Set<string> {
	const classMaps = new Set<string>();
	const seen = new Set<string>();
	const queue = [entry];
	while (queue.length > 0) {
		const file = queue.pop() as string;
		if (seen.has(file)) {
			continue;
		}
		seen.add(file);
		for (const match of readFileSync(file, 'utf8').matchAll(IMPORT_PATTERN)) {
			const { specifier } = match.groups ?? {};
			if (!specifier) {
				continue;
			}
			if (specifier.startsWith('@c15t/ui/styles/components/')) {
				classMaps.add(specifier.slice('@c15t/ui/styles/components/'.length));
			} else if (specifier.startsWith('.')) {
				const next = resolveRelative(file, specifier);
				if (next) {
					queue.push(next);
				}
			}
		}
	}
	return classMaps;
};

describe('banner class maps', () => {
	test('ConsentBanner reaches no dialog or IAB class map', () => {
		const reached = classMapsReachedFrom(
			resolve(LIB, 'components/prompt.svelte')
		);

		expect(reached).toContain('consent-banner');
		expect(reached).not.toContain('consent-dialog');
		expect(reached).not.toContain('iab-consent-banner');
		expect(reached).not.toContain('iab-consent-dialog');
	});

	test('the shared overlay imports no class map of its own', () => {
		expect(
			classMapsReachedFrom(resolve(LIB, 'components/overlay.svelte'))
		).toEqual(new Set());
	});
});
