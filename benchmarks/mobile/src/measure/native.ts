/**
 * Numbers out of the two native benches.
 *
 * `native/CONTRACT.md` budgets the native kernels, and both already ship a bench
 * program: `swift run -c release C15tCoreBench` and
 * `./gradlew :c15t-core:bench`. This module runs them and lifts the medians out
 * of their output. It deliberately does not patch either bench: the harness reads
 * the program the contract's own workers maintain, so a row here cannot drift
 * from what a maintainer reproduces by hand.
 *
 * Every row carries a reason when it has no number. A missing simulator or a
 * missing JDK produces `not-measured`, never a zero.
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Repository root. */
export const REPO_ROOT = resolve(HERE, '..', '..', '..', '..');

/** Xcode location. The machine's `xcode-select` points at Command Line Tools, whose SwiftPM is broken. */
const XCODE_DEVELOPER_DIR = '/Applications/Xcode.app/Contents/Developer';

/** One measured native number. */
export interface NativeMetric {
	value: number;
	samples: number;
	detail?: string;
}

export interface NativeBenchResult {
	platform: 'swift-core' | 'kotlin-core';
	metrics: Record<string, NativeMetric>;
	notes: string[];
	/** Set when the platform could not be measured at all. */
	unavailable?: string;
	stdout: string;
}

const run = function run(
	command: string,
	args: string[],
	options: { cwd: string; env?: NodeJS.ProcessEnv; timeoutMs: number }
): { stdout: string; error?: string } {
	try {
		const stdout = execFileSync(command, args, {
			cwd: options.cwd,
			encoding: 'utf8',
			env: { ...process.env, ...options.env },
			maxBuffer: 32 * 1024 * 1024,
			stdio: ['ignore', 'pipe', 'pipe'],
			timeout: options.timeoutMs,
		});
		return { stdout };
	} catch (error) {
		const failure = error as {
			message?: string;
			stdout?: string;
			status?: number;
		};
		return {
			error: failure.message ?? String(error),
			stdout: failure.stdout ?? '',
		};
	}
};

const number = function number(text: string | undefined): number | null {
	if (text === undefined) {
		return null;
	}
	const parsed = Number(text.replace(/[, ]/gu, ''));
	return Number.isFinite(parsed) ? parsed : null;
};

/** Bench label to harness row id, for Swift. */
const SWIFT_LABELS: Record<string, string> = {
	'bootstrap + hydrate, stored envelope': 'native_hydrate_envelope_us',
	'cold (first touch this process)': 'native_bootstrap_cold_us',
	'evaluate, 4 categories + receipts': 'native_policy_evaluation_us',
	'isAllowed(.marketing)': 'native_is_allowed_us',
	'read 10 queued bodies': 'native_queue_replay_us',
	'save(.all), in-memory store': 'native_commit_ack_us',
	'save(.custom), FileStore + dead transport': 'native_commit_ack_disk_us',
	'snapshot()': 'native_snapshot_read_us',
	'warm (repeat hydrate)': 'native_bootstrap_warm_us',
};

/**
 * Parse `C15tCoreBench` output.
 *
 * @param stdout - Raw standard output.
 * @returns Metrics keyed by the harness row id.
 */
export const parseSwiftBench = function parseSwiftBench(
	stdout: string
): Record<string, NativeMetric> {
	const metrics: Record<string, NativeMetric> = {};

	const envelopeBytes = /^stored envelope: (?<bytes>\d+) bytes$/gmu.exec(stdout)
		?.groups?.bytes;

	// "<label> n=<count> mean <unit>=<x>  p50=<x>  p95=<x>  max=<x>"
	const linePattern =
		/^(?<label>.*?)\s+n=(?<n>\d+)\s+mean\s+\S+=\s*(?<mean>-?[\d.]+)\s+p50=\s*(?<p50>-?[\d.]+)\s+p95=\s*(?<p95>-?[\d.]+)\s+max=\s*(?<max>-?[\d.]+)/gmu;

	for (const match of stdout.matchAll(linePattern)) {
		const groups = match.groups ?? {};
		const label = (groups.label ?? '').trim();
		const p50 = number(groups.p50);
		if (p50 === null) {
			continue;
		}

		const id = SWIFT_LABELS[label];
		if (!id) {
			continue;
		}

		metrics[id] = {
			detail: envelopeBytes ? `bench envelope ${envelopeBytes} B` : undefined,
			samples: Number(groups.n ?? '0'),
			value: p50,
		};
	}

	return metrics;
};

