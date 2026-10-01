import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

import { z } from 'zod';

import { CliError } from '../core/errors';

/** Options for the standalone Inth executable adapter. */
export interface InthOptions {
	cwd?: string;
	interactive?: boolean;
	signal?: AbortSignal;
}

/** Resolve the native binary shipped by our pinned Inth dependency. @internal */
export const resolveInthExecutable = (): string => {
	try {
		const require = createRequire(import.meta.url);
		const inthRequire = createRequire(
			require.resolve('@inth/cli/package.json')
		);
		const executable = process.platform === 'win32' ? 'inth.exe' : 'inth';
		return inthRequire.resolve(
			`@inth/cli-${process.platform}-${process.arch}/bin/${executable}`
		);
	} catch {
		throw new CliError('INSTALL_FAILED', {
			details:
				'The Inth native executable is unavailable. Reinstall @c15t/cli with optional dependencies enabled. Inth supports macOS arm64, Linux arm64/x64, and Windows x64.',
		});
	}
};

/** Executable resolution port for standalone integration tests. @internal */
export interface InthRuntime {
	resolveExecutable: () => string;
}
/** Default runtime uses the native executable from the installed dependency. @internal */
export const inthRuntime: InthRuntime = {
	resolveExecutable: resolveInthExecutable,
};

const errorEnvelope = z.object({
	error: z.object({ code: z.string(), message: z.string() }),
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
		const { code: errorCode, message } = failure.data.error;
		if (errorCode === 'authentication_required') {
			throw new CliError('AUTH_NOT_LOGGED_IN');
		}
		if (errorCode === 'interaction_required') {
			throw new CliError('INPUT_REQUIRED', { details: message });
		}
		if (errorCode === 'cancelled') {
			throw new CliError('CANCELLED');
		}
		throw new CliError('API_ERROR', { details: message });
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
 */
export const runInth = async (
	args: string[],
	options: InthOptions = {}
): Promise<unknown> => {
	if (options.signal?.aborted) {
		throw new CliError('CANCELLED');
	}
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
			inthRuntime.resolveExecutable(),
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
			const code = await new Promise<number | null>((resolve, reject) => {
				child.once('error', () =>
					reject(
						new CliError('INSTALL_FAILED', {
							details: 'Could not start the installed Inth executable.',
						})
					)
				);
				child.once('close', resolve);
			});
			if (oversized) {
				throw new CliError('API_ERROR', {
					details: 'Inth output exceeded the supported size.',
				});
			}
			if (signal.aborted || code === null || code === 130) {
				throw new CliError('CANCELLED');
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
