import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

import { z } from 'zod';

import { CliError } from '../core/errors';
import type { ErrorCode } from '../core/errors';

/** Options for the standalone Inth executable adapter. */
export interface InthOptions {
	cwd?: string;
	interactive?: boolean;
	signal?: AbortSignal;
}

/** Host facts that decide whether a native Inth executable exists. @internal */
export interface InthHost {
	arch: string;
	/** True for Linux distributions built on musl libc, such as Alpine. */
	isMusl: boolean;
	platform: NodeJS.Platform;
}

/** Platforms with an `@inth/cli-<platform>-<arch>` package in @inth/cli 0.0.4. */
const SUPPORTED_TARGETS = [
	'darwin-arm64',
	'linux-arm64',
	'linux-x64',
	'win32-x64',
] as const;
const SUPPORTED_LABEL = 'macOS arm64, Linux arm64/x64 (glibc) and Windows x64';
const PLATFORM_LABELS: Partial<Record<NodeJS.Platform, string>> = {
	darwin: 'macOS',
	linux: 'Linux',
	win32: 'Windows',
};

const isMuslLinux = (): boolean => {
	if (process.platform !== 'linux') {
		return false;
	}
	try {
		const report = process.report?.getReport() as
			| { header?: { glibcVersionRuntime?: string } }
			| undefined;
		return !report?.header?.glibcVersionRuntime;
	} catch {
		return false;
	}
};

let currentHost: InthHost | undefined;
const detectHost = (): InthHost => {
	currentHost ??= {
		arch: process.arch,
		isMusl: isMuslLinux(),
		platform: process.platform,
	};
	return currentHost;
};

const describeHost = (host: InthHost): string =>
	`${PLATFORM_LABELS[host.platform] ?? host.platform} ${host.arch}${host.isMusl ? ' (musl)' : ''}`;

const defaultResolve = (specifier: string): string => {
	const require = createRequire(import.meta.url);
	return createRequire(require.resolve('@inth/cli/package.json')).resolve(
		specifier
	);
};

/**
 * Resolve the native binary shipped by our pinned Inth dependency.
 * @param host Platform facts; defaults to the running process.
 * @param resolve Module resolver; defaults to resolving from `@inth/cli`.
 * @returns Absolute path of an executable Inth binary.
 * @throws {CliError} INTH_UNSUPPORTED_PLATFORM when Inth ships no binary for
 * this platform, or INTH_UNAVAILABLE when the binary is missing or packed.
 * @internal
 */
export const resolveInthExecutable = (
	host: InthHost = detectHost(),
	resolve: (specifier: string) => string = defaultResolve
): string => {
	const target = `${host.platform}-${host.arch}`;
	if (
		host.isMusl ||
		!(SUPPORTED_TARGETS as readonly string[]).includes(target)
	) {
		throw new CliError('INTH_UNSUPPORTED_PLATFORM', {
			details: `Inth has no native executable for ${describeHost(host)}. It supports ${SUPPORTED_LABEL}.`,
			platform: target,
		});
	}
	const packageName = `@inth/cli-${target}`;
	let executable: string;
	try {
		executable = resolve(
			`${packageName}/bin/${host.platform === 'win32' ? 'inth.exe' : 'inth'}`
		);
	} catch {
		throw new CliError('INTH_UNAVAILABLE', {
			details: `${packageName} is not installed. Reinstall @c15t/cli with optional dependencies enabled (no --no-optional or --omit=optional).`,
			platform: target,
		});
	}
	if (/\.zip[\\/]/u.test(executable)) {
		throw new CliError('INTH_UNAVAILABLE', {
			details: `Yarn Plug'n'Play keeps ${packageName} inside a zip archive, which cannot be executed. Add "dependenciesMeta": { "${packageName}": { "unplugged": true } } to package.json, or set nodeLinker: node-modules, then reinstall.`,
			platform: target,
		});
	}
	return executable;
};

/** Executable resolution port for standalone integration tests. @internal */
export interface InthRuntime {
	resolveExecutable: () => string;
}
/** Default runtime uses the native executable from the installed dependency. @internal */
export const inthRuntime: InthRuntime = {
	resolveExecutable: () => resolveInthExecutable(),
};

/**
 * Inth guidance names its own commands. c15t forwards the environment, so
 * INTH_TOKEN advice stays; command advice is rewritten to c15t equivalents.
 */
const GUIDANCE_REWRITES: [RegExp, string][] = [
	[/inth login --complete(?: --wait)?(?: --json)?/gu, 'c15t login --complete'],
	[
		/inth (?:login|signup) --email <email>(?: --scopes \S+)?(?: --json)?/gu,
		'c15t login --email <email>',
	],
	[
		/inth auth start --email <email>(?: --yes)?/gu,
		'c15t login --email <email>',
	],
	[/inth auth retry(?: --json)?/gu, 'c15t login --email <email>'],
	[/inth logout(?: --auth agent)?(?: --json)?/gu, 'c15t logout'],
	[/inth whoami(?: --json)?/gu, 'c15t status'],
	[/`?inth login`?/gu, 'c15t login'],
	[/auth\.md sign-in/gu, 'email sign-in'],
];

