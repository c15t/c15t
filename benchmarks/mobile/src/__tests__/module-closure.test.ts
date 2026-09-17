/**
 * The closure walk is what turns "the package ships 95 KiB" into "an app carries
 * 390 KiB", so the number is only worth reporting if the walk is honest: it has to
 * follow the real entry, resolve every edge it claims to follow, and leave the
 * packages an app was going to carry anyway out of the total.
 */

import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

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

	it('reaches both the boundary and the kernel the boundary re-exports', () => {
		const own = closure.files.filter((file) => file.startsWith(DIST_DIR));
		const core = closure.files.filter((file) =>
			file.startsWith(join(REPO_ROOT, 'packages', 'core'))
		);

		expect(own.length).toBeGreaterThan(0);
		expect(core.length).toBeGreaterThan(0);
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
		// `@c15t/schema/types` is not the package's main entry, and the files it
		// resolves to sit under a directory the package name does not mention. An
		// app's bundle pays for them, so a walk that only followed main entries would
		// understate the closure by whatever they hold.
		const schema = closure.files.filter((file) =>
			file.startsWith(join(REPO_ROOT, 'packages', 'schema'))
		);

		expect(schema.length).toBeGreaterThan(0);
	});
});
