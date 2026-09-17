import {
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
	kernelFreePackages,
	runPack,
	scanKernelFreePackage,
	scanPublishedLicenses,
} from './check-publish-artifacts';
import type { PackageManifest } from './manifest-utils';
import { hostReadPaths } from './react-native-autolink';

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
describe('packages that must stay clear of the consent kernel', () => {
	const workDir = mkdtempSync(join(tmpdir(), 'c15t-kernel-free-'));

	afterAll(() => {
		rmSync(workDir, { force: true, recursive: true });
	});

	/**
	 * A packed `@c15t/react-native`, with the build output under discussion.
	 *
	 * The name matters: the guard only applies to the packages `kernelFreePackages`
	 * names, so every fixture here has to be the real name to be a fixture at all.
	 */
	const kernelFreeFixture = function kernelFreeFixture(
		name: string,
		files: Record<string, string>,
		dependencies: Record<string, string> = {}
	) {
		const packageDir = join(workDir, name);

		makeTree(packageDir, {
			...files,
			'package.json': JSON.stringify({
				dependencies,
				name: '@c15t/react-native',
				version: '0.0.0',
			}),
		});

		return packageDir;
	};

	/** Run the guard over a fixture directory as npm would see it. */
	const scan = function scan(
		packageDir: string,
		packedFilePaths: string[]
	): { path: string; reason: string }[] {
		const manifest = JSON.parse(
			readFileSync(join(packageDir, 'package.json'), 'utf8')
		) as PackageManifest;

		return scanKernelFreePackage(
			packageDir,
			'@c15t/react-native',
			manifest,
			new Set(packedFilePaths)
		);
	};

	// The original bug: one line in `dependencies`, and every host app on every
	// platform installs a browser consent engine it never runs.
	it('reds on the kernel in the published dependencies', () => {
		const packageDir = kernelFreeFixture(
			'dependency',
			{ 'dist/index.js': 'export const x = 1;\n' },
			{ '@c15t/core': '^3.0.0' }
		);

		expect(scan(packageDir, ['dist/index.js', 'package.json'])).toEqual([
			{
				path: 'dependencies.@c15t/core',
				reason: expect.stringContaining('published dependency'),
				size: 0,
			},
		]);
	});

	it('reds a runtime import of the kernel under dist', () => {
		const packageDir = kernelFreeFixture('runtime', {
			'dist/index.js':
				"import { CONSENT_CATEGORIES } from '@c15t/core/consent-categories';\nexport const order = CONSENT_CATEGORIES;\n",
		});

		const issues = scan(packageDir, ['dist/index.js']);

		expect(issues.map(({ path }) => path)).toStrictEqual(['dist/index.js']);
		expect(issues[0]?.reason).toContain('build output');
	});

	// Declarations are the half a manifest cannot tell you about. `types` points here,
	// so a specifier that survives the build is a consumer's `tsc` failure, whatever
	// the dependency list says.
	it('reds a declaration that re-exports the kernel', () => {
		const packageDir = kernelFreeFixture('declarations', {
			'dist-types/index.d.ts':
				"export type { ConsentState } from '@c15t/core';\nexport type { ConsentSnapshot } from './protocol/snapshot';\n",
			'dist/index.js': 'export const x = 1;\n',
		});

		expect(
			scan(packageDir, ['dist-types/index.d.ts', 'dist/index.js']).map(
				({ path }) => path
			)
		).toStrictEqual(['dist-types/index.d.ts']);
	});

	// The other half of the rule: these declarations document a wire that is defined
	// against the kernel, and a file that cannot name that is harder to review, not
	// cleaner. Only reaching for the package is drift.
	it('leaves prose about the kernel alone', () => {
		const packageDir = kernelFreeFixture('prose', {
			'dist-types/protocol/vocabulary.d.ts':
				"/**\n * Mirrors `CONSENT_CATEGORIES` in `@c15t/core`.\n *\n * @example\n * ```ts\n * // import { CONSENT_CATEGORIES } from '@c15t/core/consent-categories';\n * ```\n */\nexport declare const CONSENT_CATEGORIES: readonly string[];\n",
		});

		expect(
			scan(packageDir, ['dist-types/protocol/vocabulary.d.ts'])
		).toStrictEqual([]);
	});

	// The bundled Expo config plugin entry is one file with its imports inlined, so
	// the specifier patterns would find nothing even if the kernel were in there.
	it('reds the bundled entry by package name, where no specifier survives', () => {
		const packageDir = kernelFreeFixture('bundled', {
			'dist/expo-plugin/index.cjs':
				'"use strict";\nconst __module = "@c15t/core";\nmodule.exports = __module;\n',
		});

		expect(
			scan(packageDir, ['dist/expo-plugin/index.cjs']).map(({ path }) => path)
		).toStrictEqual(['dist/expo-plugin/index.cjs']);
	});

	it('says nothing about a package that is allowed to depend on the kernel', () => {
		const packageDir = join(workDir, 'web-package');

		makeTree(packageDir, {
			'package.json': JSON.stringify({
				dependencies: { '@c15t/core': 'workspace:*' },
				name: '@c15t/react',
				version: '0.0.0',
			}),
		});

		const manifest = JSON.parse(
			readFileSync(join(packageDir, 'package.json'), 'utf8')
		) as PackageManifest;

		expect(
			scanKernelFreePackage(
				packageDir,
				'@c15t/react',
				manifest,
				new Set(['dist/index.js'])
			)
		).toStrictEqual([]);
	});

	it('says nothing about a clean build', () => {
		const packageDir = kernelFreeFixture('clean', {
			'dist-types/index.d.ts':
				"export type { ConsentSnapshot } from './protocol/snapshot';\n",
			'dist/index.js': "export * from './protocol/vocabulary';\n",
		});

		expect(
			scan(packageDir, [
				'dist-types/index.d.ts',
				'dist/index.js',
				'package.json',
			])
		).toStrictEqual([]);
	});

	// The published packages, read straight from the checkout. The manifest is the
	// contract an installer obeys, and the kernel has to stay reachable as a
	// devDependency, or the fixture generator and the vocabulary oracle go quiet and
	// the leak is "fixed" by deleting the thing that would have caught the next one.
	it('holds every published package to both halves of the rule', () => {
		for (const packageName of Object.keys(kernelFreePackages)) {
			const manifestPath = join(
				ROOT,
				'packages',
				packageName.split('/')[1] as string,
				'package.json'
			);
			const manifest = JSON.parse(
				readFileSync(manifestPath, 'utf8')
			) as PackageManifest & { devDependencies?: Record<string, string> };

			expect(manifest.name, manifestPath).toBe(packageName);

			for (const field of [
				'dependencies',
				'peerDependencies',
				'optionalDependencies',
			] as const) {
				expect(
					manifest[field] ?? {},
					`@c15t/core must not appear in ${field} of ${packageName}`
				).not.toHaveProperty('@c15t/core');
			}

			expect(manifest.devDependencies).toHaveProperty('@c15t/core');
		}
	});
});
