#!/usr/bin/env bun
/**
 * Copy the Swift consent core into the React Native package.
 *
 * `native/core-swift` is the core's only home, and the binding's pod used to reach it through
 * `s.dependency "C15tCore"`. That dependency resolves inside this repository only because the
 * example Podfiles write `pod "C15tCore", :path => "../native/core-swift"`. An app that
 * installs `@c15t/react-native` from npm has no such path and no published pod to fall back
 * to, so `pod install` fails there while every job in this repository stays green. CocoaPods
 * has no way to point a `s.dependency` at a path, so the only shape that resolves for a
 * consumer is the core's sources travelling inside the package.
 *
 * Vendoring is a packaging step, not a fork. `native/core-swift` stays the source of truth and
 * `packages/react-native/Package.swift` stays two-module, so a later Swift Package Manager
 * release of the core is unaffected; only the CocoaPods path compiles the copy, into the
 * binding's own module. The bridge's `import C15tCore` sites are wrapped in
 * `#if canImport(C15tCore)` so one set of sources serves both, which is the split
 * `C15tReactNativeRuntime.swift` already uses for `C15tReactNativeBridge`.
 *
 * Because the copy is generated, drift is the failure to design against: an edited file under
 * `vendor/`, a core file deleted upstream and left behind here, or a core change that was never
 * synced would all ship silently. `--check` compares the two trees byte for byte and names
 * every difference, and `scripts/check-publish-artifacts.ts` runs it as part of the release
 * gate, so a stale copy cannot be published. Run this script without `--check` after changing
 * anything under `native/core-swift/Sources/C15tCore`.
 */

import {
	cpSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** The core's source of truth. */
export const coreSourceDir = join(
	ROOT,
	'native',
	'core-swift',
	'Sources',
	'C15tCore'
);

/** The generated copy the pod compiles. Never edit anything under here. */
export const vendoredCoreDir = join(
	ROOT,
	'packages',
	'react-native',
	'vendor',
	'C15tCore'
);

/** One file of the core, as both a source of truth path and a generated destination. */
export interface VendoredCoreFile {
	/** Path relative to `coreSourceDir`, POSIX-style. Also its path inside the copy. */
	relativePath: string;
	/** The file in `native/core-swift`. */
	sourcePath: string;
	/** The generated file under `packages/react-native/vendor`. */
	vendoredPath: string;
}

/**
 * Every file in a directory, sorted, with paths relative to that directory.
 *
 * Sorted so a regenerated tree is stable, which is what makes `git diff` on `vendor/` a
 * meaningful review signal rather than noise from readdir order.
 *
 * @param directory - The directory to walk.
 * @returns One entry per file, relative to `directory`.
 */
export const listFiles = function listFiles(directory: string): string[] {
	if (!existsSync(directory)) {
		return [];
	}

	const found: string[] = [];

	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			found.push(
				...listFiles(join(directory, entry.name)).map(
					(nested) => `${entry.name}/${nested}`
				)
			);
			continue;
		}

		found.push(entry.name);
	}

	return found.sort();
};

/**
 * The file-by-file mapping from a native source tree to its generated copy.
 *
 * @param sourceDir - The source of truth. Defaults to the repository's Swift core.
 * @param targetDir - Where the copy lives. Defaults to the package's vendor directory.
 * @returns One entry per file under `sourceDir`, in sorted order.
 */
export const vendoredCorePlan = function vendoredCorePlan(
	sourceDir = coreSourceDir,
	targetDir = vendoredCoreDir
): VendoredCoreFile[] {
	return listFiles(sourceDir).map((relativePath) => ({
		relativePath,
		sourcePath: join(sourceDir, relativePath),
		vendoredPath: join(targetDir, relativePath),
	}));
};

/** How one generated file disagrees with its source. */
export type VendoredCoreDrift =
	| { kind: 'missing'; relativePath: string }
	| { kind: 'different'; relativePath: string }
	| { kind: 'orphan'; relativePath: string };

/**
 * Compare a generated copy against the tree it was generated from, without writing.
 *
 * An orphan counts as drift in its own direction: a file deleted upstream that survives in the
 * copy keeps compiling, so the published pod carries a type the source of truth no longer has,
 * and nothing downstream would ever notice.
 *
 * @param sourceDir - The source of truth.
 * @param targetDir - The generated copy.
 * @returns Every difference, in path order.
 */
