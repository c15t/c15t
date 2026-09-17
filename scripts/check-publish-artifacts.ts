#!/usr/bin/env bun

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { PackageManifest } from './manifest-utils';
import {
	collectManifestTargets,
	readManifest,
	wildcardToRegExp,
} from './manifest-utils';
import { hostReadPaths } from './react-native-autolink';
import { compareTrees, describeDrift, listFiles } from './sync-vendored-core';

interface PackedFile {
	path: string;
	size: number;
}

interface PackResult {
	name: string;
	version: string;
	files: PackedFile[];
}

const ROOT = process.cwd();
const PACKAGES_DIR = join(ROOT, 'packages');

/** Where a package keeps a generated copy of native sources it compiles itself. */
const VENDORED_NATIVE_DIR = 'vendor/C15tCore';

/**
 * Path shapes that are wrong anywhere in a tarball, not just under `dist/`.
 *
 * npm throws away `.gitignore` as soon as `package.json` carries a `files` allowlist, so an
 * allowlisted directory ships with whatever a local run left inside it: a `Pods/` install, a
 * `build/` tree, `ios/Tests`, the Kotlin under an Android library's `src/test`. A release
 * cut next to a native test run would publish that tree, and nothing here saw it, because
 * the JS leak shapes used to be judged only inside `dist/`. The native shapes are named for
 * the toolchains that write them: CocoaPods (`Pods/`), Xcode (`ios/Tests`), Gradle
 * (`build/`, `.gradle/`), and the Android test source sets (`src/test`, `src/androidTest`).
 */
const tarballBlockedPathPatterns: { reason: string; pattern: RegExp }[] = [
	{ pattern: /(?:^|\/)__tests__(?:\/|$)/u, reason: 'test folder' },
	{ pattern: /(?:^|\/)__snapshots__(?:\/|$)/u, reason: 'snapshot folder' },
	{ pattern: /(?:^|\/)__screenshots__(?:\/|$)/u, reason: 'screenshot folder' },
	{ pattern: /\.test\./u, reason: 'test file' },
	{ pattern: /\.spec\./u, reason: 'spec file' },
	{ pattern: /\.e2e\./u, reason: 'e2e file' },
	{
		pattern: /(?:^|\/)ios\/Tests(?:\/|$)/u,
		reason: 'Xcode test target source',
	},
	{ pattern: /(?:^|\/)build(?:\/|$)/u, reason: 'build output directory' },
	{
		pattern: /(?:^|\/)Pods(?:\/|$)/u,
		reason: 'CocoaPods install tree',
	},
	{ pattern: /(?:^|\/)\.gradle(?:\/|$)/u, reason: 'Gradle cache directory' },
	{
		pattern: /(?:^|\/)src\/test(?:\/|$)/u,
		reason: 'Android unit test source',
	},
	{
		pattern: /(?:^|\/)src\/androidTest(?:\/|$)/u,
		reason: 'Android instrumented test source',
	},
];

/**
 * The CommonJS artifacts this repository publishes on purpose.
 *
 * v3 ships ESM-only everywhere else. Expo resolves a config plugin with Node's CommonJS
 * resolver and then `require()`s what it finds, which is why `@c15t/react-native` bundles
 * `src/expo-plugin` into one self-contained `.cjs` (see that package's `rslib.config.ts`) and
 * hands it out under the `require` export condition. `check-publish-artifacts.test.ts` fails
 * when an entry here is no longer a `require` target of that package's exports map, so the
 * exception cannot outlive the loader that needs it.
 */
export const allowedCommonJsArtifacts: Record<string, string[]> = {
	'@c15t/react-native': ['dist/expo-plugin/index.cjs'],
};

const distBlockedPathPatterns: { reason: string; pattern: RegExp }[] = [
	{
		pattern: /(?:^|\/)mockServiceWorker\.js$/u,
		reason: 'msw mock service worker',
	},
	{
		pattern: /(?:^|\/)static\/image\//u,
		reason: 'playwright screenshot output',
	},
	{
		pattern: /(?:^|\/)rsdoctor-data\.json$/u,
		reason: 'rsdoctor report artifact',
	},
];