/** Bench label to harness row id, for Kotlin. */
const KOTLIN_LABELS: Record<string, string> = {
	'hydrate from store': 'native_hydrate_envelope_us',
	'policy evaluation': 'native_policy_evaluation_us',
	'save-acknowledge-without-network': 'native_commit_ack_us',
	'snapshot() + 3 x isAllowed()': 'native_snapshot_read_us',
};

/**
 * Parse `:c15t-core:bench` output.
 *
 * @param stdout - Raw standard output.
 * @returns Metrics keyed by the harness row id.
 */
export const parseKotlinBench = function parseKotlinBench(
	stdout: string
): Record<string, NativeMetric> {
	const metrics: Record<string, NativeMetric> = {};
	const lines = stdout.split('\n');
	const samples = Number(/measured=(?<n>\d+)/u.exec(stdout)?.groups?.n ?? '0');

	for (let index = 0; index < lines.length; index += 1) {
		const name = (lines[index] ?? '').trim();
		const id = KOTLIN_LABELS[name];
		if (!id) {
			continue;
		}

		const sample = lines[index + 1] ?? '';
		const median = number(
			/median=(?<value>-?[\d.]+)/u.exec(sample)?.groups?.value
		);
		if (median === null) {
			continue;
		}

		const identity = /identity stable: (?<value>true|false)/u.exec(sample)
			?.groups?.value;
		const envelope = /envelope is (?<bytes>\d+) bytes/u.exec(sample)?.groups
			?.bytes;

		metrics[id] = {
			detail: envelope ? `bench envelope ${envelope} B` : undefined,
			samples,
			value: median,
		};

		if (identity !== undefined) {
			metrics.native_snapshot_identities = {
				detail: `object identity held across repeated reads: ${identity}`,
				samples,
				value: identity === 'true' ? 1 : 2,
			};
		}
	}

	return metrics;
};

/**
 * Run the Swift core bench.
 *
 * @param timeoutMs - Hard limit, so a hung toolchain reports instead of hanging.
 * @returns The measured metrics, or `unavailable` with the reason.
 */
export const runSwiftBench = function runSwiftBench(
	timeoutMs: number
): NativeBenchResult {
	const packagePath = resolve(REPO_ROOT, 'native', 'core-swift');
	const base: NativeBenchResult = {
		metrics: {},
		notes: [],
		platform: 'swift-core',
		stdout: '',
	};

	if (!existsSync(packagePath)) {
		return { ...base, unavailable: `no SwiftPM package at ${packagePath}` };
	}
	if (!existsSync(XCODE_DEVELOPER_DIR)) {
		return { ...base, unavailable: `Xcode is not at ${XCODE_DEVELOPER_DIR}` };
	}

	const built = run('xcrun', ['swift', 'build', '-c', 'release'], {
		cwd: packagePath,
		env: { DEVELOPER_DIR: XCODE_DEVELOPER_DIR },
		timeoutMs,
	});
	if (built.error) {
		return { ...base, unavailable: `swift build failed: ${built.error}` };
	}

	const ran = run('xcrun', ['swift', 'run', '-c', 'release', 'C15tCoreBench'], {
		cwd: packagePath,
		env: { DEVELOPER_DIR: XCODE_DEVELOPER_DIR },
		timeoutMs,
	});
	if (ran.error) {
		return {
			...base,
			unavailable: `C15tCoreBench exited non-zero: ${ran.error}`,
		};
	}

	return {
		metrics: parseSwiftBench(ran.stdout),
		notes: [],
		platform: 'swift-core',
		stdout: ran.stdout,
	};
};

/**
 * Run the Kotlin core bench on a plain JVM.
 *
 * @param timeoutMs - Hard limit.
 * @returns The measured metrics, or `unavailable` with the reason.
 */
export const runKotlinBench = function runKotlinBench(
	timeoutMs: number
): NativeBenchResult {
	const projectPath = resolve(REPO_ROOT, 'native', 'core-android');
	const wrapper = resolve(projectPath, 'gradlew');
	const base: NativeBenchResult = {
		metrics: {},
		notes: [],
		platform: 'kotlin-core',
		stdout: '',
	};

	if (!existsSync(wrapper)) {
		return { ...base, unavailable: `no Gradle wrapper at ${wrapper}` };
	}

	const ran = run(
		'./gradlew',
		[':c15t-core:bench', '--console=plain', '-q', '--offline'],
		{
			cwd: projectPath,
			timeoutMs,
		}
	);
	if (ran.error) {
		return {
			...base,
			unavailable: `:c15t-core:bench exited non-zero: ${ran.error}`,
		};
	}

	return {
		metrics: parseKotlinBench(ran.stdout),
		notes: [],
		platform: 'kotlin-core',
		stdout: ran.stdout,
	};
};
