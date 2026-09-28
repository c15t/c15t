import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import {
	checkVendoredCore,
	compareTrees,
	listFiles,
	syncVendoredCore,
	vendoredCorePlan,
} from './sync-vendored-core';

const scratchRoot = mkdtempSync(join(tmpdir(), 'c15t-vendored-core-'));
afterAll(() => {
	rmSync(scratchRoot, { force: true, recursive: true });
});

/** Write a directory tree from a path-to-contents map. */
const makeTree = function makeTree(
	root: string,
	files: Record<string, string>
): string {
	for (const [path, contents] of Object.entries(files)) {
		const target = join(root, path);

		mkdirSync(dirname(target), { recursive: true });
		writeFileSync(target, contents);
	}

	return root;
};

describe('listFiles', () => {
	it('returns nothing for a directory that does not exist', () => {
		expect(listFiles(join(scratchRoot, 'absent'))).toStrictEqual([]);
	});

	it('walks nested directories and sorts the result', () => {
		const tree = makeTree(join(scratchRoot, 'list'), {
			'Nested/deep.swift': 'd',
			'Nested/earlier.swift': 'e',
			'alpha.swift': 'a',
			'zeta.swift': 'z',
		});

		// Order only has to be deterministic, and code-unit order is what a regenerated tree stays
		// stable under, which is the property that keeps a diff of vendor/ reviewable.
		expect(listFiles(tree)).toStrictEqual([
			'Nested/deep.swift',
			'Nested/earlier.swift',
			'alpha.swift',
			'zeta.swift',
		]);
	});
});

describe('compareTrees', () => {
	it('accepts a byte-for-byte copy', () => {
		const source = makeTree(join(scratchRoot, 'clean-source'), {
			'Core.swift': 'one',
			'Nested/Wire.swift': 'two',
		});
		const target = makeTree(join(scratchRoot, 'clean-target'), {
			'Core.swift': 'one',
			'Nested/Wire.swift': 'two',
		});

		expect(compareTrees(source, target)).toStrictEqual([]);
	});

	it('names a copy whose bytes differ', () => {
		const source = makeTree(join(scratchRoot, 'diff-source'), {
			'Core.swift': 'the source of truth',
		});
		makeTree(join(scratchRoot, 'diff-target'), {
			'Core.swift': 'edited inside the package',
		});

		expect(
			compareTrees(source, join(scratchRoot, 'diff-target'))
		).toStrictEqual([{ kind: 'different', relativePath: 'Core.swift' }]);
	});

	it('names a file the copy never received', () => {
		const source = makeTree(join(scratchRoot, 'missing-source'), {
			'Core.swift': 'one',
			'Late.swift': 'two',
		});
		const target = makeTree(join(scratchRoot, 'missing-target'), {
			'Core.swift': 'one',
		});

		expect(compareTrees(source, target)).toStrictEqual([
			{ kind: 'missing', relativePath: 'Late.swift' },
		]);
	});

	it('names a file the core no longer has', () => {
		// A deleted core file that survives in the copy keeps compiling, so the pod would ship a
		// type the source of truth does not contain.
		const source = makeTree(join(scratchRoot, 'orphan-source'), {
			'Core.swift': 'one',
		});
		const target = makeTree(join(scratchRoot, 'orphan-target'), {
			'Core.swift': 'one',
			'Renamed.swift': 'two',
		});

		expect(compareTrees(source, target)).toStrictEqual([
			{ kind: 'orphan', relativePath: 'Renamed.swift' },
		]);
	});

	it('accepts a copy of an absent source without inventing orphans', () => {
		const target = makeTree(join(scratchRoot, 'absent-source-target'), {
			'Core.swift': 'one',
		});

		expect(
			compareTrees(join(scratchRoot, 'absent-source'), target)
		).toStrictEqual([{ kind: 'orphan', relativePath: 'Core.swift' }]);
	});
});

describe('syncVendoredCore', () => {
	it('writes the tree and drops a file the source no longer has', () => {
		const source = makeTree(join(scratchRoot, 'write-source'), {
			'Core.swift': 'the source of truth',
			'Nested/Wire.swift': 'wire',
		});
		const target = makeTree(join(scratchRoot, 'write-target'), {
			'Core.swift': 'edited inside the package',
			'Renamed.swift': 'a core file that was renamed upstream',
		});

		expect(
			syncVendoredCore({ sourceDir: source, targetDir: target })
		).toStrictEqual([]);

		expect(listFiles(target)).toStrictEqual([
			'Core.swift',
			'Nested/Wire.swift',
		]);
		expect(readFileSync(join(target, 'Core.swift'), 'utf8')).toBe(
			'the source of truth'
		);
		expect(compareTrees(source, target)).toStrictEqual([]);
	});

	it('refuses a source tree with no files in it', () => {
		const source = makeTree(join(scratchRoot, 'empty-source'), {});
		const target = join(scratchRoot, 'empty-target');

		// A silent empty vendor tree would publish a pod whose source_files matches nothing:
		// the app builds a consent SDK with no consent kernel inside it.
		expect(() =>
			syncVendoredCore({ sourceDir: source, targetDir: target })
		).toThrow(/no files found/iu);
	});

	it('reports drift in check mode without repairing it', () => {
		const source = makeTree(join(scratchRoot, 'check-source'), {
			'Core.swift': 'one',
		});
		const target = makeTree(join(scratchRoot, 'check-target'), {
			'Core.swift': 'two',
		});

		expect(
			syncVendoredCore({ check: true, sourceDir: source, targetDir: target })
		).toStrictEqual([{ kind: 'different', relativePath: 'Core.swift' }]);
		expect(readFileSync(join(target, 'Core.swift'), 'utf8')).toBe('two');
	});
});

describe('the vendored core in this repository', () => {
	it('maps every file of the Swift core into the package', () => {
		const plan = vendoredCorePlan();

		// The core is one flat directory of Swift today. A plan that comes back empty means the
		// layout moved, and an empty copy ships a pod with no kernel in it.
		expect(plan.length).toBeGreaterThan(0);
		expect(plan.map((file) => file.relativePath)).toContain(
			'ConsentCore.swift'
		);

		for (const file of plan) {
			expect(existsSync(file.vendoredPath), file.vendoredPath).toBe(true);
		}
	});

	it('is byte-for-byte what native/core-swift contains', () => {
		// Fails the pull request rather than the release: the copy is generated, so any
		// difference means someone edited it by hand or changed the core without syncing.
		expect(
			checkVendoredCore().map((drift) => drift.relativePath)
		).toStrictEqual([]);
	});
});
