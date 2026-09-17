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
 *  * A library's `react-native.config.js` has to nest its entries under `dependency.platforms`.
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
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const EXAMPLE_DIR = join(ROOT, 'examples', 'react-native-bare');

/**
 * The Expo fixture. It links through `expo-modules-autolinking`, which is a second
 * implementation of the same question and reads the library config differently.
 */
const EXPO_EXAMPLE_DIR = join(ROOT, 'examples', 'expo-dev');

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
 * Check the Android half of one linker's answer against what the library ships.
 *
 * @param android - The linker's Android entry, or nothing when autolinking is switched off.
 * @param linker - Names the linker in the failure text.
 * @returns Every disagreement. Empty means the host app's generated `PackageList` would name
 * the real library.
 */
const checkAndroidEntry = function checkAndroidEntry(
	android: AndroidDependencyConfig | null | undefined,
	linker: string
): string[] {
	if (!android) {
		return [
			`${linker} has no Android half for ${PACKAGE_NAME}. \`dependency.platforms.android: null\` turns Android autolinking off.`,
		];
	}

	const failures: string[] = [];

	if (!android.sourceDir.endsWith(ANDROID_MODULE_DIR)) {
		failures.push(
			`the autolinked Android directory is "${android.sourceDir}", not the library module (expected a path ending in "${ANDROID_MODULE_DIR}"). Pointed one level up, the CLI matches a build file with no namespace and exits non-zero.`
		);
	}

	// The import is written verbatim into the app's generated PackageList, so a drift here is a
	// host app that does not compile.
	if (android.packageImportPath !== EXPECTED_IMPORT) {
		failures.push(
			`packageImportPath is ${JSON.stringify(android.packageImportPath)}, expected ${JSON.stringify(EXPECTED_IMPORT)}.`
		);
	}

	if (android.packageInstance !== 'new C15tReactNativePackage()') {
		failures.push(
			`packageInstance is ${JSON.stringify(android.packageInstance)}, expected "new C15tReactNativePackage()".`
		);
	}

	return failures;
};

/** How one linker's answer should be read. */
interface AutolinkCheckOptions {
	/**
	 * Whether the parsed config is expected to carry an iOS half. Expo asks each linker
	 * per platform, so its `--platform android` answer legitimately has none.
	 */
	expectIos?: boolean;
	/** Names the linker in the failure text, so a report says which one disagreed. */
	linkerName?: string;
}

/**
 * Check the autolinking a host app would get, from a parsed linker answer.
 *
 * @param dependencies - The `dependencies` map of the config, keyed by package name.
 * @param javaPackage - The package Codegen is configured to generate `NativeC15tSpec` into.
 * Read from the package manifest; a parameter so a drift can be tested without editing it.
 * @param options - Which linker produced the config, and whether it should carry iOS.
 * @returns Every way the answer disagrees with what `@c15t/react-native` ships. Empty means an
 * app can link the library.
 */
