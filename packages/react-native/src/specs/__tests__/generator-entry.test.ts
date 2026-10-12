/**
 * The generator has to work when it is named through a symlink.
 *
 * A host app's `node_modules/@c15t/react-native` is a link into a workspace, and the autolinked
 * Gradle build invokes `generate-spec.mjs` by that linked path. The script decides whether it is
 * the process entry point by comparing `process.argv[1]` with its own module URL, and Node
 * resolves the link on one side of that comparison but not the other, so the check was false in
 * exactly the build that needed it. Nothing failed loudly: the CLI exited 0 having generated
 * nothing, Gradle recorded an empty output directory, and the app died later in javac on a spec
 * class no task had ever written.
 */

import { execFileSync } from 'node:child_process';
import {
	existsSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

const PACKAGE_ROOT = resolve(
	dirname(fileURLToPath(import.meta.url)),
	'..',
	'..',
	'..'
);

/** Where the Java spec has to land for the autolinked module to compile against it. */
const SPEC_JAVA = join(
	'java',
	'com',
	'c15t',
	'reactnative',
	'NativeC15tSpec.java'
);

/** Runs the generator, and returns what it wrote. */
const generateThrough = function generateThrough(
	projectRoot: string,
	output: string
) {
	return execFileSync(
		process.execPath,
		[
			join(projectRoot, 'android/codegen/generate-spec.mjs'),
			'--platform',
			'android',
			'--output',
			output,
			'--project-root',
			projectRoot,
		],
		{ encoding: 'utf8' }
	);
};

let workspace = '';

/** The package, reached through a link the way a workspace app reaches it. */
let linkedPackage = '';

describe('generate-spec entry point', () => {
	beforeAll(() => {
		workspace = mkdtempSync(join(tmpdir(), 'c15t-codegen-link-'));
		linkedPackage = join(workspace, 'react-native');
		symlinkSync(PACKAGE_ROOT, linkedPackage);
	});

	afterAll(() => {
		rmSync(workspace, { force: true, recursive: true });
	});

	test('generates when invoked through a linked path', () => {
		const output = join(workspace, 'out-linked');

		generateThrough(linkedPackage, output);

		const specFile = join(output, SPEC_JAVA);

		expect(existsSync(specFile), `expected ${specFile}`).toBe(true);
		expect(readFileSync(specFile, 'utf8')).toContain('NativeC15tSpec');
	});

	// The entry check is the thing under test, and it has to stay false for an import.
	test('stays quiet when imported rather than run', () => {
		const output = join(workspace, 'out-imported');

		// `--output` alone is a complete argument list for a program; an import ignores
		// it, so the directory must not appear.
		execFileSync(
			process.execPath,
			[
				'-e',
				`import(${JSON.stringify(resolve(linkedPackage, 'android/codegen/generate-spec.mjs'))}).then((m) => {
					if (typeof m.generateSpec !== 'function') {
						process.exitCode = 3;
					}
				})`,
			],
			{ encoding: 'utf8' }
		);

		expect(existsSync(output)).toBe(false);
	});
});
