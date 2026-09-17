#!/usr/bin/env bun
/**
 * Resolve `@c15t/react-native`'s autolinking the way a host app does.
 *
 * Nothing else in this repository asks React Native's CLI what it makes of the package. The
 * standalone Gradle build in `packages/react-native/android` never goes through autolinking,
 * and the mobile CI job assembles the AAR directly, so a package whose native half the CLI
 * cannot resolve passes both while every real app fails. The failure is late and loud: a host
 * app's `settings.gradle` runs `react-native config` while it is being evaluated, so Android
 * builds die before compiling anything.
 *
 * Two shapes of mistake land here, and the CLI is what tells them apart:
 *
 *  * A library's `react-native.config.cjs` has to nest its entries under `dependency.platforms`.
 *    The shape an *app* writes (`dependencies`, keyed by package name) validates and is then
 *    ignored, which leaves the CLI guessing at the source directory.
 *  * The CLI finds a library's Java package by reading two files in the autolinked directory: a
 *    `package` attribute in `src/main/AndroidManifest.xml`, then a namespace in its
 *    `build.gradle[.kts]`. AGP dropped the manifest attribute, so the namespace has to be
 *    readable in that build file.
 *
 * It runs the unscoped command, not `config --platform android`, because that is what
 * `autolinkLibrariesFromCommand()` runs and because the iOS half has to keep resolving in the
 * same pass: a config file that stops the podspec from being found breaks `pod install` too.
 */

import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const EXAMPLE_DIR = join(ROOT, 'examples', 'react-native-bare');
const PACKAGE_NAME = '@c15t/react-native';

/** The library module, not the `android` directory above it. */
const ANDROID_MODULE_DIR = join('android', 'c15t-react-native');

/** The Java package the library's `ReactPackage` lives in, and therefore the one the CLI has
 * to find in the autolinked build file. */
const EXPECTED_PACKAGE = 'com.c15t.reactnative';

/** The import the app's generated `PackageList` writes for this library. */
const EXPECTED_IMPORT = `import ${EXPECTED_PACKAGE}.C15tReactNativePackage;`;

/** The Android half of one entry in `react-native config`'s output. */
interface AndroidDependencyConfig {
	packageImportPath: string | null;
	packageInstance: string | null;
	sourceDir: string;
}

/** The iOS half, as `cli-config-apple` reports it. */
interface AppleDependencyConfig {
	podspecPath: string;
}

/** One entry in `react-native config`'s `dependencies` map. */
interface DependencyConfig {
	platforms?: {
		android?: AndroidDependencyConfig | null;
		ios?: AppleDependencyConfig | null;
	};
}

/** The Java package Codegen writes `NativeC15tSpec` into. */
const codegenJavaPackage = function codegenJavaPackage(): string {
	const readRequire = createRequire(import.meta.url);
	const manifest = readRequire(
		join(ROOT, 'packages', 'react-native', 'package.json')
	) as {
		codegenConfig?: { android?: { javaPackageName?: string } };
	};

	return manifest.codegenConfig?.android?.javaPackageName ?? '';
};

/**
 * `react-native/cli.js`, the file `npx react-native` runs.
 *
 * Located through the package's main entry because `cli.js` is not in React Native's `exports`
 * map, so `require.resolve('react-native/cli.js')` throws for a reason that has nothing to do
 * with it being missing.
 */
const resolveCli = function resolveCli(exampleDir: string): string {
	const readRequire = createRequire(join(exampleDir, 'noop.js'));
	const entry = readRequire.resolve('react-native', { paths: [exampleDir] });

	return join(dirname(entry), 'cli.js');
};

/**
 * Check the autolinking a host app would get, from a parsed `react-native config`.
 *
 * @param dependencies - The `dependencies` map of the config, keyed by package name.
 * @param javaPackage - The package Codegen is configured to generate `NativeC15tSpec` into.
 * Read from the package manifest; a parameter so a drift can be tested without editing it.
 * @returns Every way the answer disagrees with what `@c15t/react-native` ships. Empty means an
 * app can link the library on both platforms.
 */