export const compareTrees = function compareTrees(
	sourceDir: string,
	targetDir: string
): VendoredCoreDrift[] {
	const drift: VendoredCoreDrift[] = [];
	const sourceFiles = listFiles(sourceDir);
	const expected = new Set(sourceFiles);

	for (const relativePath of sourceFiles) {
		const targetPath = join(targetDir, relativePath);

		if (!existsSync(targetPath)) {
			drift.push({ kind: 'missing', relativePath });
			continue;
		}

		if (
			!readFileSync(targetPath).equals(
				readFileSync(join(sourceDir, relativePath))
			)
		) {
			drift.push({ kind: 'different', relativePath });
		}
	}

	for (const relativePath of listFiles(targetDir)) {
		if (!expected.has(relativePath)) {
			drift.push({ kind: 'orphan', relativePath });
		}
	}

	return drift;
};

/**
 * Compare the vendored copy in this repository against the core it comes from.
 *
 * @returns Every difference, in path order.
 */
export const checkVendoredCore =
	function checkVendoredCore(): VendoredCoreDrift[] {
		return compareTrees(coreSourceDir, vendoredCoreDir);
	};

/**
 * The words a stale copy is reported in. Shared with the release gate so one copy of the
 * remedy is written down.
 *
 * @param drift - One difference between the two trees.
 * @returns A line that names the file and the command that repairs it.
 */
export const describeDrift = function describeDrift(
	drift: VendoredCoreDrift
): string {
	if (drift.kind === 'missing') {
		return `vendor/C15tCore/${drift.relativePath} is missing. Run bun scripts/sync-vendored-core.ts.`;
	}

	if (drift.kind === 'orphan') {
		return `vendor/C15tCore/${drift.relativePath} has no file in native/core-swift. Run bun scripts/sync-vendored-core.ts.`;
	}

	return `vendor/C15tCore/${drift.relativePath} differs from native/core-swift/Sources/C15tCore/${drift.relativePath}. Run bun scripts/sync-vendored-core.ts.`;
};

/**
 * Write the copy, or report every way the existing copy has drifted.
 *
 * @param options.check - Compare instead of write, so the release gate can call the same code
 * that produces the tree rather than a second implementation of the comparison.
 * @param options.sourceDir - The source of truth, for a copy of something other than the core.
 * @param options.targetDir - Where to write the copy.
 * @returns The drift found in check mode, and an empty list after a write.
 */
export const syncVendoredCore = function syncVendoredCore(
	options: {
		check?: boolean;
		sourceDir?: string;
		targetDir?: string;
	} = {}
): VendoredCoreDrift[] {
	const sourceDir = options.sourceDir ?? coreSourceDir;
	const targetDir = options.targetDir ?? vendoredCoreDir;

	if (options.check) {
		return compareTrees(sourceDir, targetDir);
	}

	const plan = vendoredCorePlan(sourceDir, targetDir);

	if (plan.length === 0) {
		throw new Error(
			`No files found under ${relative(ROOT, sourceDir)}. The core's layout changed, and a silent empty vendor tree would publish a pod with no consent kernel in it.`
		);
	}

	mkdirSync(targetDir, { recursive: true });

	for (const file of plan) {
		mkdirSync(dirname(file.vendoredPath), { recursive: true });
		cpSync(file.sourcePath, file.vendoredPath);
	}

	// The plan is authoritative, so anything left in the copy that it does not name is a file
	// the core no longer has.
	for (const relativePath of listFiles(targetDir)) {
		if (!plan.some((file) => file.relativePath === relativePath)) {
			rmSync(join(targetDir, relativePath));
		}
	}

	return [];
};

const main = function main(): void {
	const check = process.argv.includes('--check');
	const drift = syncVendoredCore({ check });

	if (drift.length > 0) {
		console.error(
			`The vendored Swift core is stale (${drift.length} file(s) out of step with native/core-swift):`
		);
		for (const entry of drift) {
			console.error(`  - ${describeDrift(entry)}`);
		}
		process.exit(1);
	}

	const fileCount = vendoredCorePlan().length;

	console.log(
		check
			? `Vendored Swift core matches native/core-swift: ${fileCount} file(s).`
			: `Vendored ${fileCount} file(s) into packages/react-native/vendor/C15tCore.`
	);
};

if (import.meta.main) {
	main();
}
