import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { getBlockedReason } from './check-publish-artifacts';
import {
	checkAutolinkConfig,
	checkExpoAndroidAutolinking,
	checkPackedAutolinking,
	checkPackedPackageSurface,
	checkPodspecPaths,
	checkReactNativeAutolinking,
	globToRegExp,
	hostReadPaths,
	podspecPathDeclarations,
	withPackedPackage,
} from './react-native-autolink';
import type { PackedPackage } from './react-native-autolink';

/** A config that says a host app can link the library on both platforms. */
const working = {
	'@c15t/react-native': {
		platforms: {
			android: {
				packageImportPath:
					'import com.c15t.reactnative.C15tReactNativePackage;',
				packageInstance: 'new C15tReactNativePackage()',
				sourceDir:
					'/app/node_modules/@c15t/react-native/android/c15t-react-native',
			},
			ios: {
				podspecPath:
					'/app/node_modules/@c15t/react-native/C15tReactNative.podspec',
			},
		},
	},
};

describe('checkAutolinkConfig', () => {
	it('accepts a library the CLI can link on both platforms', () => {
		expect(checkAutolinkConfig(working)).toStrictEqual([]);
	});

	// The regression this guard exists for. `react-native.config.js` pointed Android
	// autolinking at `android`, where the build file has no namespace, and the CLI's two
	// lookups came up empty: `react-native config` exited 1 and the host app died in
	// settings evaluation rather than at a compiler.
	it('rejects an Android source directory above the library module', () => {
		const sourceDir = '/app/node_modules/@c15t/react-native/android';
		const failures = checkAutolinkConfig({
			'@c15t/react-native': {
				platforms: {
					...working['@c15t/react-native'].platforms,
					android: {
						...working['@c15t/react-native'].platforms.android,
						sourceDir,
					},
				},
			},
		});

		expect(failures.join('\n')).toContain(sourceDir);
		expect(failures.join('\n')).toContain('no namespace');
	});

	// A library config written in the app shape validates, is ignored, and leaves the CLI
	// guessing, so the package silently disappears from the config entirely.
	it('reports a package the CLI never lists', () => {
		const failures = checkAutolinkConfig({});

		expect(failures).toHaveLength(1);
		expect(failures[0]).toContain('dependency.platforms');
	});

	it('reports Android autolinking switched off', () => {
		const failures = checkAutolinkConfig({
			'@c15t/react-native': {
				platforms: {
					...working['@c15t/react-native'].platforms,
					android: null,
				},
			},
		});

		expect(failures.join('\n')).toContain('no Android half');
	});

	// The import is written into the app's generated PackageList, so a wrong package or class
	// name is a host app that does not compile.
	it('reports a package class the CLI could not resolve', () => {
		const failures = checkAutolinkConfig({
			'@c15t/react-native': {
				platforms: {
					...working['@c15t/react-native'].platforms,
					android: {
						...working['@c15t/react-native'].platforms.android,
						packageImportPath: 'import com.c15t.wrong.C15tReactNativePackage;',
					},
				},
			},
		});

		expect(failures.join('\n')).toContain('packageImportPath');
	});

	// Codegen emits NativeC15tSpec into the package named by codegenConfig, and the autolinked
	// library has to be in that same package for the module to compile against the spec.
	it('reports a Java package that disagrees with Codegen', () => {
		const message = checkAutolinkConfig(
			working,
			'com.c15t.somewhere.else'
		).join('\n');

		expect(message).toContain('Codegen generates NativeC15tSpec into');
		expect(message).toContain('com.c15t.somewhere.else');
		expect(message).toContain('com.c15t.reactnative');
	});

	it('accepts the Codegen package the package manifest actually declares', () => {
		// The default argument reads package.json, so an empty answer here is the invariant
		// holding: codegenConfig and the shipped namespace have not drifted apart.
		expect(checkAutolinkConfig(working)).toStrictEqual([]);
	});

	// iOS resolution rides along because the same config file feeds `pod install`, and a pod
	// that stops being discovered is a broken iOS build with no Android involvement.
	it('reports a missing podspec', () => {
		const failures = checkAutolinkConfig({
			'@c15t/react-native': {
				platforms: { ...working['@c15t/react-native'].platforms, ios: null },
			},
		});

		expect(failures.join('\n')).toContain('no iOS half');
	});

	it('reports a podspec that is not the binding', () => {
		const failures = checkAutolinkConfig({
			'@c15t/react-native': {
				platforms: {
					...working['@c15t/react-native'].platforms,
					ios: { podspecPath: '/somewhere/Else.podspec' },
				},
			},
		});

		expect(failures.join('\n')).toContain('Else.podspec');
	});
});

describe('checkReactNativeAutolinking', () => {
	// The whole path, from the example app's own install of the CLI. This is the assertion CI
	// is paid for: `packages/react-native/android` builds the same library without ever asking
	// the CLI what it makes of it.
	it('resolves @c15t/react-native from the bare example app', () => {
		expect(checkReactNativeAutolinking()).toStrictEqual([]);
	}, 60_000);
});

