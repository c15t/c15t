/**
 * Shipped bytes: JavaScript, iOS, and Android.
 *
 * JavaScript is measured from the published artifact, the way the consumer bundle
 * job measures the web packages. Native is measured as the bytes the engine adds
 * to an app binary: the linked `__TEXT` plus `__DATA` of the arm64 iOS slice, and
 * the compiled class bytes of the Android artifacts. A baseline app carries none
 * of those, so the artifact size is the delta.
 *
 * A build this machine cannot run leaves its row `not-measured` with the reason.
 */

import { execFileSync } from 'node:child_process';
import {
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	statSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

import { findMissingReactImports } from '../support/ensure-react-global';
import { walkModuleClosure } from '../support/module-closure';
import { REPO_ROOT } from './native';

const PACKAGE_DIR = resolve(REPO_ROOT, 'packages', 'react-native');
const DIST_DIR = join(PACKAGE_DIR, 'dist');
const SWIFT_PACKAGE = resolve(REPO_ROOT, 'native', 'core-swift');
const ANDROID_CORE = resolve(REPO_ROOT, 'native', 'core-android');
const ANDROID_BRIDGE = join(PACKAGE_DIR, 'android');
const XCODE_DEVELOPER_DIR = '/Applications/Xcode.app/Contents/Developer';
const SCRATCH = resolve(REPO_ROOT, '.benchmarks', 'mobile-native');

/** One shipped-bytes number, or the reason it is absent. */
export interface BundleMetric {
	value: number | null;
	reason?: string;
	detail?: string;
}

export interface BundleResult {
	jsShippedBytes: BundleMetric;
	jsShippedGzipBytes: BundleMetric;
	/** What the entry drags in beyond this package, which is what a bundle pays. */
	jsClosureBytes: BundleMetric;
	jsClosureGzipBytes: BundleMetric;
	/** Modules in that closure, so a regression can be attributed. */
	jsClosureFiles: BundleMetric;
	iosBinaryBytes: BundleMetric;
	/** The TurboModule binding, which needs a pod install to compile. */
	iosBindingBytes: BundleMetric;
	androidBinaryBytes: BundleMetric;
	/** Built files that use a `React` global without importing it. */
	jsxGlobalReferenceFiles: BundleMetric;
	/** Zero when the package manifest parses, which every consumer needs it to. */
	packageManifestParseErrors: BundleMetric;
}

const walkJs = function walkJs(dir: string, found: string[] = []): string[] {
	if (!existsSync(dir)) {
		return found;
	}
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			walkJs(full, found);
		} else if (entry.endsWith('.js')) {
			found.push(full);
		}
	}
	return found;
};

const exec = function exec(
	command: string,
	args: string[],
	options: { cwd: string; env?: NodeJS.ProcessEnv; timeoutMs?: number }
): { stdout: string; error?: string } {
	try {
		return {
			stdout: execFileSync(command, args, {
				cwd: options.cwd,
				encoding: 'utf8',
				env: { ...process.env, ...options.env },
				maxBuffer: 64 * 1024 * 1024,
				stdio: ['ignore', 'pipe', 'pipe'],
				timeout: options.timeoutMs ?? 900000,
			}),
		};
	} catch (error) {
		const failure = error as { message?: string; stdout?: string };
		return {
			error: failure.message ?? String(error),
			stdout: failure.stdout ?? '',
		};
	}
};

const scratchDir = function scratchDir(name: string): string {
	const target = join(SCRATCH, name);
	mkdirSync(target, { recursive: true });
	return target;
};

/**
 * Uncompressed class bytes inside a jar.
 *
 * @param jar - Path to the jar.
 * @returns Byte total, or `null` when the jar is missing or unreadable.
 */