const requiredPackedFilesByPackage: Record<string, string[]> = {
	'@c15t/backend': ['AGENTS.md', 'docs/README.md'],
	'@c15t/cli': ['AGENTS.md', 'docs/README.md'],
	'@c15t/core': ['AGENTS.md', 'docs/README.md'],
	'@c15t/nextjs': [
		'AGENTS.md',
		'docs/README.md',
		'styles.css',
		'styles.tw3.css',
		'iab/styles.css',
		'iab/styles.tw3.css',
		'dist/styles.css',
		'dist/styles.tw3.css',
		'dist/iab/styles.css',
		'dist/iab/styles.tw3.css',
		'src/styles.css',
		'src/styles.tw3.css',
		'src/iab/styles.css',
		'src/iab/styles.tw3.css',
	],
	'@c15t/react': [
		'AGENTS.md',
		'docs/README.md',
		'styles.css',
		'styles.tw3.css',
		'iab/styles.css',
		'iab/styles.tw3.css',
		'dist/styles.css',
		'dist/styles.tw3.css',
		'dist/iab/styles.css',
		'dist/iab/styles.tw3.css',
		'src/styles.tw3.css',
		'src/iab/styles.tw3.css',
	],
	// The native half has one owner for this list: `scripts/react-native-autolink.ts` says
	// what a host app opens, and the release gate holds the tarball to it. A named directory
	// is a directory npm will sweep, so every entry here is a file.
	'@c15t/react-native': hostReadPaths.map(({ path }) => path),
	'@c15t/scripts': ['AGENTS.md', 'docs/README.md'],
	'@c15t/ui': [
		'styles.css',
		'styles.tw3.css',
		'iab/styles.css',
		'iab/styles.tw3.css',
		'dist/styles.css',
		'dist/styles.tw3.css',
		'dist/iab/styles.css',
		'dist/iab/styles.tw3.css',
	],
	c15t: ['AGENTS.md'],
};

const styleEntrypointPackages = new Set([
	'@c15t/ui',
	'@c15t/react',
	'@c15t/nextjs',
]);

const rootTw3ProxyContents: Record<string, string> = {
	'iab/styles.tw3.css': "@import '../dist/iab/styles.tw3.css';",
	'styles.tw3.css': "@import './dist/styles.tw3.css';",
};

/**
 * Refuse a published license copy that is not the repository's license.
 *
 * A podspec has to point its `s.license` file inside the package, so `@c15t/react-native`
 * carries a copy of the root `LICENSE.md`. A copy is a copy: it goes stale the moment the
 * repository one is edited, and nothing but this check would notice, which is the same failure
 * that had the podspec naming `../../LICENSE.md` in the first place.
 *
 * @param packageDir - The package whose tarball is being judged.
 * @param packedFilePaths - Every path in that tarball.
 * @returns Every license copy that does not match the root license, byte for byte.
 */
export const scanPublishedLicenses = function scanPublishedLicenses(
	packageDir: string,
	packedFilePaths: Set<string>
): { path: string; size: number; reason: string }[] {
	const issues: { path: string; size: number; reason: string }[] = [];
	const rootLicensePath = join(ROOT, 'LICENSE.md');

	if (!existsSync(rootLicensePath)) {
		return issues;
	}

	const rootLicense = readFileSync(rootLicensePath);

	for (const path of ['LICENSE.md', 'LICENSE']) {
		if (!packedFilePaths.has(path)) {
			continue;
		}

		if (!readFileSync(join(packageDir, path)).equals(rootLicense)) {
			issues.push({
				path,
				reason: 'license copy differs from the repository license',
				size: 0,
			});
		}
	}

	return issues;
};

/**
 * Refuse a checked-out copy of the native core that has drifted from its source of truth.
 *
 * The React Native pod compiles the Swift consent kernel from `vendor/C15tCore`, because a pod
 * cannot point `s.dependency` at a path and no `C15tCore` pod is published, so an app installed
 * from npm gets a kernel only if this package carries one. `native/core-swift` stays the source
 * of truth and the copy is generated, so any difference between the two is a defect: a pod built
 * from the copy is not a pod built from the core, and a reader of the checkout cannot
 * tell them apart. The comparison is the one the sync script uses, so the copy is judged by the
 * code that produces it rather than by a second reading of the rules.
 *
 * @param packageDir - The package to read, which is judged only if it vendors a core.
 * @returns Every vendored file that differs from, is missing from, or outlives the core.
 */
