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
 *
 * The check then runs a second time against the *packed* package. Both fixtures install
 * `@c15t/react-native` as a symlink into this workspace, so the first pass resolves the
 * checkout, and a checkout carries `src/specs`, `ios/Tests`, a Gradle wrapper, and every other
 * file `package.json`'s `files` array leaves out of the tarball. An allowlist that drops
 * something an app reads -- the Codegen input directory, the podspec's license file -- is
 * invisible to it and fatal to `pod install` and `:c15t-react-native:generateC15tCodegen` in
 * the app. So `packReactNativePackage()` runs `npm pack`, installs the result over the
 * fixture's symlink, and asks the same two linkers the same questions.
 */

import { execFileSync } from 'node:child_process';
import {
	cpSync,
	existsSync,
	lstatSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	renameSync,
	rmSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const EXAMPLE_DIR = join(ROOT, 'examples', 'react-native-bare');

/** The package under check, packed and installed rather than read in place. */
const PACKAGE_DIR = join(ROOT, 'packages', 'react-native');

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

/**
 * A file the installed package has to carry, and the build that reads it.
 *
 * These are the paths a host app opens, not the paths this repository writes. Every entry is
 * a line in one of the two native builds, so a missing one is a named failure there rather
 * than a mystery: `files` in `package.json` is an allowlist, and npm drops `.gitignore` the
 * moment it sees one, so what is published is exactly this list and nothing else.
 * `scripts/check-publish-artifacts.ts` turns the same list into `requiredPackedFilesByPackage`
 * so the release gate and the linker check cannot drift apart.
 */
export interface HostReadPath {
	/** Where the file sits inside the installed package. */
	path: string;
	/** Who reads it, in the words of the build that reads it. */
	readBy: string;
}

/** The podspec, which is both the iOS half of autolinking and the thing that names the rest. */
const PODSPEC_NAME = 'C15tReactNative.podspec';

/**
 * Shared with `scripts/check-publish-artifacts.ts` so the release gate and this check hold the
 * tarball to one list.
 */
export const hostReadPaths: HostReadPath[] = [
	{
		path: PODSPEC_NAME,
		readBy: '`use_native_modules!` finds the podspec at the package root',
	},
	{
		path: 'LICENSE.md',
		readBy:
			"the podspec's `s.license` file, which Apache-2.0 requires to travel with it",
	},
	{
		path: 'react-native.config.js',
		readBy:
			'both linkers read `dependency.platforms`; Expo reads only `.js` and `.ts`, so a `.cjs` is invisible to it',
	},
	{
		path: 'src/specs/NativeC15t.ts',
		readBy:
			'`codegenConfig.jsSrcsDir`, which the app reads to generate `NativeC15tSpec` for both platforms',
	},
	{
		path: 'android/codegen/generate-spec.mjs',
		readBy:
			'`library.gradle`, which generates the spec into the bridge module, because an app never generates the spec of a library it links',
	},
	{
		path: 'android/c15t-react-native/build.gradle.kts',
		readBy:
			'the CLI text-matches this file for the namespace, and it is the module build script the app evaluates',
	},
	{
		path: 'android/c15t-react-native/library.gradle',
		readBy: "the module build script's `apply(from:)`",
	},
	{
		path: 'android/c15t-react-native/consumer-rules.pro',
		readBy: '`consumerProguardFiles` in `library.gradle`',
	},
	{
		path: 'android/c15t-react-native/src/main/AndroidManifest.xml',
		readBy:
			'the first Java-package lookup the CLI makes, and the androidx.startup entry that bootstraps the core',
	},
];

/** One packed package, on disk where an app would see it. */
export interface PackedPackage {
	/** The extracted tarball root, which is what a consumer's `node_modules` entry holds. */
	installedDir: string;
	/** Every packed path, POSIX-style and relative to `installedDir`. */
	paths: string[];
	/** The `.tgz` itself, kept so a failure can name it. */
	tarball: string;
}

/**
 * Translate one CocoaPods-style path pattern into a regular expression.
 *
 * CocoaPods matches `source_files` and friends with `Dir.glob`, and the podspec here uses the
 * three forms that matter: `*` inside a segment, `**` across segments, and `{h,swift}` brace
 * sets. Brace sets are expanded rather than compiled, which keeps the translation honest about
 * what it matches.
 *
 * @param glob - The pattern exactly as the podspec spells it.
 * @returns A pattern anchored at both ends, for testing against a packed path.
 */
export const globToRegExp = function globToRegExp(glob: string): RegExp {
	const alternatives: string[] = [];

	const literalToPattern = function literalToPattern(pattern: string): string {
		let out = '';

		for (let index = 0; index < pattern.length; index += 1) {
			const character = pattern[index] as string;

			if (pattern.startsWith('/**/', index)) {
				out += '(?:/|.*/)';
				index += 3;
				continue;
			}

			if (character === '*' && pattern[index + 1] === '*') {
				out += '.*';
				index += 1;
				continue;
			}

			if (character === '*') {
				out += '[^/]*';
				continue;
			}

			if (character === '?') {
				out += '[^/]';
				continue;
			}

			out += /[.+^${}()|[\]\\]/u.test(character) ? `\\${character}` : character;
		}

		return out;
	};

	const translate = function translate(pattern: string): void {
		const brace = pattern.indexOf('{');

		if (brace === -1) {
			alternatives.push(literalToPattern(pattern));
			return;
		}

		const close = pattern.indexOf('}', brace);

		if (close === -1) {
			alternatives.push(literalToPattern(pattern));
			return;
		}

		const before = pattern.slice(0, brace);
		const inside = pattern.slice(brace + 1, close);
		const after = pattern.slice(close + 1);

		for (const option of inside.split(',')) {
			translate(`${before}${option}${after}`);
		}
	};

	translate(glob);

	return new RegExp(`^(?:${alternatives.join('|')})$`, 'u');
};

/** The podspec's path-shaped declarations, in the order an integrator reads them. */
interface PodspecPathDeclaration {
	/** The `s.` attribute, for the failure text. */
	field: string;
	/** The pattern or literal, straight out of the file. */
	pattern: string;
}

/** `s.source_files = "a", "b"` and friends, where one attribute may name several patterns. */
const LIST_FIELDS = new Set([
	'exclude_files',
	'preserve_paths',
	'public_header_files',
	'source_files',
]);

/**
 * Read every path a podspec declares.
 *
 * Deliberately textual: the only podspecs this repository has to understand are its own, and
 * evaluating Ruby is not an option on a Linux runner. A field the reader does not understand is
 * not a failure here; the two that decide what an app compiles are enough to catch a `files`
 * list that stopped matching the shipped surface.
 *
 * @param podspecSource - The podspec, as text.
 * @returns Every declared path pattern.
 */
export const podspecPathDeclarations = function podspecPathDeclarations(
	podspecSource: string
): PodspecPathDeclaration[] {
	const declarations: PodspecPathDeclaration[] = [];

	for (const line of podspecSource.split('\n')) {
		const attribute = /^\s*s\.(?<field>[a-z_]+)\s*(?<value>.*)$/u.exec(line);
		const field = attribute?.groups?.field;

		if (field && attribute?.groups.value && LIST_FIELDS.has(field)) {
			for (const match of attribute.groups.value.matchAll(
				/"(?<value>[^"]*)"/gu
			)) {
				if (match.groups?.value) {
					declarations.push({
						field: `s.${field}`,
						pattern: match.groups.value,
					});
				}
			}
			continue;
		}

		// `s.resource_bundle = { "Name" => "path" }` carries the name on the left, which is
		// not a path, so only the right-hand side of the arrow is read.
		if (/^\s*s\.resource_bundle\s*[=]/u.test(line)) {
			for (const match of line.matchAll(/[=]>\s*"(?<value>[^"]*)"/gu)) {
				if (match.groups?.value) {
					declarations.push({
						field: 's.resource_bundle',
						pattern: match.groups.value,
					});
				}
			}
			continue;
		}

		const license =
			/^\s*s\.license\s*[=].*:file\s*=>\s*"(?<value>[^"]*)"/u.exec(line);

		if (license?.groups?.value) {
			declarations.push({ field: 's.license', pattern: license.groups.value });
		}
	}

	return declarations;
};

