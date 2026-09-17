import {
	appendFileSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import {
	allowedCommonJsArtifacts,
	getBlockedReason,
	runPack,
	scanPackedVendoredSources,
	scanPublishedLicenses,
	scanVendoredNativeSources,
} from './check-publish-artifacts';
import { hostReadPaths } from './react-native-autolink';
import { vendoredCorePlan } from './sync-vendored-core';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');

/** A directory inside the temporary root, created on demand. */
const makeTree = function makeTree(
	root: string,
	files: Record<string, string>
) {
	for (const [path, contents] of Object.entries(files)) {
		const target = join(root, path);

		mkdirSync(dirname(target), { recursive: true });
		writeFileSync(target, contents);
	}
};

describe('getBlockedReason', () => {
	it('rejects CommonJS artifacts outside dist', () => {
		// The ESM-only guard must cover the whole tarball: a stale shim or a
		// root-level .cjs entry is just as much a CommonJS leak as dist output.
		expect(getBlockedReason('c15t', 'shims/index.cjs')).toBe(
			'CommonJS artifact in ESM-only package'
		);
		expect(getBlockedReason('@c15t/core', 'index.cjs')).toBe(
			'CommonJS artifact in ESM-only package'
		);
	});

	it('rejects CommonJS artifacts under dist', () => {
		expect(getBlockedReason('@c15t/core', 'dist/index.cjs')).toBe(
			'CommonJS artifact in ESM-only package'
		);
	});

	it('allows ESM runtime output and shims', () => {
		expect(getBlockedReason('@c15t/core', 'dist/index.js')).toBeNull();
		expect(getBlockedReason('c15t', 'shims/index.js')).toBeNull();
		expect(getBlockedReason('c15t', 'shims/index.d.ts')).toBeNull();
	});

	it('still rejects test artifacts in dist', () => {
		expect(getBlockedReason('@c15t/core', 'dist/foo.test.js')).toBe(
			'test file'
		);
	});

	// Expo resolves a config plugin through `require`, so this one file is CommonJS on
	// purpose. The exception is only as wide as the exports condition that needs it, which
	// the test below enforces.
	it('allows the CommonJS entry that a require condition hands out', () => {
		expect(
			getBlockedReason('@c15t/react-native', 'dist/expo-plugin/index.cjs')
		).toBeNull();
		expect(getBlockedReason('@c15t/ui', 'dist/expo-plugin/index.cjs')).toBe(
			'CommonJS artifact in ESM-only package'
		);
	});
});

describe('native leak shapes', () => {
	// npm throws `.gitignore` away as soon as `files` exists, so an allowlisted directory is
	// published with whatever the toolchain next to it left behind. Each of these is a
	// directory some other build writes.
	it.each([
		'ios/Tests/C15tReactNativeTests/C15tPayloadTests.swift',
		'ios/Pods/Manifest.lock',
		'ios/build/Release-iphoneos/lib.a',
		'android/.gradle/9.0/checksums/checksums.lock',
		'android/build/reports/lint-results.xml',
		'android/c15t-react-native/build/outputs/aar/a.aar',
		'android/c15t-react-native/src/test/kotlin/XTest.kt',
		'android/c15t-react-native/src/androidTest/kotlin/XTest.kt',
		'src/specs/__tests__/android-spec-surface.test.ts',
	])('rejects %s wherever it sits in the tarball', (path) => {
		expect(getBlockedReason('@c15t/react-native', path)).not.toBeNull();
	});

	// The narrow allowlist names files whose spelling sits next to these shapes on purpose:
	// `build.gradle.kts` has to survive a rule about build directories, or the package that
	// holds it cannot be published at all.
	it.each([
		'android/c15t-react-native/build.gradle.kts',
		'android/c15t-react-native/library.gradle',
		'android/c15t-react-native/consumer-rules.pro',
		'android/c15t-react-native/src/main/AndroidManifest.xml',
		'android/codegen/generate-spec.mjs',
		'ios/C15tReactNative/Bridge/C15tPayload.swift',
		'ios/C15tReactNative/Resources/Privacy.xcprivacy',
		'C15tReactNative.podspec',
		'src/specs/NativeC15t.ts',
		'dist/index.js',
		'dist-types/index.d.ts',
	])('allows %s', (path) => {
		expect(getBlockedReason('@c15t/react-native', path)).toBeNull();
	});
});

describe('the files allowlist against a build tree', () => {
	const workDir = mkdtempSync(join(tmpdir(), 'c15t-files-allowlist-'));

	afterAll(() => {
		rmSync(workDir, { force: true, recursive: true });
	});

	/**
	 * A package with the real allowlist and a dirty tree: a `pod install`, a Gradle build, and
	 * the two test source sets all ran here. It reproduces the sweep in one directory instead
	 * of depending on someone having a build in flight.
	 */
	const buildFixture = function buildFixture(name: string, files: string[]) {
		const packageDir = join(workDir, name);

		makeTree(packageDir, {
			'.gitignore': [
				'ios/Pods/',
				'ios/build/',
				'android/.gradle/',
				'android/*/build/',
				'coverage/',
			].join('\n'),
			'C15tReactNative.podspec': 'Pod::Spec.new do |s|\nend\n',
			'LICENSE.md': 'Apache-2.0',
			'android/.gradle/9.0/checksums.lock': 'binary\n',
			'android/c15t-react-native/build.gradle.kts': 'plugins {\n}\n',
			'android/c15t-react-native/build/outputs/aar/a.aar': 'binary\n',
			'android/c15t-react-native/consumer-rules.pro': '-keep\n',
			'android/c15t-react-native/library.gradle': 'android {\n}\n',
			'android/c15t-react-native/src/main/AndroidManifest.xml': '<manifest/>\n',
			'android/c15t-react-native/src/main/kotlin/X.kt': 'class X\n',
			'android/c15t-react-native/src/test/kotlin/XTest.kt': 'class XTest\n',
			'android/codegen/generate-spec.mjs': 'export {};\n',
			'dist-types/index.d.ts': 'export declare const x: number;\n',
			'dist/index.js': 'export const x = 1;\n',
			'ios/C15tReactNative/Bridge/C15tPayload.swift': 'enum C15tPayload {}\n',
			'ios/C15tReactNative/C15tReactNative.h':
				'#import <Foundation/Foundation.h>\n',
			'ios/C15tReactNative/Resources/Privacy.xcprivacy': '<plist/>\n',
			'ios/Pods/Manifest.lock': 'PODS: {}\n',
			'ios/Tests/C15tReactNativeTests/C15tPayloadTests.swift':
				'import XCTest\n',
			'ios/build/Release-iphoneos/lib.a': 'binary\n',
			'package.json': JSON.stringify({
				files,
				name: '@c15t/react-native',
				version: '0.0.0',
			}),
			'react-native.config.js': 'export default {};\n',
			'src/specs/NativeC15t.ts': 'export default null;\n',
			'src/specs/__tests__/android-spec-surface.test.ts':
				'import {} from "vitest";\n',
		});

		return runPack(packageDir);
	};

	const offenderPaths = function offenderPaths(paths: string[]) {
		return paths
			.map((path) => ({
				path,
				reason: getBlockedReason('@c15t/react-native', path),
			}))
			.filter(({ reason }) => reason !== null);
	};

	/** The allowlist the package actually publishes with, so this test cannot drift from it. */
	const publishedFiles = function publishedFiles(): string[] {
		const manifest = JSON.parse(
			readFileSync(
				join(ROOT, 'packages', 'react-native', 'package.json'),
				'utf8'
			)
		) as { files?: string[] };

		return manifest.files ?? [];
	};

	it('publishes the host-app surface and nothing a build left behind', () => {
		const packed = buildFixture('narrow', publishedFiles());
		const paths = packed.files.map(({ path }) => path);

		expect(offenderPaths(paths)).toStrictEqual([]);

		for (const { path } of hostReadPaths) {
			expect(paths, `${path} is missing from the packed tree`).toContain(path);
		}
	});

	// The shape this guard exists for: two directories that name a whole platform. The test
	// target, the pod install, and the Gradle output all ride along, `.gitignore` says
	// otherwise, and the Codegen input the app needs is the one thing not in the list.
	it('reds on an allowlist that names the platform directories', () => {
		const packed = buildFixture('wide', [
			'dist',
			'dist-types',
			'ios',
			'android',
			'react-native.config.js',
			'C15tReactNative.podspec',
		]);
		const paths = packed.files.map(({ path }) => path);
		const offenders = offenderPaths(paths).map(({ path }) => path);

		expect(paths).toContain('ios/Pods/Manifest.lock');
		expect(paths).toContain('ios/build/Release-iphoneos/lib.a');
		expect(paths).toContain(
			'android/c15t-react-native/build/outputs/aar/a.aar'
		);

		// Everything the wide list leaks is something the gate now refuses.
		for (const leaked of [
			'ios/Pods/Manifest.lock',
			'ios/build/Release-iphoneos/lib.a',
			'ios/Tests/C15tReactNativeTests/C15tPayloadTests.swift',
			'android/.gradle/9.0/checksums.lock',
			'android/c15t-react-native/build/outputs/aar/a.aar',
			'android/c15t-react-native/src/test/kotlin/XTest.kt',
		]) {
			expect(offenders, `${leaked} should be an offender`).toContain(leaked);
		}

		// The other half of the same mistake. `src` is not in the wide list, so the Codegen
		// input every app reads out of `react-native config` is not in the tarball either:
		// one allowlist that both publishes a pod install and ships a package that cannot
		// generate its own spec.
		expect(paths).not.toContain('src/specs/NativeC15t.ts');
		expect(paths).not.toContain(
			'src/specs/__tests__/android-spec-surface.test.ts'
		);
	});
});

describe('published license copies', () => {
	const workDir = mkdtempSync(join(tmpdir(), 'c15t-license-'));

	afterAll(() => {
		rmSync(workDir, { force: true, recursive: true });
	});

	const packageHolding = function packageHolding(
		name: string,
		license: string
	) {
		const packageDir = join(workDir, name);

		makeTree(packageDir, { 'LICENSE.md': license });

		return packageDir;
	};

	it('flags a copy that drifted from the repository license', () => {
		const packageDir = packageHolding(
			'drifted',
			`${readFileSync(join(ROOT, 'LICENSE.md'), 'utf8')}\nAmended by hand.\n`
		);

		expect(scanPublishedLicenses(packageDir, new Set(['LICENSE.md']))).toEqual([
			{
				path: 'LICENSE.md',
				reason: 'license copy differs from the repository license',
				size: 0,
			},
		]);
	});

	it('says nothing about a package that publishes no license', () => {
		expect(
			scanPublishedLicenses(packageHolding('bare', 'unused'), new Set())
		).toStrictEqual([]);
	});

	// The copy the published pod points `s.license` at. A podspec cannot reach above the
	// package directory, so the copy is the only license text a consumer gets, and it is the
	// same kind of pointer that used to name `../../LICENSE.md`.
	it('accepts the copy the react-native package publishes', () => {
		expect(
			scanPublishedLicenses(
				join(ROOT, 'packages', 'react-native'),
				new Set(['LICENSE.md'])
			)
		).toStrictEqual([]);
	});
});

describe('allowedCommonJsArtifacts', () => {
	// The exception has to stay as narrow as the exports condition that justifies it. A `.cjs`
	// that stops being a `require` target is a build leftover, not a plugin entry point.
	it('names files each package hands out under require', () => {
		for (const [packageName, paths] of Object.entries(
			allowedCommonJsArtifacts
		)) {
			const requireTargets = new Set<string>();
			// A `require` condition can nest, so the walk keeps going under it.
			const collect = function collect(
				value: unknown,
				underRequire: boolean
			): void {
				if (typeof value === 'string') {
					if (underRequire) {
						requireTargets.add(value.replace(/^\.\//u, ''));
					}
					return;
				}

				if (value && typeof value === 'object') {
					for (const [key, item] of Object.entries(
						value as Record<string, unknown>
					)) {
						collect(item, underRequire || key === 'require');
					}
				}
			};

			const manifestPath = join(
				ROOT,
				'packages',
				packageName.split('/')[1] as string
			);
			expect(existsSync(manifestPath), packageName).toBe(true);

			const manifest = JSON.parse(
				readFileSync(join(manifestPath, 'package.json'), 'utf8')
			) as { exports?: unknown; name?: string };

			expect(manifest.name).toBe(packageName);
			collect(manifest.exports, false);

			for (const path of paths) {
				expect(requireTargets.has(path), path).toBe(true);
			}
		}
	});
});

describe('vendored native sources', () => {
	const workDir = mkdtempSync(join(tmpdir(), 'c15t-vendored-'));

	afterAll(() => {
		rmSync(workDir, { force: true, recursive: true });
	});

	/**
	 * A package directory whose copy of the core is built straight from
	 * `native/core-swift`, not from the package's own copy, so the fixture cannot agree with
	 * the thing it is judging.
	 */
	const vendoredPackage = function vendoredPackage(name: string): string {
		const packageDir = join(workDir, name);
		const files: Record<string, string> = {};

		for (const file of vendoredCorePlan()) {
			files[`vendor/C15tCore/${file.relativePath}`] = readFileSync(
				file.sourcePath,
				'utf8'
			);
		}

		makeTree(packageDir, files);

		return packageDir;
	};

	it('says nothing about a package that vendors no native sources', () => {
		const packageDir = join(workDir, 'no-vendor');

		expect(scanVendoredNativeSources(packageDir)).toStrictEqual([]);
		expect(scanPackedVendoredSources(packageDir, new Set())).toStrictEqual([]);
	});

	it('accepts a copy that matches native/core-swift', () => {
		expect(scanVendoredNativeSources(vendoredPackage('clean'))).toStrictEqual(
			[]
		);
	});

	it('names a copy that was edited inside the package', () => {
		const packageDir = vendoredPackage('edited');

		appendFileSync(
			join(packageDir, 'vendor/C15tCore/ConsentCore.swift'),
			'\n// hand edit\n'
		);

		const issues = scanVendoredNativeSources(packageDir);

		expect(issues).toHaveLength(1);
		expect(issues[0]?.path).toBe('vendor/C15tCore/ConsentCore.swift');
		expect(issues[0]?.reason).toMatch(/stale vendored native source/u);
		expect(issues[0]?.reason).toMatch(/sync-vendored-core\.ts/u);
	});

	it('names a file the core no longer has', () => {
		const packageDir = vendoredPackage('orphan');

		makeTree(packageDir, {
			'vendor/C15tCore/RenamedAway.swift': '// upstream',
		});

		expect(
			scanVendoredNativeSources(packageDir).map((issue) => issue.path)
		).toStrictEqual(['vendor/C15tCore/RenamedAway.swift']);
	});

	it('names a vendored file the tarball left out', () => {
		const packageDir = vendoredPackage('not-packed');
		const packed = new Set(
			vendoredCorePlan().map((file) => `vendor/C15tCore/${file.relativePath}`)
		);

		packed.delete('vendor/C15tCore/ConsentCore.swift');

		expect(
			scanPackedVendoredSources(packageDir, packed).map((issue) => issue.path)
		).toStrictEqual(['vendor/C15tCore/ConsentCore.swift']);
	});

	it('accepts a tarball that carries every vendored file', () => {
		const packageDir = vendoredPackage('fully-packed');
		const packed = new Set(
			vendoredCorePlan().map((file) => `vendor/C15tCore/${file.relativePath}`)
		);

		expect(scanPackedVendoredSources(packageDir, packed)).toStrictEqual([]);
	});

	it('publishes the copy, because a pod cannot depend on a path', () => {
		// The reason the copy exists. An npm-installed app has no `C15tCore` pod to resolve, so
		// the kernel reaches it only inside this package, and the podspec must compile from there
		// rather than name a dependency nobody publishes.
		const reactNativeDir = join(ROOT, 'packages', 'react-native');
		const packed = runPack(reactNativeDir);
		const packedPaths = packed.files.map((file) => file.path);
		const packedVendored = packedPaths.filter((path) =>
			path.startsWith('vendor/C15tCore/')
		);

		expect(packedVendored).toEqual(
			vendoredCorePlan()
				.map((file) => `vendor/C15tCore/${file.relativePath}`)
				.sort()
		);

		const podspecSource = readFileSync(
			join(reactNativeDir, 'C15tReactNative.podspec'),
			'utf8'
		);

		// Only the live spec: the header comment records why the dependency was dropped, and a
		// comment naming a thing is not the same as declaring it.
		const spec = podspecSource
			.split('\n')
			.filter((line) => !line.trimStart().startsWith('#'))
			.join('\n');

		expect(spec).not.toMatch(/s\.dependency\s+"C15tCore"/u);
		expect(spec).not.toMatch(/C15T_CORE_POD_VERSION/u);
		expect(spec).toMatch(/vendor\/C15tCore\/\*\*\/\*\.swift/u);
		expect(
			scanPackedVendoredSources(reactNativeDir, new Set(packedPaths))
		).toStrictEqual([]);
	});
});
