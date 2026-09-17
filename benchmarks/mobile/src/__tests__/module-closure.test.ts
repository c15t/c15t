/**
 * The closure walk is what turns "the package ships 95 KiB" into "an app carries
 * 390 KiB", so the number is only worth reporting if the walk is honest: it has to
 * follow the real entry, resolve every edge it claims to follow, and leave the
 * packages an app was going to carry anyway out of the total.
 *
 * It is also the only thing that keeps the boundary narrow. A `import type` costs
 * nothing, so the type surface of `@c15t/core` can grow freely here, while one
 * runtime import to its barrel puts the kernel, the schema, and the translations
 * back into every app. That edge has no compiler error and no failing test anywhere
 * else, so the expected file list below is what fails instead.
 */

import { existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

import { REPO_ROOT } from '../measure/native';
import { walkModuleClosure } from '../support/module-closure';

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

	it('takes only the category vocabulary from @c15t/core', () => {
		// The barrel is the expensive edge: it drags the kernel, the schema, and the
		// translations in behind two string arrays. The boundary is allowed to read
		// exactly one module instead, and nothing else from this package.
		const core = closure.files
			.filter((file) => file.startsWith(join(REPO_ROOT, 'packages', 'core')))
			.map((file) => relative(REPO_ROOT, file))
			.sort();

		expect(core).toEqual([
			'packages/core/dist/consent-categories.js',
			'packages/core/dist/consent-record/types.js',
		]);
	});

	it('carries no other c15t package, because nothing reaches them now', () => {
		const packages = new Set<string>();
		for (const file of closure.files) {
			const [, name] = relative(REPO_ROOT, file).split('/');
			if (name !== undefined) {
				packages.add(name);
			}
		}

		expect([...packages].sort()).toEqual(['core', 'react-native']);
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
		// `@c15t/core/consent-categories` is not the package's main entry, and the
		// file it resolves to sits under a directory the subpath does not mention.
		// An app's bundle pays for it, so a walk that only followed main entries
		// would report a closure with the categories missing from it.
		expect(closure.files.map((file) => relative(REPO_ROOT, file))).toContain(
			'packages/core/dist/consent-record/types.js'
		);
	});
});