describe('Expo autolinking', () => {
	// Expo answers one platform per invocation, so its `--platform android` output has no iOS
	// half by design. Without the option the check would report a false failure for every
	// healthy Expo app.
	const androidEntry = working['@c15t/react-native'].platforms.android;
	const androidOnly = {
		'@c15t/react-native': {
			platforms: { android: androidEntry },
		},
	};

	it('accepts an Android-only answer from the Expo linker', () => {
		expect(
			checkAutolinkConfig(androidOnly, undefined, {
				expectIos: false,
				linkerName: 'expo-modules-autolinking',
			})
		).toStrictEqual([]);
	});

	// The defect this exists for. `react-native.config.cjs` is invisible to
	// expo-modules-autolinking, which searches only `.js` and `.ts`, so Expo fell back to the
	// wrapper `android` directory, failed to parse a Java package, and dropped the library from
	// PackageList.java with no warning. CI's assembleDebug stayed green over the empty list.
	it('names the config extension when the Expo linker drops the package', () => {
		const failures = checkAutolinkConfig({}, undefined, {
			expectIos: false,
			linkerName: 'expo-modules-autolinking',
		});

		expect(failures).toHaveLength(1);
		expect(failures[0]).toContain('expo-modules-autolinking did not list');
		expect(failures[0]).toContain('react-native.config.js');
		expect(failures[0]).toContain('.cjs');
	});

	it('still checks Android properly when iOS is not expected', () => {
		const sourceDir = '/app/node_modules/@c15t/react-native/android';
		const failures = checkAutolinkConfig(
			{
				'@c15t/react-native': {
					platforms: {
						android: { ...androidEntry, sourceDir },
					},
				},
			},
			undefined,
			{ expectIos: false, linkerName: 'expo-modules-autolinking' }
		);

		expect(failures.join('\n')).toContain(sourceDir);
	});

	// Runs the real linker against the real fixture, which is the only way to catch a config
	// file Expo cannot read: the bare fixture exercises the community CLI and would stay green.
	it('resolves @c15t/react-native from the Expo example app', () => {
		expect(checkExpoAndroidAutolinking()).toStrictEqual([]);
	}, 60_000);
});

/**
 * The packed-tree half.
 *
 * Everything above asks what the CLI makes of the checkout, because that is what both fixtures
 * install. These ask what it makes of the tarball, which is the only thing a consumer has.
 */

/** A podspec in the shape this repository writes, narrow enough to state each rule alone. */
const FAKE_PODSPEC = `
Pod::Spec.new do |s|
  s.license = { :type => "Apache-2.0", :file => "LICENSE.md" }
  s.source_files = "ios/C15tReactNative/**/*.{h,swift,m,mm}"
  s.public_header_files = "ios/C15tReactNative/C15tReactNative.h"
  s.resource_bundle = { "C15tReactNative" => "ios/C15tReactNative/Resources/Privacy.xcprivacy" }
  s.preserve_paths = "ios", "package.json", "react-native.config.js"
end
`;

describe('globToRegExp', () => {
	// CocoaPods reads `source_files` with a glob, and this is the one pattern the binding
	// declares, so the check that says "the pod builds from nothing" hinges on matching it.
	it('matches a brace set across directories', () => {
		const matcher = globToRegExp('ios/C15tReactNative/**/*.{h,swift,m,mm}');

		expect(matcher.test('ios/C15tReactNative/Bridge/C15tPayload.swift')).toBe(
			true
		);
		expect(matcher.test('ios/C15tReactNative/C15tReactNative.h')).toBe(true);
		expect(matcher.test('ios/C15tReactNative/ReactNative/Module.mm')).toBe(
			true
		);
	});

	it('stays inside the directory the pattern names', () => {
		const matcher = globToRegExp('ios/C15tReactNative/**/*.{h,swift,m,mm}');

		expect(matcher.test('ios/Tests/X.swift')).toBe(false);
		expect(matcher.test('ios/C15tReactNative.swift')).toBe(false);
		expect(matcher.test('android/c15t-react-native/build.gradle.kts')).toBe(
			false
		);
	});

	// A dot in `build.gradle.kts` is literal, and an unescaped one would match any character.
	it('treats a dot as a dot', () => {
		expect(globToRegExp('*.kts').test('buildXkts')).toBe(false);
		expect(globToRegExp('*.kts').test('build.gradle.kts')).toBe(true);
	});
});

describe('podspecPathDeclarations', () => {
	it('reads every path the pod declares, and no names', () => {
		expect(
			podspecPathDeclarations(FAKE_PODSPEC).map(({ pattern }) => pattern)
		).toStrictEqual([
			'LICENSE.md',
			'ios/C15tReactNative/**/*.{h,swift,m,mm}',
			'ios/C15tReactNative/C15tReactNative.h',
			'ios/C15tReactNative/Resources/Privacy.xcprivacy',
			'ios',
			'package.json',
			'react-native.config.js',
		]);
	});
});

