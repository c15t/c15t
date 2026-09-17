#!/usr/bin/env node

/**
 * Runs React Native's Codegen against `src/specs`, and nothing else.
 *
 * The three consumers are the two Gradle builds and the drift check:
 *
 * - `:c15t-spec` with `-Pc15t.spec.source=codegen` swaps its source set to what this
 *   writes, which is how the repository proves the hand-written stand-in still matches
 *   generated output. That module is a `compileOnly` dependency of the bridge, so what
 *   lands here reaches neither the AAR nor the pod.
 * - `c15t-react-native/library.gradle` writes the same output into the bridge module in a
 *   host app, where there is no stand-in project to lean on.
 * - `src/specs/__tests__/{android,ios}-spec-surface.test.ts` spawn this exact command and
 *   compare what it wrote against the hand-written side, so the check grades the command
 *   CI runs rather than a second implementation of it.
 *
 * The library semantics matter. `react-native/scripts/generate-codegen-artifacts.js` is
 * the app entry point: given this package it scans for codegen-enabled libraries, treats
 * the folder as an app, and emits the spec under its own default package
 * `com.facebook.fbreact.specs`, which is not the package `codegenConfig` declares and not
 * the one `C15tReactNativeModule` compiles against. This script does what React Native's
 * own Gradle plugin does for a library instead: combine the library's own `jsSrcsDir` into
 * a schema, then generate with the library name and the `javaPackageName` from
 * `codegenConfig`. Those are the same two `@react-native/codegen` calls, and the same
 * arguments, that `generateCodegenSchemaFromJavaScript` and
 * `generateCodegenArtifactsFromSchema` run in an app that builds this library.
 */

