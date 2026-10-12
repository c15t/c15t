/**
 * Run one of this package's support subjects in its own Node process.
 *
 * Two measurements need a process of their own: the quiet window, where a shared
 * process would hide the cost it is measuring, and the cold start, where a warm
 * process is the thing being excluded. Both need the same loader so `react-native`
 * resolves to the bench stub, and both report over stdout as one JSON object.
 *
 * Bun is deliberately not the runner. It skips tsconfig `paths` for specifiers
 * reached from inside `node_modules`, which lands the child on the real
 * `react-native` entry file. That file is Flow-typed and Bun cannot parse it, so
 * the row would carry a parser error instead of a number.
 */

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/** The package directory, so a child resolves the same workspace as the parent. */
export const PACKAGE_DIR = resolve(HERE, '..', '..');

const require = createRequire(import.meta.url);

/**
 * Locate the tsx loader, so a child strips TypeScript the same way the parent does
 * and honours the same `tsconfig.json` path aliases.
 *
 * @returns An `--import` argument, or `undefined` when tsx is not installed.
 */
const tsxImport = function tsxImport(): string | undefined {
	try {
		return require.resolve('tsx');
	} catch {
		return undefined;
	}
};

/** What a child produced: its report, or the reason it produced nothing. */
export interface SubjectOutcome<ReportType> {
	report?: ReportType;
	reason?: string;
}

/**
 * Spawn one subject and read the JSON it prints.
 *
 * @param options.name - Subject file under `src/support`, without the extension.
 * @param options.args - Positional arguments, passed as strings.
 * @param options.timeoutMs - Kill the child after this long.
 * @returns The parsed report, or a reason a row can carry.
 */
export const spawnSubject = function spawnSubject<ReportType>({
	args = [],
	name,
	timeoutMs = 180_000,
}: {
	args?: string[];
	name: string;
	timeoutMs?: number;
}): SubjectOutcome<ReportType> {
	const loader = tsxImport();

	if (loader === undefined) {
		return {
			reason:
				'tsx is not resolvable from this package, so the child has no runner',
		};
	}

	const subject = resolve(HERE, `${name}.ts`);
	const child = spawnSync(
		process.execPath,
		['--import', loader, subject, ...args],
		{
			cwd: PACKAGE_DIR,
			encoding: 'utf8',
			env: {
				...process.env,
				TSX_TSCONFIG_PATH: resolve(PACKAGE_DIR, 'tsconfig.json'),
			},
			maxBuffer: 8 * 1024 * 1024,
			timeout: timeoutMs,
		}
	);

	if (child.error) {
		return {
			reason: `the ${name} process could not start: ${child.error.message}`,
		};
	}

	if (child.status !== 0) {
		return {
			reason: `the ${name} process exited ${String(child.status)}: ${(child.stderr ?? '').slice(0, 400)}`,
		};
	}

	try {
		return { report: JSON.parse(String(child.stdout)) as ReportType };
	} catch {
		return {
			reason: `the ${name} process did not report JSON: ${String(child.stdout).slice(0, 200)}`,
		};
	}
};