export const scanVendoredNativeSources = function scanVendoredNativeSources(
	packageDir: string
): { path: string; size: number; reason: string }[] {
	const vendoredDir = join(packageDir, VENDORED_NATIVE_DIR);

	if (!existsSync(vendoredDir)) {
		return [];
	}

	const sourceDir = join(ROOT, 'native', 'core-swift', 'Sources', 'C15tCore');

	return compareTrees(sourceDir, vendoredDir).map((drift) => ({
		path: `${VENDORED_NATIVE_DIR}/${drift.relativePath}`,
		reason: `stale vendored native source: ${describeDrift(drift)}`,
		size: 0,
	}));
};

/**
 * Refuse a vendored native source that never reaches the tarball.
 *
 * A generated copy that stays on disk helps nobody: `files` is an allowlist, and dropping
 * `vendor/C15tCore` from it publishes a podspec whose `source_files` matches nothing, so the
 * consumer builds a pod with no consent kernel in it and the failure surfaces as a missing type
 * in an app that cannot see this repository.
 *
 * @param packageDir - The package whose tarball is being judged.
 * @param packedFilePaths - Every path in that tarball.
 * @returns Every vendored file the tarball left out.
 */
export const scanPackedVendoredSources = function scanPackedVendoredSources(
	packageDir: string,
	packedFilePaths: Set<string>
): { path: string; size: number; reason: string }[] {
	const vendoredDir = join(packageDir, VENDORED_NATIVE_DIR);

	if (!existsSync(vendoredDir)) {
		return [];
	}

	return listFiles(vendoredDir)
		.map((relativePath) => `${VENDORED_NATIVE_DIR}/${relativePath}`)
		.filter((packedPath) => !packedFilePaths.has(packedPath))
		.map((packedPath) => ({
			path: packedPath,
			reason: 'vendored native source is not in the tarball',
			size: 0,
		}));
};
const scanPackedManifestTargets = function scanPackedManifestTargets(
	manifest: PackageManifest,
	packedFilePaths: Set<string>
): { path: string; size: number; reason: string }[] {
	const packedFiles = [...packedFilePaths];

	return collectManifestTargets(manifest)
		.filter(({ target }) => {
			if (target.includes('*')) {
				const pattern = wildcardToRegExp(target);
				return !packedFiles.some((filePath) => pattern.test(filePath));
			}

			return !packedFilePaths.has(target);
		})
		.map(({ source, target }) => ({
			path: target,
			reason: `manifest target missing from packed files (${source})`,
			size: 0,
		}));
};

/**
 * Ask npm what a package would publish, without writing a tarball.
 *
 * @param packageDir - The package to pack.
 * @returns npm's own answer: the name, version, and every path in the tarball.
 */
export const runPack = function runPack(packageDir: string): PackResult {
	let raw: string;

	try {
		raw = execFileSync('npm', ['pack', '--json', '--dry-run'], {
			cwd: packageDir,
			encoding: 'utf8',
			// A package with a few hundred declarations is well past the 1 MiB default.
			maxBuffer: 64 * 1024 * 1024,
			stdio: ['ignore', 'pipe', 'pipe'],
		});
	} catch (error) {
		const failure = error as {
			stderr?: Buffer | string;
			stdout?: Buffer | string;
		};
		throw new Error(
			`npm pack failed in ${packageDir}\nstdout:\n${String(failure.stdout ?? '')}\nstderr:\n${String(failure.stderr ?? error)}`,
			{ cause: error }
		);
	}

	const stdout = raw.trim();
	const jsonStart = stdout.indexOf('[\n  {');
	const jsonEnd = stdout.lastIndexOf('\n]');
	const jsonPayload =
		jsonStart >= 0 && jsonEnd >= jsonStart
			? stdout.slice(jsonStart, jsonEnd + 2)
			: stdout.slice(Math.max(stdout.indexOf('{'), 0));
	const parsed = JSON.parse(jsonPayload) as
		| PackResult[]
		| Record<string, PackResult>;

	// npm ≤11 prints an array of pack results; npm 12 prints an object keyed
	// by package name. Accept both.
	const firstPack = Array.isArray(parsed)
		? parsed[0]
		: Object.values(parsed)[0];
	if (!firstPack?.files) {
		throw new Error(`Unexpected npm pack output in ${packageDir}: ${stdout}`);
	}

	return firstPack;
};