const jarClassBytes = function jarClassBytes(jar: string): number | null {
	if (!existsSync(jar)) {
		return null;
	}
	const listing = exec('unzip', ['-l', jar], {
		cwd: REPO_ROOT,
		timeoutMs: 60000,
	});
	if (listing.error) {
		return null;
	}
	let total = 0;
	let counted = 0;
	for (const match of listing.stdout.matchAll(
		/^\s*(?<bytes>\d+)\s+[\d-]+\s+[\d:]+\s+(?<path>.+\.class)$/gmu
	)) {
		total += Number(match.groups?.bytes ?? '0');
		counted += 1;
	}
	return counted > 0 ? total : null;
};

/**
 * Uncompressed class bytes of the `classes.jar` inside an aar.
 *
 * @param aar - Path to the aar.
 * @param name - Scratch name, so successive aars do not overwrite each other.
 * @returns Byte total, or `null` when the aar is missing or unreadable.
 */
const aarClassBytes = function aarClassBytes(
	aar: string,
	_name: string
): number | null {
	if (!existsSync(aar)) {
		return null;
	}
	const work = scratchDir('android');
	const extracted = exec('unzip', ['-o', '-q', aar, 'classes.jar'], {
		cwd: work,
		timeoutMs: 60000,
	});
	if (extracted.error) {
		return null;
	}
	return jarClassBytes(join(work, 'classes.jar'));
};

/**
 * Sum the load-bearing sections `size -m` reports, skipping zerofill.
 *
 * @param sizeOutput - Raw `size -m` output for one architecture slice.
 * @returns Byte total, or `null` when no section parsed.
 */
const linkedSegmentBytes = function linkedSegmentBytes(
	sizeOutput: string
): number | null {
	let total = 0;
	let counted = 0;

	for (const match of sizeOutput.matchAll(
		/^\tSection \((?<segment>__(?:TEXT|DATA), [^)]+)\):\s+(?<bytes>\d+)(?<rest>.*)$/gmu
	)) {
		// `__DATA,__common` and friends are zerofill: no bytes in the file.
		if ((match.groups?.rest ?? '').includes('zerofill')) {
			continue;
		}
		total += Number(match.groups?.bytes ?? '0');
		counted += 1;
	}

	return counted > 0 ? total : null;
};

/**
 * Build the iOS slice and read the bytes it contributes to an app binary.
 *
 * @returns The measured delta, or the reason the row is empty.
 */
const measureIosBytes = function measureIosBytes(): BundleMetric {
	if (!existsSync(SWIFT_PACKAGE)) {
		return { reason: `no SwiftPM package at ${SWIFT_PACKAGE}`, value: null };
	}
	if (!existsSync(XCODE_DEVELOPER_DIR)) {
		return {
			reason: `Xcode is not at ${XCODE_DEVELOPER_DIR}, so no iOS slice can be built`,
			value: null,
		};
	}

	const derived = scratchDir('ios-derived-data');
	const built = exec(
		'xcodebuild',
		[
			'-scheme',
			'C15tCore',
			'-destination',
			'generic/platform=iOS Simulator',
			'-derivedDataPath',
			derived,
			'-configuration',
			'Release',
			'build',
		],
		{ cwd: SWIFT_PACKAGE, env: { DEVELOPER_DIR: XCODE_DEVELOPER_DIR } }
	);
	if (built.error) {
		return {
			reason: `the iOS slice did not build: ${built.error}`,
			value: null,
		};
	}

	const objectFile = join(
		derived,
		'Build',
		'Products',
		'Release-iphonesimulator',
		'C15tCore.o'
	);
	if (!existsSync(objectFile)) {
		return { reason: `the iOS build produced no ${objectFile}`, value: null };
	}

	const thin = join(scratchDir('ios'), 'C15tCore-arm64.o');
	const thinned = exec(
		'xcrun',
		['lipo', '-thin', 'arm64', objectFile, '-output', thin],
		{
			cwd: REPO_ROOT,
			env: { DEVELOPER_DIR: XCODE_DEVELOPER_DIR },
			timeoutMs: 120000,
		}
	);
	if (thinned.error) {
		return {
			reason: `could not extract the arm64 slice: ${thinned.error}`,
			value: null,
		};
	}

	const sized = exec('xcrun', ['size', '-m', thin], {
		cwd: REPO_ROOT,
		env: { DEVELOPER_DIR: XCODE_DEVELOPER_DIR },
		timeoutMs: 120000,
	});
	const bytes = linkedSegmentBytes(sized.stdout);
	if (bytes === null) {
		return { reason: `could not read section sizes from ${thin}`, value: null };
	}

	return {
		detail:
			'C15tCore only, arm64 simulator slice; the TurboModule binding is its own row',
		value: bytes,
	};
};