/**
 * Check the podspec against the files actually in the tarball.
 *
 * @param podspecSource - The packed podspec, as text.
 * @param packedPaths - Every path in the same tarball.
 * @returns Every declaration that matches nothing, or points outside the package. A podspec
 * whose patterns resolve is one `pod install` can build from what it was shipped with.
 */
export const checkPodspecPaths = function checkPodspecPaths(
	podspecSource: string,
	packedPaths: string[]
): string[] {
	const failures: string[] = [];

	for (const { field, pattern } of podspecPathDeclarations(podspecSource)) {
		const normalized = pattern.replaceAll('\\', '/');

		// A podspec is read from wherever the pod lives, which for an installed library is
		// `node_modules/@c15t/react-native`. Two directories up is the consumer's tree.
		if (normalized === '..' || normalized.startsWith('../')) {
			failures.push(
				`${field} points outside the package at "${pattern}", which resolves into the host app's tree, not ours.`
			);
			continue;
		}

		if (/[?*]/u.test(pattern)) {
			const matcher = globToRegExp(normalized);
			if (!packedPaths.some((path) => matcher.test(path))) {
				failures.push(
					`${field} declares "${pattern}" and no packed file matches it, so the pod builds from nothing there.`
				);
			}
			continue;
		}

		// A bare name may be a directory, and a tarball listing carries files only.
		if (
			!packedPaths.includes(normalized) &&
			!packedPaths.some((path) => path.startsWith(`${normalized}/`))
		) {
			failures.push(
				`${field} names "${pattern}", which is not in the packed package.`
			);
		}
	}

	return failures;
};