export const checkAutolinkConfig = function checkAutolinkConfig(
	dependencies: Record<string, DependencyConfig> | undefined,
	javaPackage: string = codegenJavaPackage(),
	options: AutolinkCheckOptions = {}
): string[] {
	const linker = options.linkerName ?? 'react-native config';
	const expectIos = options.expectIos ?? true;
	const dependency = dependencies?.[PACKAGE_NAME];

	if (!dependency) {
		return [
			`${linker} did not list ${PACKAGE_NAME}, so nothing autolinks it. The likeliest cause is the config file itself: Expo reads only \`react-native.config.js\` and \`.ts\`, so a \`.cjs\` is found by the community CLI and invisible here. A library's own entries also belong under \`dependency.platforms\`, not the app-shaped \`dependencies\`.`,
		];
	}

	const failures = checkAndroidEntry(dependency.platforms?.android, linker);

	// One string is the AGP namespace, the Kotlin package the package class sits in, and the
	// package Codegen generates NativeC15tSpec into. If codegenConfig drifts, the app writes the
	// spec somewhere the library cannot see it and the module fails to compile against it.
	if (javaPackage !== EXPECTED_PACKAGE) {
		failures.push(
			`Codegen generates NativeC15tSpec into "${javaPackage}" but the autolinked library is in "${EXPECTED_PACKAGE}", which is a duplicate-class or a missing-class failure depending on the build.`
		);
	}

	const ios = dependency.platforms?.ios;

	if (!expectIos) {
		// Expo resolves one platform per invocation; the iOS half is its own command, and the
		// bare fixture covers CocoaPods through the community CLI.
	} else if (!ios) {
		failures.push(
			`${linker} has no iOS half for ${PACKAGE_NAME}, so \`pod install\` would not see it.`
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

/**
 * The `expo-modules-autolinking` CLI entry, resolved from an Expo app root.
 *
 * `expo` re-exports the command as its own `expo-modules-autolinking` bin, and the real
 * package sits inside Expo's dependency tree rather than at a name the app can resolve, so
 * `expo/bin/autolinking` is tried first: that shim is what `expo prebuild` and
 * `npx expo-modules-autolinking` both end up executing.
 */
const resolveExpoAutolinking = function resolveExpoAutolinking(
	expoExampleDir: string
): string {
	const readRequire = createRequire(join(expoExampleDir, 'noop.js'));
	const paths = [expoExampleDir];

	try {
		const expoManifest = readRequire.resolve('expo/package.json', {
			paths,
		});
		const shim = join(dirname(expoManifest), 'bin', 'autolinking');

		if (existsSync(shim)) {
			return shim;
		}
	} catch {
		// Fall through to the direct resolution, which is the older layout.
	}

	const manifest = readRequire.resolve(
		'expo-modules-autolinking/package.json',
		{ paths }
	);

	return join(dirname(manifest), 'bin', 'expo-modules-autolinking.js');
};

/**
 * Check the Android autolinking an Expo app would get.
 *
 * This is the half that was invisible, and it is invisible by construction: `expo prebuild`
 * wires `settings.gradle` to `expoAutolinking.rnConfigCommand`, so an Expo app never asks
 * `@react-native-community/cli` anything, and CI's `assembleDebug` is green whether or not
 * the generated `PackageList.java` names the library.
 *
 * @param expoExampleDir - An Expo app root that depends on the package.
 * @returns Every way Expo's answer disagrees with the package, including a command that fails
 * or prints something unparseable.
 */
export const checkExpoAndroidAutolinking = function checkExpoAndroidAutolinking(
	expoExampleDir: string = EXPO_EXAMPLE_DIR
): string[] {
	let bin: string;

	try {
		bin = resolveExpoAutolinking(expoExampleDir);
	} catch {
		return [
			`expo-modules-autolinking is not resolvable from ${expoExampleDir}, so the Expo half of ${PACKAGE_NAME}'s autolinking is unverified. Installing the workspace is the fix; skipping this check is not, because an unchecked Expo linker is how the Kotlin library went unlinked in the first place.`,
		];
	}

	let stdout: string;

	try {
		stdout = execFileSync(
			process.execPath,
			// `--json` is the machine-readable form, which is what Expo's Gradle plugin
			// consumes through `expoAutolinking.rnConfigCommand`. Without it the command
			// prints a colorized Node inspection rather than data.
			[bin, 'react-native-config', '--platform', 'android', '--json'],
			{
				cwd: expoExampleDir,
				encoding: 'utf8',
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
			`expo-modules-autolinking exited ${failure.status ?? 'non-zero'} in ${expoExampleDir}.`,
			detail,
		].filter(Boolean);
	}

	let config: { dependencies?: Record<string, DependencyConfig> };

	try {
		config = JSON.parse(stdout);
	} catch {
		return [
			'expo-modules-autolinking react-native-config printed something that is not JSON.',
		];
	}

	return checkAutolinkConfig(config.dependencies, codegenJavaPackage(), {
		expectIos: false,
		linkerName: 'expo-modules-autolinking',
	});
};

const main = function main(): void {
	const failures = [
		...checkReactNativeAutolinking(),
		...checkExpoAndroidAutolinking(),
	];

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
		`${PACKAGE_NAME} resolves for Android and iOS from ${EXAMPLE_DIR}, and for Android from ${EXPO_EXAMPLE_DIR}.`
	);
};

if (import.meta.main) {
	main();
}