export const checkAutolinkConfig = function checkAutolinkConfig(
	dependencies: Record<string, DependencyConfig> | undefined,
	javaPackage: string = codegenJavaPackage()
): string[] {
	const dependency = dependencies?.[PACKAGE_NAME];

	if (!dependency) {
		return [
			`react-native config did not list ${PACKAGE_NAME}, so nothing autolinks it. A library's own config belongs under \`dependency.platforms\`, not the app-shaped \`dependencies\`.`,
		];
	}

	const failures: string[] = [];
	const android = dependency.platforms?.android;
	const ios = dependency.platforms?.ios;

	if (!android) {
		failures.push(
			'react-native config has no Android half for @c15t/react-native. `dependency.platforms.android: null` turns Android autolinking off.'
		);
	} else if (!android.sourceDir.endsWith(ANDROID_MODULE_DIR)) {
		failures.push(
			`the autolinked Android directory is "${android.sourceDir}", not the library module (expected a path ending in "${ANDROID_MODULE_DIR}"). Pointed one level up, the CLI matches a build file with no namespace and exits non-zero.`
		);
	}

	// The package the CLI read is written into the app's generated PackageList, so a drift here
	// is a host app that cannot compile.
	if (android && android.packageImportPath !== EXPECTED_IMPORT) {
		failures.push(
			`packageImportPath is ${JSON.stringify(android.packageImportPath)}, expected ${JSON.stringify(EXPECTED_IMPORT)}.`
		);
	}

	// One string is the AGP namespace, the Kotlin package the package class sits in, and the
	// package Codegen generates NativeC15tSpec into. If codegenConfig drifts, the app writes the
	// spec somewhere the library cannot see it and the module fails to compile against it.
	if (javaPackage !== EXPECTED_PACKAGE) {
		failures.push(
			`Codegen generates NativeC15tSpec into "${javaPackage}" but the autolinked library is in "${EXPECTED_PACKAGE}", which is a duplicate-class or a missing-class failure depending on the build.`
		);
	}

	if (android?.packageInstance !== 'new C15tReactNativePackage()') {
		failures.push(
			`packageInstance is ${JSON.stringify(android?.packageInstance ?? null)}, expected "new C15tReactNativePackage()".`
		);
	}

	if (!ios) {
		failures.push(
			'react-native config has no iOS half for @c15t/react-native, so `pod install` would not see it.'
		);
	} else if (!ios.podspecPath.endsWith('C15tReactNative.podspec')) {
		failures.push(
			`the iOS podspec resolved to "${ios.podspecPath}", not C15tReactNative.podspec.`
		);
	}

	return failures;
};

/**
 * Run the unscoped `react-native config` from an app that depends on the package.
 *
 * @param exampleDir - A React Native app root, run with that as the working directory.
 * @returns Every way the resolved autolinking disagrees with the package, including a command
 * that exits non-zero, which is itself the shape of the failure a host app sees.
 */
export const checkReactNativeAutolinking = function checkReactNativeAutolinking(
	exampleDir: string = EXAMPLE_DIR
): string[] {
	let stdout: string;

	try {
		stdout = execFileSync(
			process.execPath,
			[resolveCli(exampleDir), 'config'],
			{
				cwd: exampleDir,
				encoding: 'utf8',
				// The whole config for an app with a few dozen modules, so the 1 MiB default
				// is not enough and a truncated read would look like a parse failure.
				maxBuffer: 64 * 1024 * 1024,
				stdio: ['ignore', 'pipe', 'pipe'],
			}
		);
	} catch (error) {
		const failure = error as {
			stderr?: Buffer | string;
			status?: number | null;
		};
		const detail = String(failure.stderr ?? error).trim();

		return [
			`react-native config exited ${failure.status ?? 'non-zero'} in ${exampleDir}, so no host app can configure this package.`,
			detail,
		].filter(Boolean);
	}

	let config: { dependencies?: Record<string, DependencyConfig> };

	try {
		config = JSON.parse(stdout);
	} catch {
		return ['react-native config printed something that is not JSON.'];
	}

	return checkAutolinkConfig(config.dependencies);
};

const main = function main(): void {
	const failures = checkReactNativeAutolinking();

	if (failures.length > 0) {
		console.error(
			`${PACKAGE_NAME} does not autolink the way a host app needs:\n`
		);

		for (const failure of failures) {
			console.error(` - ${failure}`);
		}

		process.exit(1);
	}

	console.log(
		`${PACKAGE_NAME} resolves for Android and iOS from ${EXAMPLE_DIR}.`
	);
};

if (import.meta.main) {
	main();
}