export const getBlockedReason = function getBlockedReason(
	packageName: string,
	path: string
): string | null {
	// v3 ships ESM-only: no package publishes CommonJS artifacts anywhere in
	// the tarball — dist/, shims/, or the package root. The one exception is the
	// Expo config plugin entry, which is named by an `exports` `require` condition.
	if (
		path.endsWith('.cjs') &&
		!allowedCommonJsArtifacts[packageName]?.includes(path)
	) {
		return 'CommonJS artifact in ESM-only package';
	}

	// Everything below is judged against the whole tarball, not just the build output.
	for (const rule of tarballBlockedPathPatterns) {
		if (rule.pattern.test(path)) {
			return rule.reason;
		}
	}

	// Most accidental publish bloat in this repo comes from built output.
	if (path.startsWith('dist/')) {
		if (path.endsWith('.d.ts.map')) {
			return 'declaration source map in runtime dist';
		}
		if (path.endsWith('.d.ts')) {
			if (
				packageName === '@c15t/ui' &&
				/^dist\/styles\/components\/[^/]+\.d\.ts$/u.test(path)
			) {
				return null;
			}
			// svelte-package and nuxt-module-build ship declarations inside
			// dist/ by design (no dist-types/ directory).
			if (packageName === '@c15t/svelte' || packageName === '@c15t/vue') {
				return null;
			}
			return 'declaration file in runtime dist';
		}

		for (const rule of distBlockedPathPatterns) {
			if (rule.pattern.test(path)) {
				return rule.reason;
			}
		}
	}

	if (path.startsWith('dist-types/')) {
		if (path.endsWith('.d.ts.map')) {
			return 'declaration source map in published declarations';
		}
		if (!path.endsWith('.d.ts')) {
			return 'non-declaration file in published declarations';
		}
	}

	return null;
};

const scanStyleEntrypointsContent = function scanStyleEntrypointsContent(
	packageDir: string,
	packageName: string,
	packedFilePaths: Set<string>
): { path: string; size: number; reason: string }[] {
	if (!styleEntrypointPackages.has(packageName)) {
		return [];
	}

	const issues: { path: string; size: number; reason: string }[] = [];

	for (const [path, expectedContent] of Object.entries(rootTw3ProxyContents)) {
		if (!packedFilePaths.has(path)) {
			continue;
		}

		const filePath = join(packageDir, path);
		const content = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
		if (content.trim() !== expectedContent) {
			issues.push({
				path,
				reason: 'Tailwind v3 root proxy must point at the dist entrypoint',
				size: content.length,
			});
		}
	}

	for (const path of ['dist/styles.tw3.css', 'dist/iab/styles.tw3.css']) {
		if (!packedFilePaths.has(path)) {
			continue;
		}

		const filePath = join(packageDir, path);
		const content = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
		if (/^\s*@import\b/mu.test(content)) {
			issues.push({
				path,
				reason: 'Tailwind v3 dist CSS must inline rules, not nested imports',
				size: content.length,
			});
		}
		if (!content.includes('c15t-ui-')) {
			issues.push({
				path,
				reason: 'Tailwind v3 dist CSS must contain generated c15t UI rules',
				size: content.length,
			});
		}
	}

	return issues;
};