import {
	existsSync,
	readdirSync,
	readFileSync,
	realpathSync,
	rmSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, join, parse, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/** The `@c15t/react-native` package root, which owns `package.json` and `src/specs`. */
const PACKAGE_ROOT = resolve(HERE, '..', '..');

const PLATFORMS = new Set(['android', 'ios']);

/** Flags that stand alone, so the next argument is never swallowed as their value. */
const BOOLEAN_FLAGS = new Set(['help']);

/** `codegenConfig.type` to the generator names that handle it on one platform. */
const GENERATORS_BY_TYPE = {
	all: { android: ['componentsAndroid', 'modulesAndroid'], ios: ['componentsIOS', 'modulesIOS'] },
	components: { android: ['componentsAndroid'], ios: ['componentsIOS'] },
	modules: { android: ['modulesAndroid'], ios: ['modulesIOS'] },
};

/** A failure whose whole job is to tell a build log what to do next. */
export class CodegenError extends Error {}

/**
 * The `codegenConfig` block, with the defaults React Native itself would apply.
 *
 * @param {string} projectRoot A directory containing the `package.json` that declares the spec.
 */
const readCodegenConfig = function readCodegenConfig(projectRoot) {
	const packageJsonPath = join(projectRoot, 'package.json');

	if (!existsSync(packageJsonPath)) {
		throw new CodegenError(`no package.json at ${packageJsonPath}`);
	}

	const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
	const codegenConfig = packageJson.codegenConfig;

	if (!codegenConfig || typeof codegenConfig.name !== 'string') {
		throw new CodegenError(`${packageJsonPath} declares no codegenConfig`);
	}

	const type = typeof codegenConfig.type === 'string' ? codegenConfig.type : 'all';

	if (!Object.hasOwn(GENERATORS_BY_TYPE, type)) {
		throw new CodegenError(
			`codegenConfig.type is "${type}", which this script has no generator names for. Expected all, components, or modules.`
		);
	}

	return {
		androidJavaPackage: codegenConfig.android?.javaPackageName,
		jsSrcsDir: join(projectRoot, codegenConfig.jsSrcsDir ?? 'src'),
		libraryName: codegenConfig.name,
		type,
	};
};

/**
 * Resolve `@react-native/codegen` from the project being generated, not from this file.
 *
 * In this repository that is the package's own devDependency; in a host app it is the app's
 * install, hoisted or not, which is why resolution hangs off `projectRoot` and not off here.
 *
 * @param {string} projectRoot
 */
const requireCodegen = function requireCodegen(projectRoot) {
	const requireFromProject = createRequire(join(projectRoot, 'index.js'));

	try {
		return {
			combineSchemasInFileList: requireFromProject(
				'@react-native/codegen/lib/cli/combine/combine-js-to-schema.js'
			).combineSchemasInFileList,
			generate: requireFromProject('@react-native/codegen/lib/generators/RNCodegen.js')
				.generate,
		};
	} catch (error) {
		throw new CodegenError(
			`cannot resolve @react-native/codegen from ${projectRoot}: ${
				error instanceof Error ? error.message : String(error)
			}. Install dependencies, or pass --project-root at the directory whose node_modules holds it.`
		);
	}
};

/** Every file under `directory`, POSIX-style and relative to it, for a stable listing. */
const listFiles = function listFiles(directory, prefix = '') {
	const files = [];

	for (const entry of readdirSync(directory, { withFileTypes: true }).sort(
		(left, right) => left.name.localeCompare(right.name)
	)) {
		if (!entry.isDirectory()) {
			files.push(prefix + entry.name);
			continue;
		}

		files.push(...listFiles(join(directory, entry.name), `${prefix}${entry.name}/`));
	}

	return files;
};

/**
 * Refuse to wipe anything that is not plainly a scratch directory.
 *
 * The output is removed before generation because Codegen adds to a directory rather than
 * replacing it, and a spec that was deleted from `src/specs` would otherwise survive as a
 * stale generated file. That makes the argument worth guarding.
 *
 * @param {string} outputDirectory
 * @param {string} projectRoot
 */
const assertDisposable = function assertDisposable(outputDirectory, projectRoot) {
	const parsed = parse(outputDirectory);

	if (parsed.root === outputDirectory) {
		throw new CodegenError(`refusing to treat ${outputDirectory} as a scratch directory`);
	}

	if (resolve(projectRoot) === outputDirectory) {
		throw new CodegenError(`refusing to wipe the project root ${outputDirectory}`);
	}
};

/**
 * Generate one platform's spec artifacts.
 *
 * @param {object} options
 * @param {string} options.outputDirectory Where to write, created and emptied first.
 * @param {string} [options.projectRoot] Directory owning `package.json` and `node_modules`.
 * @param {'android' | 'ios'} options.platform
 * @returns {{ files: string[], javaPackage: string, libraryName: string, outputDirectory: string }}
 */
export const generateSpec = function generateSpec({
	outputDirectory,
	platform,
	projectRoot = PACKAGE_ROOT,
}) {
	if (!PLATFORMS.has(platform)) {
		throw new CodegenError(
			`--platform must be android or ios (got "${platform ?? ''}")`
		);
	}

	const root = resolve(projectRoot);
	const output = isAbsolute(outputDirectory)
		? outputDirectory
		: resolve(root, outputDirectory);
	const codegenConfig = readCodegenConfig(root);
	const { combineSchemasInFileList, generate } = requireCodegen(root);

	assertDisposable(output, root);
	rmSync(output, { force: true, recursive: true });

	if (!existsSync(codegenConfig.jsSrcsDir)) {
		throw new CodegenError(
			`codegenConfig.jsSrcsDir points at ${codegenConfig.jsSrcsDir}, which does not exist`
		);
	}

	const schema = combineSchemasInFileList(
		[codegenConfig.jsSrcsDir],
		platform,
		undefined,
		codegenConfig.libraryName
	);

	if (Object.keys(schema.modules).length === 0) {
		throw new CodegenError(
			`Codegen read no modules from ${codegenConfig.jsSrcsDir}, so the spec file is either missing or empty`
		);
	}

	const ok = generate(
		{
			libraryName: codegenConfig.libraryName,
			outputDirectory: output,
			packageName: codegenConfig.androidJavaPackage ?? codegenConfig.libraryName,
			schema,
			useLocalIncludePaths: true,
		},
		{ generators: GENERATORS_BY_TYPE[codegenConfig.type][platform] }
	);

	if (!ok) {
		throw new CodegenError(
			`@react-native/codegen reported failure for ${codegenConfig.libraryName} (${platform})`
		);
	}

	const files = listFiles(output);

	if (files.length === 0) {
		throw new CodegenError(`Codegen wrote nothing to ${output}`);
	}

	return {
		files,
		javaPackage: codegenConfig.androidJavaPackage ?? '',
		libraryName: codegenConfig.libraryName,
		outputDirectory: output,
	};
};

/** `--key value` and `--key=value`, with the two spellings Gradle and humans both use. */
const parseArguments = function parseArguments(argv) {
	const options = {};

	for (let index = 0; index < argv.length; index += 1) {
		const argument = argv[index];

		if (!argument.startsWith('--')) {
			throw new CodegenError(`unexpected argument ${argument}`);
		}

		const equals = argument.indexOf('=');

		if (equals !== -1) {
			options[argument.slice(2, equals)] = argument.slice(equals + 1);
			continue;
		}

		const key = argument.slice(2);

		if (BOOLEAN_FLAGS.has(key)) {
			options[key] = true;
			continue;
		}

		const value = argv[index + 1];

		if (value === undefined || value.startsWith('--')) {
			throw new CodegenError(`--${key} needs a value`);
		}

		options[key] = value;
		index += 1;
	}

	return options;
};

const main = function main(argv) {
	const options = parseArguments(argv);

	if (options.help) {
		process.stdout.write(
			[
				'usage: node generate-spec.mjs --platform <android|ios> --output <dir> [--project-root <dir>]',
				'',
				'Runs @react-native/codegen against the codegenConfig in package.json with library',
				'semantics: the library name, the jsSrcsDir, and the javaPackageName all come from',
				'that block, which is what React Native does for a library inside an app build.',
				'',
			].join('\n')
		);
		return 0;
	}

	const result = generateSpec({
		outputDirectory: options.output ?? options.outputDirectory,
		platform: options.platform,
		projectRoot: options.projectRoot ?? PACKAGE_ROOT,
	});

	// Shortest paths inside the package, absolute anywhere else: a build log that reads
	// `../../../../tmp/...` names nothing.
	const displayed = [result.outputDirectory, ...result.files.map((file) => join(result.outputDirectory, file))]
		.map((target) => {
			const within = relative(PACKAGE_ROOT, target);

			return within.startsWith('..') ? target : within || '.';
		});

	process.stdout.write(`codegen: ${result.libraryName} -> ${displayed[0]}\n`);

	for (const file of displayed.slice(1)) {
		process.stdout.write(`  ${file}\n`);
	}

	return 0;
};

/**
 * Whether this file is the process entry point, compared by realpath.
 *
 * Node resolves symlinks when it works out `import.meta.url`, and a build is free to name the
 * script through a link: a host app's `node_modules/@c15t/react-native` is a symlink into a
 * workspace, and its Gradle build invokes the script by that linked path. Comparing the two
 * as written makes the entry check false there, so the CLI parses its arguments, runs nothing,
 * and exits 0 with an empty output directory that Gradle then happily calls up-to-date.
 *
 * @param {string[]} argv `process.argv.slice(2)`, unused except to keep the call site honest.
 * @returns {boolean} True when this module was run as a program.
 */
const invokedAsProgram = function invokedAsProgram(argv) {
	const entry = argv[0];

	if (entry === undefined) {
		return false;
	}

	const self = fileURLToPath(import.meta.url);

	try {
		return realpathSync(entry) === realpathSync(self);
	} catch {
		return false;
	}
};

const invokedDirectly = invokedAsProgram(process.argv.slice(1));

if (invokedDirectly) {
	try {
		process.exitCode = main(process.argv.slice(2));
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		process.stderr.write(`codegen: ${message}\n`);

		if (error instanceof CodegenError === false && error instanceof Error) {
			process.stderr.write(`${error.stack ?? ''}\n`);
		}

		process.exitCode = 1;
	}
}
