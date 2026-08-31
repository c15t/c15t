#!/usr/bin/env bun
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

interface DeferredPromise<Value> {
	promise: Promise<Value>;
	resolve: (value: Value | PromiseLike<Value>) => void;
	reject: (reason?: unknown) => void;
}

type PromiseWithResolversConstructor = PromiseConstructor & {
	withResolvers: <Value>() => DeferredPromise<Value>;
};

function createDeferredPromise<Value>(
	run: (
		resolve: DeferredPromise<Value>['resolve'],
		reject: DeferredPromise<Value>['reject']
	) => void
): Promise<Value> {
	const deferred = (
		Promise as PromiseWithResolversConstructor
	).withResolvers<Value>();
	run(deferred.resolve, deferred.reject);
	return deferred.promise;
}

function createVoidDeferredPromise(
	run: (
		resolve: () => void,
		reject: DeferredPromise<undefined>['reject']
	) => void
): Promise<void> {
	const deferred = (
		Promise as PromiseWithResolversConstructor
	).withResolvers<undefined>();
	run(() => deferred.resolve(undefined), deferred.reject);
	return deferred.promise;
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

interface Options {
	iterations?: string;
	warmupIterations?: string;
	scriptCounts?: string;
	help: boolean;
}

interface BenchJob {
	name: string;
	cwd: string;
	args: string[];
	env: NodeJS.ProcessEnv;
}

function readValue(
	args: string[],
	index: number,
	name: string
): { value: string; nextIndex: number } {
	const inlinePrefix = `${name}=`;
	const arg = args[index];
	if (arg.startsWith(inlinePrefix)) {
		return { value: arg.slice(inlinePrefix.length), nextIndex: index };
	}
	const value = args[index + 1];
	if (!value || value.startsWith('-')) {
		throw new Error(`Missing value for ${name}`);
	}
	return { value, nextIndex: index + 1 };
}

function assertPositiveInteger(value: string, label: string) {
	if (!/^[1-9]\d*$/u.test(value)) {
		throw new Error(`${label} must be a positive integer`);
	}
}

function assertCounts(value: string) {
	const counts = value.split(',').map((count) => count.trim());
	if (
		counts.length === 0 ||
		counts.some((count) => !/^[1-9]\d*$/u.test(count))
	) {
		throw new Error(
			'--script-counts must be a comma-separated list of integers'
		);
	}
}

function parseArgs(args: string[]): Options {
	const options: Options = { help: false };

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];

		if (arg === '--help' || arg === '-h') {
			options.help = true;
			continue;
		}

		if (
			arg === '--iterations' ||
			arg === '-i' ||
			arg.startsWith('--iterations=')
		) {
			const { value, nextIndex } = readValue(args, index, '--iterations');
			assertPositiveInteger(value, '--iterations');
			options.iterations = value;
			index = nextIndex;
			continue;
		}

		if (arg === '--warmup' || arg.startsWith('--warmup=')) {
			const { value, nextIndex } = readValue(args, index, '--warmup');
			assertPositiveInteger(value, '--warmup');
			options.warmupIterations = value;
			index = nextIndex;
			continue;
		}

		if (arg === '--script-counts' || arg.startsWith('--script-counts=')) {
			const { value, nextIndex } = readValue(args, index, '--script-counts');
			assertCounts(value);
			options.scriptCounts = value;
			index = nextIndex;
			continue;
		}

		throw new Error(`Unknown argument: ${arg}`);
	}

	return options;
}

function printHelp() {
	console.log(`Run the important React v2/v3 browser benchmarks in parallel.

Usage:
  bun run bench:important-react -- --iterations 10
  bun run bench:important-react -- -i 10 --warmup 1 --script-counts 5,10,25,50

Options:
  -i, --iterations <n>       Samples collected per metric.
      --warmup <n>           Warmup samples before measurement.
      --script-counts <list> Script-count cases, for example 5,10,25,50.
  -h, --help                 Show this help.
`);
}

function prefixOutput(name: string, stream: NodeJS.ReadableStream) {
	let buffer = '';

	stream.on('data', (chunk) => {
		buffer += String(chunk);
		const lines = buffer.split(/\r?\n/u);
		buffer = lines.pop() ?? '';
		for (const line of lines) {
			if (line.length > 0) {
				console.log(`[${name}] ${line}`);
			}
		}
	});

	stream.on('end', () => {
		if (buffer.length > 0) {
			console.log(`[${name}] ${buffer}`);
			buffer = '';
		}
	});
}

function runJob(job: BenchJob, children: Set<ChildProcess>) {
	return createVoidDeferredPromise((resolvePromise, rejectPromise) => {
		const child = spawn('bun', job.args, {
			cwd: job.cwd,
			env: job.env,
			stdio: ['ignore', 'pipe', 'pipe'],
		});

		children.add(child);
		prefixOutput(job.name, child.stdout);
		prefixOutput(job.name, child.stderr);

		child.on('error', (error) => {
			children.delete(child);
			rejectPromise(error);
		});

		child.on('exit', (code, signal) => {
			children.delete(child);
			if (code === 0) {
				resolvePromise();
				return;
			}
			rejectPromise(
				new Error(
					`${job.name} benchmark failed${
						signal
							? ` with signal ${signal}`
							: ` with exit code ${code ?? 'unknown'}`
					}`
				)
			);
		});
	});
}

function stopChildren(children: Set<ChildProcess>) {
	for (const child of children) {
		if (child.exitCode === null && child.signalCode === null) {
			child.kill('SIGTERM');
		}
	}
}

async function run() {
	const options = parseArgs(process.argv.slice(2));
	if (options.help) {
		printHelp();
		return;
	}

	const sharedEnv = {
		...process.env,
		...(options.iterations
			? { BENCH_ITERATIONS: options.iterations }
			: undefined),
		...(options.warmupIterations
			? { BENCH_WARMUP_ITERATIONS: options.warmupIterations }
			: undefined),
	};

	const jobs: BenchJob[] = [
		{
			name: 'banner',
			cwd: resolve(repoRoot, 'benchmarks/react-browser-bench'),
			args: ['run', 'bench:banner-visibility'],
			env: sharedEnv,
		},
		{
			name: 'scripts',
			cwd: resolve(repoRoot, 'benchmarks/script-lifecycle-bench'),
			args: ['run', 'bench:script-count'],
			env: {
				...sharedEnv,
				...(options.scriptCounts
					? { SCRIPT_COUNTS: options.scriptCounts }
					: undefined),
			},
		},
	];

	console.log('Running important React benchmarks in parallel...');
	if (options.iterations) {
		console.log(`Iterations: ${options.iterations}`);
	}
	if (options.warmupIterations) {
		console.log(`Warmup iterations: ${options.warmupIterations}`);
	}
	if (options.scriptCounts) {
		console.log(`Script counts: ${options.scriptCounts}`);
	}
	console.log('');

	const children = new Set<ChildProcess>();
	const stop = () => stopChildren(children);
	process.once('SIGINT', stop);
	process.once('SIGTERM', stop);

	try {
		await Promise.all(jobs.map((job) => runJob(job, children)));
		console.log('\nImportant React benchmarks completed.');
	} catch (error) {
		stopChildren(children);
		throw error;
	} finally {
		process.off('SIGINT', stop);
		process.off('SIGTERM', stop);
	}
}

try {
	await run();
} catch (error) {
	console.error(error);
	process.exit(1);
}
