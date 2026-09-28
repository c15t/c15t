/**
 * The closure walk is what turns "the package ships 95 KiB" into "an app carries
 * 390 KiB", so the number is only worth reporting if the walk is honest: it has to
 * follow the real entry, resolve every edge it claims to follow, and leave the
 * packages an app was going to carry anyway out of the total.
 *
 * It is also what keeps the boundary narrow. An `import type` costs nothing, so the
 * type surface of `@c15t/core` can grow freely here, while one runtime import to it
 * puts the kernel, the schema, and the translations back into every app. That edge
 * earns no compiler error, so the expected file list below is what fails instead:
 * the entry reaches nothing outside its own package, and the walk is still priced
 * against the subpath in case somebody puts the edge back.
 */

import { existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

import { REPO_ROOT } from '../measure/native';
import {
	resolveWorkspaceEntry,
	walkModuleClosure,
} from '../support/module-closure';

const DIST_DIR = join(REPO_ROOT, 'packages', 'react-native', 'dist');
const ENTRY = join(DIST_DIR, 'index.js');

// The same entry a consumer resolves, and the same root the measurement passes.
const closure = walkModuleClosure(ENTRY, REPO_ROOT);

describe('walking the built entry', () => {
	it('starts from an entry that exists, because a stale dist fakes a small closure', () => {
		expect(existsSync(ENTRY), `run the build first: ${ENTRY}`).toBe(true);
	});

	it('resolves every internal edge it follows', () => {
		expect(closure.unresolved).toEqual([]);
	});

	it('reaches the boundary files it ships', () => {
		const own = closure.files.filter((file) => file.startsWith(DIST_DIR));
		expect(own.length).toBeGreaterThan(0);
	});

	it('takes nothing from @c15t/core, because the vocabulary is local now', () => {
		// The barrel was the expensive edge and the category subpath was the cheap
		// one, allowed here for years. The package owns both category tables itself
		// now, so there is no permitted file left in `@c15t/core`: whatever the walk
		// reaches here is an edge somebody put back.
		const core = closure.files
			.filter((file) => file.startsWith(join(REPO_ROOT, 'packages', 'core')))
			.map((file) => relative(REPO_ROOT, file))
			.sort();

		expect(core).toEqual([]);
	});

	it('carries no other c15t package, because nothing reaches them now', () => {
		const packages = new Set<string>();
		for (const file of closure.files) {
			const [, name] = relative(REPO_ROOT, file).split('/');
			if (name !== undefined) {
				packages.add(name);
			}
		}

		// `core` belongs here for exactly as long as the entry reaches it, and it is
		// the whole assertion: one package in the closure is the boundary holding.
		expect([...packages].sort()).toEqual(['react-native']);
	});

	it('counts each file once, and only files', () => {
		expect(new Set(closure.files).size).toBe(closure.files.length);
		for (const file of closure.files) {
			expect(existsSync(file), file).toBe(true);
			expect(statSync(file).isFile(), file).toBe(true);
		}
	});

	it('leaves the packages an app carries anyway out of the count', () => {
		expect(closure.external).toContain('react');

		for (const specifier of closure.external) {
			expect(specifier.startsWith('@c15t/'), specifier).toBe(false);
		}

		for (const file of closure.files) {
			expect(file, 'external code must not be counted').not.toContain(
				'node_modules'
			);
		}
	});

	it('follows subpath exports, not just the package root', () => {
		// The entry no longer takes this edge, so the live closure cannot prove the
		// walker reads subpaths at all. It still has to be able to price one: the
		// file `@c15t/core/consent-categories` resolves to pulls a graph that sits
		// under directories the subpath never names, and a walk that stopped at main
		// entries would report an edge put back as two string arrays.
		const subpathEntry = resolveWorkspaceEntry(
			'@c15t/core',
			'./consent-categories',
			REPO_ROOT
		);

		if (subpathEntry === undefined) {
			throw new Error(
				'@c15t/core/consent-categories resolves to nothing, so the walk has no subpath left to be priced against'
			);
		}

		const behind = walkModuleClosure(subpathEntry, REPO_ROOT).files.map(
			(file) => relative(REPO_ROOT, file)
		);

		expect(behind).toContain('packages/core/dist/consent-record/types.js');
	});
});