/**
 * Report the iOS binding's share.
 *
 * The binding compiles against React Native headers, which only exist after a
 * `pod install` in a host app. Building one per benchmark run would make the
 * number depend on a demo app, so the row stays unmeasured and says so.
 *
 * @returns The metric, always unmeasured until a project file exists.
 */
const measureIosBindingBytes = function measureIosBindingBytes(): BundleMetric {
	if (!existsSync(join(PACKAGE_DIR, 'ios'))) {
		return {
			reason: 'packages/react-native/ios does not exist yet',
			value: null,
		};
	}

	return {
		reason:
			'the binding compiles against React Native headers, which need a pod install in a host app; packages/react-native ships a podspec but no C15tReactNative.xcodeproj',
		value: null,
	};
};

/**
 * Build the Android artifacts and read their compiled class bytes.
 *
 * @returns The measured delta, or the reason the row is empty.
 */
const measureAndroidBytes = function measureAndroidBytes(): BundleMetric {
	const bridgeWrapper = join(ANDROID_BRIDGE, 'gradlew');
	const coreWrapper = join(ANDROID_CORE, 'gradlew');

	if (!existsSync(bridgeWrapper) || !existsSync(coreWrapper)) {
		return {
			reason: `no Gradle wrapper at ${bridgeWrapper} or ${coreWrapper}`,
			value: null,
		};
	}

	const core = exec(
		'./gradlew',
		[
			':c15t-core:jar',
			':c15t-android:assembleRelease',
			'--console=plain',
			'-q',
		],
		{
			cwd: ANDROID_CORE,
		}
	);
	if (core.error) {
		return {
			reason: `the Kotlin core did not build: ${core.error}`,
			value: null,
		};
	}

	const bridge = exec(
		'./gradlew',
		[':c15t-react-native:assembleRelease', '--console=plain', '-q'],
		{
			cwd: ANDROID_BRIDGE,
		}
	);
	if (bridge.error) {
		return {
			reason: `the Android bridge did not build: ${bridge.error}`,
			value: null,
		};
	}

	const pieces: [string, number | null][] = [
		[
			'core jar',
			jarClassBytes(
				join(ANDROID_CORE, 'c15t-core', 'build', 'libs', 'c15t-core.jar')
			),
		],
		[
			'android aar',
			aarClassBytes(
				join(
					ANDROID_CORE,
					'c15t-android',
					'build',
					'outputs',
					'aar',
					'c15t-android-release.aar'
				),
				'android-aar'
			),
		],
		[
			'bridge aar',
			aarClassBytes(
				join(
					ANDROID_BRIDGE,
					'c15t-react-native',
					'build',
					'outputs',
					'aar',
					'c15t-react-native-release.aar'
				),
				'bridge-aar'
			),
		],
	];

	let total = 0;
	const missing: string[] = [];
	for (const [label, bytes] of pieces) {
		if (bytes === null) {
			missing.push(label);
			continue;
		}
		total += bytes;
	}

	if (missing.length > 0) {
		return {
			reason: `no class bytes found for: ${missing.join(', ')}`,
			value: null,
		};
	}

	return {
		detail: 'core jar + android aar + bridge aar, uncompressed class bytes',
		value: total,
	};
};

/**
 * The JavaScript an app carries because it installed c15t.
 *
 * @param shippedModules - Module count of the package's own `dist`, for the detail.
 * @returns Raw and gzipped closure bytes, plus the module count.
 */