const scanUiComponentStyleArtifacts = function scanUiComponentStyleArtifacts(
	packageDir: string,
	packageName: string,
	packedFilePaths: Set<string>
): { path: string; size: number; reason: string }[] {
	if (packageName !== '@c15t/ui') {
		return [];
	}

	const sourceDir = join(packageDir, 'src/styles/components');
	const styleNames = readdirSync(sourceDir)
		.filter((file) => file.endsWith('.module.css'))
		.map((file) => file.replace('.module.css', ''))
		.sort();
	const issues: { path: string; size: number; reason: string }[] = [];

	for (const name of styleNames) {
		for (const extension of ['css', 'js', 'd.ts']) {
			const path = `dist/styles/components/${name}.${extension}`;
			if (!packedFilePaths.has(path)) {
				issues.push({
					path,
					reason: 'required component style artifact missing',
					size: 0,
				});
			}
		}

		for (const stalePath of [
			`dist/styles/components/${name}_module.css`,
			`dist/styles/components/${name}.module.css`,
			`dist/styles/components/${name}.module.js`,
			`dist/styles/components/${name}.module.cjs`,
			`dist/styles/components/${name}.cjs`,
		]) {
			if (packedFilePaths.has(stalePath)) {
				issues.push({
					path: stalePath,
					reason: 'stale rslib CSS Module artifact must not be published',
					size: 0,
				});
			}
		}

		const cssPath = `dist/styles/components/${name}.css`;
		if (packedFilePaths.has(cssPath)) {
			const filePath = join(packageDir, cssPath);
			const content = existsSync(filePath)
				? readFileSync(filePath, 'utf8')
				: '';
			if (/^\s*@import\s+["']\.\/animations\//mu.test(content)) {
				issues.push({
					path: cssPath,
					reason: 'component CSS must inline local animation imports',
					size: content.length,
				});
			}
			if (!content.includes('c15t-ui-')) {
				issues.push({
					path: cssPath,
					reason: 'component CSS must contain generated c15t UI class names',
					size: content.length,
				});
			}
		}

		const jsPath = `dist/styles/components/${name}.js`;
		if (packedFilePaths.has(jsPath)) {
			const filePath = join(packageDir, jsPath);
			const content = existsSync(filePath)
				? readFileSync(filePath, 'utf8')
				: '';
			if (!content.includes(`./${name}.css`)) {
				issues.push({
					path: jsPath,
					reason: 'component ESM class map must import its CSS side effect',
					size: content.length,
				});
			}
		}

		const declarationPath = `dist/styles/components/${name}.d.ts`;
		if (packedFilePaths.has(declarationPath)) {
			const filePath = join(packageDir, declarationPath);
			const content = existsSync(filePath)
				? readFileSync(filePath, 'utf8')
				: '';
			if (!content.includes('export default styles')) {
				issues.push({
					path: declarationPath,
					reason:
						'component style declaration must describe the default class map export',
					size: content.length,
				});
			}
		}
	}

	return issues;
};

const main = function main(): void {
	const packageDirs = readdirSync(PACKAGES_DIR, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => join(PACKAGES_DIR, entry.name))
		.filter((packageDir) => existsSync(join(packageDir, 'package.json')));

	const offenders: {
		packageName: string;
		version: string;
		files: { path: string; size: number; reason: string }[];
	}[] = [];

	let checkedPackages = 0;

	for (const packageDir of packageDirs) {
		const manifest = readManifest(packageDir);
		if (manifest.private || !manifest.name) {
			continue;
		}

		// Read before packing. `prepack` regenerates the vendored core, so a copy that had drifted
		// would repair itself between the read and the judgement, and the checkout would keep a
		// second version of the kernel that nothing but this line ever reads.
		const vendoredDrift = scanVendoredNativeSources(packageDir);

		const packed = runPack(packageDir);
		checkedPackages += 1;

		const blockedFiles = packed.files
			.map((file) => {
				const reason = getBlockedReason(packed.name, file.path);
				if (!reason) {
					return null;
				}
				return { ...file, reason };
			})
			.filter((file) => file !== null);

		const requiredFiles = requiredPackedFilesByPackage[packed.name] ?? [];
		const packedFilePaths = new Set(packed.files.map((file) => file.path));
		for (const path of requiredFiles) {
			if (!packedFilePaths.has(path)) {
				blockedFiles.push({
					path,
					reason: 'required published file missing',
					size: 0,
				});
			}
		}
		blockedFiles.push(...scanPackedManifestTargets(manifest, packedFilePaths));
		blockedFiles.push(
			...scanStyleEntrypointsContent(packageDir, packed.name, packedFilePaths)
		);
		blockedFiles.push(
			...scanUiComponentStyleArtifacts(packageDir, packed.name, packedFilePaths)
		);
		blockedFiles.push(...scanPublishedLicenses(packageDir, packedFilePaths));
		blockedFiles.push(...vendoredDrift);
		blockedFiles.push(
			...scanPackedVendoredSources(packageDir, packedFilePaths)
		);

		if (blockedFiles.length > 0) {
			offenders.push({
				files: blockedFiles,
				packageName: packed.name,
				version: packed.version,
			});
		}
	}

	if (offenders.length === 0) {
		console.log(
			`Publish artifact guard passed. Checked ${checkedPackages} packages.`
		);
		process.exit(0);
	}

	console.error('Publish artifact guard failed.');
	for (const offender of offenders) {
		console.error(`\n- ${offender.packageName}@${offender.version}`);
		for (const file of offender.files) {
			console.error(`  - ${file.path} (${file.size} bytes) [${file.reason}]`);
		}
	}

	process.exit(1);
};

if (import.meta.main) {
	main();
}