describe('checkPodspecPaths', () => {
	const packedPaths = [
		'LICENSE.md',
		'package.json',
		'react-native.config.js',
		'ios/C15tReactNative/C15tReactNative.h',
		'ios/C15tReactNative/Bridge/C15tPayload.swift',
		'ios/C15tReactNative/Resources/Privacy.xcprivacy',
	];

	it('accepts a podspec that resolves against the tarball', () => {
		expect(checkPodspecPaths(FAKE_PODSPEC, packedPaths)).toStrictEqual([]);
	});

	// `s.license` named the repository root, which is two directories above the pod: inside
	// this workspace it resolves through a symlink, and in an app it points at the consumer.
	it('refuses a path that leaves the package', () => {
		const failures = checkPodspecPaths(
			FAKE_PODSPEC.replace(
				':file => "LICENSE.md"',
				':file => "../../LICENSE.md"'
			),
			packedPaths
		);

		expect(failures.join('\n')).toContain('points outside the package');
	});

	it('reports a source pattern with nothing behind it', () => {
		const failures = checkPodspecPaths(
			FAKE_PODSPEC,
			packedPaths.filter(
				(path) => !path.startsWith('ios/C15tReactNative/Bridge')
			)
		);

		expect(failures.join('\n')).not.toContain('C15tReactNative.h');
	});

	it('reports a source pattern that matches no packed file', () => {
		const failures = checkPodspecPaths(FAKE_PODSPEC, ['package.json']);

		expect(failures.join('\n')).toContain('no packed file matches it');
		expect(failures.join('\n')).toContain('Privacy.xcprivacy');
	});
});

describe('checkPackedPackageSurface', () => {
	const workDir = mkdtempSync(join(tmpdir(), 'c15t-surface-'));

	afterAll(() => {
		rmSync(workDir, { force: true, recursive: true });
	});

	/** The installed package as a host app would find it, minus one file per test. */
	const fakeInstall = function fakeInstall(name: string): PackedPackage {
		const installedDir = join(workDir, name, 'package');

		const files: Record<string, string> = {
			'C15tReactNative.podspec': FAKE_PODSPEC,
			'package.json': JSON.stringify({
				codegenConfig: { jsSrcsDir: 'src/specs', name: 'C15tSpec' },
				name: '@c15t/react-native',
				version: '0.0.0',
			}),
		};

		for (const { path } of hostReadPaths) {
			files[path] ??= 'export {};\n';
		}

		files['ios/C15tReactNative/C15tReactNative.h'] = '#import <Foundation.h>\n';
		files['ios/C15tReactNative/Bridge/C15tPayload.swift'] = 'enum X {}\n';
		files['ios/C15tReactNative/Resources/Privacy.xcprivacy'] = '<plist/>\n';

		for (const [path, contents] of Object.entries(files)) {
			const target = join(installedDir, path);

			mkdirSync(dirname(target), { recursive: true });
			writeFileSync(target, contents);
		}

		return {
			installedDir,
			paths: Object.keys(files),
			tarball: join(workDir, name, 'package.tgz'),
		};
	};

	it('accepts a tarball that carries what the two native builds open', () => {
		expect(checkPackedPackageSurface(fakeInstall('whole'))).toStrictEqual([]);
	});

	// The bug this exists for, in one file: the app reads `codegenConfig.jsSrcsDir` out of
	// `react-native config` and generates the protocol there. An allowlist that keeps `dist`
	// and drops `src/specs` looks fine from a checkout and fails in every app.
	it('reports a Codegen input directory the tarball left out', () => {
		const packed = fakeInstall('no-specs');

		rmSync(join(packed.installedDir, 'src/specs/NativeC15t.ts'));

		const failures = checkPackedPackageSurface({
			...packed,
			paths: packed.paths.filter((path) => path !== 'src/specs/NativeC15t.ts'),
		});

		expect(failures.join('\n')).toContain('codegenConfig.jsSrcsDir');
		expect(failures.join('\n')).toContain('src/specs');
	});

	it('names the build that reads a file the tarball left out', () => {
		const packed = fakeInstall('no-gradle');

		rmSync(
			join(packed.installedDir, 'android/c15t-react-native/library.gradle')
		);

		const failures = checkPackedPackageSurface({
			...packed,
			paths: packed.paths.filter(
				(path) => path !== 'android/c15t-react-native/library.gradle'
			),
		});

		expect(failures.join('\n')).toContain('library.gradle');
		expect(failures.join('\n')).toContain('apply(from:)');
	});
});

describe('autolinking from the packed tarball', () => {
	// Two CLI resolutions over a real install, each of which loads the whole config for an
	// app with a few dozen modules.
	it('installs the tarball and resolves it in both fixtures', () => {
		withPackedPackage((packed) => {
			// The gate holds the tarball to the same shapes; the packed tree is the one a
			// consumer can actually publish, so it is the one worth checking here too.
			const leaks = packed.paths.filter(
				(path) => getBlockedReason('@c15t/react-native', path) !== null
			);

			expect(leaks).toStrictEqual([]);
			expect(checkPackedAutolinking(packed)).toStrictEqual([]);
		});
	}, 180_000);
});