const measureJavaScriptClosure = function measureJavaScriptClosure(
	shippedModules: number
): { bytes: BundleMetric; gzip: BundleMetric; files: BundleMetric } {
	const empty: BundleMetric = { value: null };
	const entry = join(DIST_DIR, 'index.js');

	if (!existsSync(entry)) {
		const reason = `no built entry at ${entry}; run bun turbo run build --filter=@c15t/react-native`;
		return {
			bytes: { ...empty, reason },
			files: { ...empty, reason },
			gzip: { ...empty, reason },
		};
	}

	const closure = walkModuleClosure(entry, REPO_ROOT);

	if (closure.files.length === 0) {
		const reason = `walking ${entry} reached no module`;
		return {
			bytes: { ...empty, reason },
			files: { ...empty, reason },
			gzip: { ...empty, reason },
		};
	}

	const buffers = closure.files.map((file) => readFileSync(file));
	const concatenated = buffers.reduce(
		(all, part) => Buffer.concat([all, part]),
		Buffer.alloc(0)
	);

	const own = closure.files.filter((file) => file.startsWith(DIST_DIR)).length;
	const detail = [
		`${closure.files.length} modules from the entry`,
		`${own} from @c15t/react-native, ${closure.files.length - own} from other @c15t packages`,
	];
	if (closure.external.length > 0) {
		detail.push(`host imports not counted: ${closure.external.join(', ')}`);
	}
	if (closure.unresolved.length > 0) {
		detail.push(
			`${closure.unresolved.length} edge(s) did not resolve: ${closure.unresolved.slice(0, 3).join('; ')}`
		);
	}
	if (shippedModules === 0) {
		detail.push('the package itself shipped no JavaScript');
	}

	return {
		bytes: { detail: detail.join('; '), value: concatenated.byteLength },
		files: { detail: detail.join('; '), value: closure.files.length },
		gzip: {
			detail: detail.join('; '),
			value: gzipSync(concatenated).byteLength,
		},
	};
};

/**
 * Measure everything the package ships.
 *
 * @returns One metric per shipped-bytes row.
 */
export const measureBundle = function measureBundle(): BundleResult {
	const files = walkJs(DIST_DIR);

	let raw: BundleMetric;
	let gzip: BundleMetric;

	if (files.length === 0) {
		const reason = `no built JavaScript under ${DIST_DIR}; run bun turbo run build --filter=@c15t/react-native`;
		raw = { reason, value: null };
		gzip = { reason, value: null };
	} else {
		const concatenated = files
			.map((file) => readFileSync(file))
			.reduce((all, part) => Buffer.concat([all, part]), Buffer.alloc(0));
		raw = { detail: `${files.length} modules`, value: concatenated.byteLength };
		gzip = {
			detail: `${files.length} modules`,
			value: gzipSync(concatenated).byteLength,
		};
	}

	let manifestErrors = 0;
	try {
		JSON.parse(
			readFileSync(join(PACKAGE_DIR, 'package.json'), 'utf8')
		) as unknown;
	} catch {
		manifestErrors = 1;
	}

	const jsxFiles = findMissingReactImports();
	const closure = measureJavaScriptClosure(files.length);

	return {
		androidBinaryBytes: measureAndroidBytes(),
		iosBinaryBytes: measureIosBytes(),
		iosBindingBytes: measureIosBindingBytes(),
		jsClosureBytes: closure.bytes,
		jsClosureFiles: closure.files,
		jsClosureGzipBytes: closure.gzip,
		jsShippedBytes: raw,
		jsShippedGzipBytes: gzip,
		jsxGlobalReferenceFiles: {
			detail:
				jsxFiles.length === 0
					? 'none'
					: jsxFiles.map((file) => file.replace(`${DIST_DIR}/`, '')).join(', '),
			value: jsxFiles.length,
		},
		packageManifestParseErrors: {
			detail:
				manifestErrors === 0
					? 'parses'
					: `${PACKAGE_DIR}/package.json is not valid JSON`,
			value: manifestErrors,
		},
	};
};