/** Spec extensions React Native's Codegen reads, and the ones it skips. */
const SPEC_FILE_PATTERN = /\.(?:js|jsx|ts|tsx)$/u;

/**
 * Check that the packed package is the package a host app reads.
 *
 * This is the half a workspace install cannot show: the fixtures reach the checkout through a
 * symlink, so every file in the repository looks published from here.
 *
 * @param packed - The packed package to inspect.
 * @returns Every way the tarball falls short of what the two native builds open.
 */
export const checkPackedPackageSurface = function checkPackedPackageSurface(
	packed: PackedPackage
): string[] {
	const failures: string[] = [];
	const packedPaths = new Set(packed.paths);

	for (const { path, readBy } of hostReadPaths) {
		if (!packedPaths.has(path)) {
			failures.push(`the tarball has no ${path}, and ${readBy}.`);
		}
	}

	const manifest = JSON.parse(
		readFileSync(join(packed.installedDir, 'package.json'), 'utf8')
	) as { codegenConfig?: { jsSrcsDir?: string } };
	const jsSrcsDir = manifest.codegenConfig?.jsSrcsDir?.replace(/^\.\//u, '');

	if (jsSrcsDir) {
		const specs = packed.paths.filter(
			(path) =>
				path.startsWith(`${jsSrcsDir}/`) &&
				SPEC_FILE_PATTERN.test(path) &&
				!path.endsWith('.d.ts')
		);

		if (specs.length === 0) {
			failures.push(
				`\`codegenConfig.jsSrcsDir\` points at ${jsSrcsDir}, which holds no spec file in the tarball. Both generators fail on that: \`generate-spec.mjs\` refuses a directory that is not there, and the app's own Codegen pass reads the same path out of \`react-native config\` and writes no protocol, which the TurboModule then fails to conform to.`
			);
		}
	} else {
		failures.push(
			'the packed package declares no `codegenConfig.jsSrcsDir`, so no app can generate NativeC15tSpec.'
		);
	}

	const podspecPath = join(packed.installedDir, PODSPEC_NAME);

	if (packedPaths.has(PODSPEC_NAME) && existsSync(podspecPath)) {
		failures.push(
			...checkPodspecPaths(readFileSync(podspecPath, 'utf8'), packed.paths)
		);
	}

	return failures;
};

/**
 * Run `npm pack` and unpack the result, so the check sees a tarball rather than a checkout.
 *
 * `--ignore-scripts` skips the package's `prepack`, which is `verify-package-artifacts.ts` and
 * asks for `dist/`. That guard belongs to publishing, and the release flow keeps it; this check
 * asks a different question -- does the tree that ships contain what a host app opens -- and it
 * has to be answerable in a fresh checkout, because `bun run test:scripts` runs before anything
 * is built. A missing `dist/` shows up as a missing JS entry, not as a failure here.
 *
 * @param workDir - A directory to pack into; the caller owns it.
 * @returns The tarball, its extracted contents, and the listing inside it.
 */
export const packReactNativePackage = function packReactNativePackage(
	workDir: string
): PackedPackage {
	execFileSync(
		'npm',
		['pack', '--ignore-scripts', '--pack-destination', workDir],
		{
			cwd: PACKAGE_DIR,
			// The file list npm prints on stdout, and the notice banner, neither of which is
			// the answer: the answer is the tarball it wrote into `workDir`.
			stdio: ['ignore', 'ignore', 'pipe'],
		}
	);

	const tarball = readdirSync(workDir).find((entry) => entry.endsWith('.tgz'));

	if (!tarball) {
		throw new Error(
			`npm pack wrote no tarball into ${workDir} for ${PACKAGE_NAME}.`
		);
	}

	const tarballPath = join(workDir, tarball);
	const extractDir = join(workDir, 'extracted');

	mkdirSync(extractDir, { recursive: true });
	execFileSync('tar', ['-xzf', tarballPath, '-C', extractDir], {
		stdio: ['ignore', 'ignore', 'pipe'],
	});

	const paths = execFileSync('tar', ['-tzf', tarballPath], {
		encoding: 'utf8',
	})
		.split('\n')
		.filter(Boolean)
		.map((entry) => entry.replace(/^package\/?/u, ''))
		.filter((entry) => entry.length > 0 && !entry.endsWith('/'));

	return {
		installedDir: join(extractDir, 'package'),
		paths,
		tarball: tarballPath,
	};
};

/**
 * Put the packed tree where a host app would find it, and hand back the undo.
 *
 * The fixtures install the package as a workspace symlink, which is the whole reason the packed
 * check has to move it aside: a symlink resolves to the checkout, and the checkout has the
 * files the tarball leaves out. The previous entry is renamed rather than deleted so the
 * restore is a rename back, symlink and all.
 *
 * @param packedDir - The extracted tarball root.
 * @param exampleDir - The fixture app to install into.
 * @returns A function that puts the fixture back the way it was.
 */
const installIntoExample = function installIntoExample(
	packedDir: string,
	exampleDir: string
): () => void {
	const target = join(exampleDir, 'node_modules', ...PACKAGE_NAME.split('/'));

	if (!existsSync(dirname(target))) {
		throw new Error(
			`${dirname(target)} does not exist, so ${PACKAGE_NAME} is not installed in ${exampleDir}. Run \`bun install\`.`
		);
	}

	let previous: string | null = null;

	try {
		lstatSync(target);
		previous = `${target}.${process.pid}.workspace`;
		renameSync(target, previous);
	} catch {
		// Nothing installed there at all, which the restore turns into "leave it empty".
	}

	cpSync(packedDir, target, { recursive: true });

	return () => {
		rmSync(target, { force: true, recursive: true });

		if (previous) {
			renameSync(previous, target);
		}
	};
};

/**
 * Ask both linkers what they make of the packed package.
 *
 * The swap is real and it is undone in the same call, which is also the whole reason the two
 * fixtures cannot be checked in parallel: only one install of `@c15t/react-native` exists in
 * each of them at a time.
 *
 * @param packed - The packed package to install.
 * @param exampleDirs - The fixtures to install into, in the order the linkers are asked.
 * @returns Every way the packed tree fails to autolink.
 */
export const checkPackedAutolinking = function checkPackedAutolinking(
	packed: PackedPackage,
	exampleDirs: { bare: string; expo: string } = {
		bare: EXAMPLE_DIR,
		expo: EXPO_EXAMPLE_DIR,
	}
): string[] {
	const failures = checkPackedPackageSurface(packed);
	const restores: (() => void)[] = [];

	try {
		for (const exampleDir of [exampleDirs.bare, exampleDirs.expo]) {
			try {
				restores.push(installIntoExample(packed.installedDir, exampleDir));
			} catch (error) {
				failures.push(
					`cannot install the packed ${PACKAGE_NAME} into ${exampleDir}: ${
						error instanceof Error ? error.message : String(error)
					}`
				);
				return failures;
			}
		}

		failures.push(...checkReactNativeAutolinking(exampleDirs.bare));
		failures.push(...checkExpoAndroidAutolinking(exampleDirs.expo));

		return failures;
	} finally {
		for (const restore of restores.toReversed()) {
			restore();
		}
	}
};

/**
 * Pack, install, and check, in a temporary directory the caller does not have to manage.
 *
 * @param body - Runs with the packed tree, and returns whatever the caller wants back.
 * @returns Whatever `body` returned.
 */
export const withPackedPackage = function withPackedPackage<T>(
	body: (packed: PackedPackage) => T
): T {
	const workDir = mkdtempSync(join(tmpdir(), 'c15t-autolink-'));

	try {
		return body(packReactNativePackage(workDir));
	} finally {
		rmSync(workDir, { force: true, recursive: true });
	}
};

const main = function main(): void {
	const workspaceFailures = [
		...checkReactNativeAutolinking(),
		...checkExpoAndroidAutolinking(),
	];

	const failures = withPackedPackage((packed) => {
		console.log(
			`packed ${PACKAGE_NAME}: ${packed.paths.length} entries in ${packed.tarball}`
		);

		return [...workspaceFailures, ...checkPackedAutolinking(packed)];
	});

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
		`${PACKAGE_NAME} resolves for Android and iOS from ${EXAMPLE_DIR}, for Android from ${EXPO_EXAMPLE_DIR}, and from its own tarball in both.`
	);
};

if (import.meta.main) {
	main();
}