/**
 * Rewrite Inth command guidance to the matching c15t commands.
 * @param message Message produced by Inth.
 * @returns The message with known `inth …` commands replaced.
 * @internal
 */
export const toC15tGuidance = (message: string): string =>
	GUIDANCE_REWRITES.reduce(
		(text, [pattern, replacement]) => text.replace(pattern, replacement),
		message
	);

const INTH_ERROR_CODES: Partial<Record<string, ErrorCode>> = {
	approval_timeout: 'DEVICE_FLOW_PENDING',
	authentication_expired: 'AUTH_EXPIRED',
	authentication_required: 'AUTH_NOT_LOGGED_IN',
	cancelled: 'CANCELLED',
	claim_uncertain: 'AUTH_FAILED',
	interaction_required: 'INPUT_REQUIRED',
};

const errorEnvelope = z.object({
	error: z.object({
		code: z.string(),
		message: z.string(),
		requestId: z.string().nullish(),
	}),
	ok: z.literal(false),
	schemaVersion: z.literal(2),
});
const successEnvelope = z.object({
	data: z.unknown(),
	ok: z.literal(true),
	schemaVersion: z.literal(2),
});

const decodeResult = (output: string, code: number | null): unknown => {
	let value: unknown;
	try {
		value = JSON.parse(output);
	} catch {
		throw new CliError('API_ERROR', { details: 'Inth returned invalid JSON.' });
	}
	const failure = errorEnvelope.safeParse(value);
	if (failure.success) {
		const { code: inthCode, message, requestId } = failure.data.error;
		const details = toC15tGuidance(message);
		const context: Record<string, unknown> = { details, inthCode };
		if (requestId) {
			context.details = `${details} (request ID: ${requestId})`;
			context.requestId = requestId;
		}
		throw new CliError(INTH_ERROR_CODES[inthCode] ?? 'API_ERROR', context);
	}
	const result = successEnvelope.safeParse(value);
	if (code !== 0 || !result.success) {
		throw new CliError('API_ERROR', {
			details: 'Inth returned an invalid result.',
		});
	}
	return result.data.data;
};

/**
 * Execute pinned Inth without a shell or access to its credential store.
 * @param args Inth command and arguments. Do not pass credentials in arguments.
 * @param options Application cwd, terminal mode, and cancellation from the caller.
 * @returns Inth's JSON data, or null after a successful interactive session.
 * @throws {CliError} On invalid output, command failure, or cancellation.
 * @internal
 */
export const runInth = async (
	args: string[],
	options: InthOptions = {}
): Promise<unknown> => {
	if (options.signal?.aborted) {
		throw new CliError('CANCELLED');
	}
	const executable = inthRuntime.resolveExecutable();
	const controller = new AbortController();
	const signal = options.signal ?? controller.signal;
	const cancel = () => {
		controller.abort();
	};
	if (!options.signal) {
		process.on('SIGINT', cancel);
		process.on('SIGTERM', cancel);
	}
	try {
		const child = spawn(
			executable,
			[...args, ...(options.interactive ? [] : ['--json'])],
			{
				cwd: options.cwd ?? process.cwd(),
				stdio: options.interactive ? 'inherit' : ['ignore', 'pipe', 2],
			}
		);
		let output = '';
		let oversized = false;
		child.stdout?.setEncoding('utf8');
		child.stdout?.on('data', (chunk: string) => {
			if (output.length + chunk.length > 4_000_000) {
				oversized = true;
				child.kill('SIGTERM');
			} else {
				output += chunk;
			}
		});
		const abort = () => {
			child.kill('SIGTERM');
		};
		signal.addEventListener('abort', abort, { once: true });
		if (signal.aborted) {
			abort();
		}
		try {
			const [code, exitSignal] = await new Promise<
				[number | null, NodeJS.Signals | null]
			>((resolve, reject) => {
				child.once('error', (error: NodeJS.ErrnoException) =>
					reject(
						new CliError('INTH_UNAVAILABLE', {
							details: `Could not start the Inth executable at ${executable}${error.code ? ` (${error.code})` : ''}.`,
						})
					)
				);
				child.once('close', (exitCode, killSignal) =>
					resolve([exitCode, killSignal])
				);
			});
			if (oversized) {
				throw new CliError('API_ERROR', {
					details: 'Inth output exceeded the supported size.',
				});
			}
			// Only our own abort or Inth's handled cancellation count as cancelled.
			if (signal.aborted || code === 130) {
				throw new CliError('CANCELLED');
			}
			if (code === null) {
				throw new CliError('INTH_CRASHED', {
					details: `Inth stopped after receiving ${exitSignal ?? 'an unknown signal'}.`,
					signal: exitSignal,
				});
			}

			if (options.interactive) {
				if (code !== 0) {
					throw new CliError('API_ERROR', {
						details: `Inth exited with code ${code}.`,
					});
				}
				return null;
			}
			return decodeResult(output, code);
		} finally {
			signal.removeEventListener('abort', abort);
		}
	} finally {
		if (!options.signal) {
			process.off('SIGINT', cancel);
			process.off('SIGTERM', cancel);
		}
	}
};
