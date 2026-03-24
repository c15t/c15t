import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { benchmarkConsentOptions } from './fixtures';

type BundleResult = {
	entry: string;
	cssBytes: number;
	cssGzipBytes: number;
	jsBytes: number;
	jsGzipBytes: number;
	totalBytes: number;
	totalGzipBytes: number;
};

const BASELINE_REF = 'origin/2.0.0';
const BASELINE_ENTRY = '2.0.0-consent-surfaces';
const CURRENT_ENTRY = 'current-consent-surfaces';
const WORKTREE_DIR = resolve(tmpdir(), 'c15t-bundle-bench-2.0.0');
const OUTPUT_ROOT = resolve(tmpdir(), 'c15t-bundle-bench-output');
const APP_DIR = process.cwd();
const REPO_ROOT = resolve(APP_DIR, '..', '..');

function run(command: string[], cwd = process.cwd()) {
	const result = Bun.spawnSync(command, {
		cwd,
		stderr: 'pipe',
		stdout: 'pipe',
	});

	if (result.exitCode !== 0) {
		const stdout = result.stdout.toString();
		const stderr = result.stderr.toString();
		throw new Error(
			[`Command failed: ${command.join(' ')}`, stdout, stderr]
				.filter(Boolean)
				.join('\n')
		);
	}

	return result.stdout.toString();
}

function serializeOptions(options: typeof benchmarkConsentOptions) {
	return JSON.stringify(options, null, 2).replaceAll('</', '<\\/');
}

function createHistoricalEntrySource() {
	const options = serializeOptions(benchmarkConsentOptions);

	return `import {
	ConsentBanner,
	ConsentDialog,
	ConsentManagerProvider,
} from '../packages/react/src/index';
import { createElement } from 'react';

const benchmarkConsentOptions = ${options};

export function HistoricalConsentSurfaces() {
	return (
		<ConsentManagerProvider options={benchmarkConsentOptions}>
			<ConsentBanner />
			<ConsentDialog />
		</ConsentManagerProvider>
	);
}

export default createElement(HistoricalConsentSurfaces);
`;
}

function createBuildScript(entryFile: string, outdir: string) {
	return `
		import { gzipSync } from 'node:zlib';

		const result = await Bun.build({
			entrypoints: [${JSON.stringify(entryFile)}],
			minify: true,
			outdir: ${JSON.stringify(outdir)},
			target: 'browser',
		});

		if (!result.success || result.outputs.length === 0) {
			console.error(JSON.stringify(result.logs, null, 2));
			process.exit(1);
		}

		const summary = {
			cssBytes: 0,
			cssGzipBytes: 0,
			jsBytes: 0,
			jsGzipBytes: 0,
		};

		for (const output of result.outputs) {
			if (
				output.path.endsWith('.map') ||
				(!output.path.endsWith('.js') && !output.path.endsWith('.css'))
			) {
				continue;
			}

			const bytes = Buffer.from(await output.arrayBuffer());
			const gzipBytes = gzipSync(bytes).byteLength;

			if (output.path.endsWith('.js')) {
				summary.jsBytes += bytes.byteLength;
				summary.jsGzipBytes += gzipBytes;
			}

			if (output.path.endsWith('.css')) {
				summary.cssBytes += bytes.byteLength;
				summary.cssGzipBytes += gzipBytes;
			}
		}

		console.log(JSON.stringify(summary));
	`;
}

function ensureBaselineWorktree() {
	if (existsSync(resolve(WORKTREE_DIR, '.git'))) {
		return;
	}

	rmSync(WORKTREE_DIR, { force: true, recursive: true });
	run(['git', 'worktree', 'add', '--detach', WORKTREE_DIR, BASELINE_REF]);
}

function ensureBaselineInstall() {
	const nodeModulesDir = resolve(WORKTREE_DIR, 'node_modules');
	const hasCoreWorkspace = existsSync(resolve(nodeModulesDir, 'c15t'));
	const hasUiWorkspace = existsSync(resolve(nodeModulesDir, '@c15t', 'ui'));

	if (existsSync(nodeModulesDir) && hasCoreWorkspace && hasUiWorkspace) {
		return;
	}

	rmSync(nodeModulesDir, { force: true, recursive: true });
	run(
		['bun', 'install', '--frozen-lockfile', '--ignore-scripts'],
		WORKTREE_DIR
	);
}

function ensureUiBuild(cwd: string) {
	run(['bunx', 'rslib', 'build', '--no-dts'], resolve(cwd, 'packages/ui'));
}

function linkWorkspacePackage({
	root,
	packageName,
	sourcePath,
}: {
	root: string;
	packageName: string;
	sourcePath: string;
}) {
	const target = resolve(root, 'node_modules', ...packageName.split('/'));
	const parent = resolve(
		root,
		'node_modules',
		...packageName.split('/').slice(0, -1)
	);
	mkdirSync(parent, { recursive: true });
	rmSync(target, { force: true, recursive: true });
	symlinkSync(sourcePath, target, 'junction');
}

function ensureBaselineWorkspaceBuild() {
	run(['bun', 'run', 'prebuild'], resolve(WORKTREE_DIR, 'packages/core'));
	run(['bun', 'run', 'prebuild'], resolve(WORKTREE_DIR, 'packages/react'));
	run(
		['bunx', 'rslib', 'build', '--no-dts'],
		resolve(WORKTREE_DIR, 'packages/schema')
	);
	run(
		['bunx', 'rslib', 'build', '--no-dts'],
		resolve(WORKTREE_DIR, 'packages/translations')
	);
	run(
		['bunx', 'rslib', 'build', '--no-dts'],
		resolve(WORKTREE_DIR, 'packages/core')
	);
	run(
		['bunx', 'rslib', 'build', '--no-dts'],
		resolve(WORKTREE_DIR, 'packages/ui')
	);

	linkWorkspacePackage({
		root: WORKTREE_DIR,
		packageName: 'c15t',
		sourcePath: resolve(WORKTREE_DIR, 'packages/core'),
	});
	linkWorkspacePackage({
		root: WORKTREE_DIR,
		packageName: '@c15t/schema',
		sourcePath: resolve(WORKTREE_DIR, 'packages/schema'),
	});
	linkWorkspacePackage({
		root: WORKTREE_DIR,
		packageName: '@c15t/translations',
		sourcePath: resolve(WORKTREE_DIR, 'packages/translations'),
	});
	linkWorkspacePackage({
		root: WORKTREE_DIR,
		packageName: '@c15t/ui',
		sourcePath: resolve(WORKTREE_DIR, 'packages/ui'),
	});
}

function writeHistoricalEntry() {
	const benchDir = resolve(WORKTREE_DIR, '.bundle-bench');
	mkdirSync(benchDir, { recursive: true });
	const entryFile = resolve(benchDir, `${BASELINE_ENTRY}.tsx`);
	writeFileSync(entryFile, createHistoricalEntrySource());
	return entryFile;
}

function buildEntry({
	cwd,
	entry,
	entryFile,
}: {
	cwd: string;
	entry: string;
	entryFile: string;
}): BundleResult {
	const outdir = resolve(OUTPUT_ROOT, entry);
	rmSync(outdir, { force: true, recursive: true });
	mkdirSync(outdir, { recursive: true });
	const output = run(
		['bun', '--eval', createBuildScript(entryFile, outdir)],
		cwd
	);
	const summary = JSON.parse(output) as Omit<
		BundleResult,
		'entry' | 'totalBytes' | 'totalGzipBytes'
	>;

	return {
		entry,
		...summary,
		totalBytes: summary.jsBytes + summary.cssBytes,
		totalGzipBytes: summary.jsGzipBytes + summary.cssGzipBytes,
	};
}

function formatDelta(value: number) {
	return Math.abs(value).toLocaleString();
}

function getDirection(value: number) {
	return value === 0 ? 'matches' : value < 0 ? 'smaller than' : 'larger than';
}

async function main() {
	const reportDir = resolve(APP_DIR, 'report');
	mkdirSync(reportDir, { recursive: true });

	ensureUiBuild(REPO_ROOT);
	const current = buildEntry({
		cwd: APP_DIR,
		entry: CURRENT_ENTRY,
		entryFile: resolve(APP_DIR, 'src', `${CURRENT_ENTRY}.tsx`),
	});

	ensureBaselineWorktree();
	ensureBaselineInstall();
	ensureBaselineWorkspaceBuild();
	const baselineEntryFile = writeHistoricalEntry();
	const baseline = buildEntry({
		cwd: WORKTREE_DIR,
		entry: BASELINE_ENTRY,
		entryFile: baselineEntryFile,
	});

	const deltaJsBytes = current.jsBytes - baseline.jsBytes;
	const deltaJsGzipBytes = current.jsGzipBytes - baseline.jsGzipBytes;
	const deltaCssBytes = current.cssBytes - baseline.cssBytes;
	const deltaCssGzipBytes = current.cssGzipBytes - baseline.cssGzipBytes;
	const deltaTotalBytes = current.totalBytes - baseline.totalBytes;
	const deltaTotalGzipBytes = current.totalGzipBytes - baseline.totalGzipBytes;
	const report = {
		baseline,
		current,
		deltaCssBytes,
		deltaCssGzipBytes,
		deltaJsBytes,
		deltaJsGzipBytes,
		deltaTotalBytes,
		deltaTotalGzipBytes,
	};
	const direction = getDirection(deltaTotalBytes);
	const absDeltaTotalBytes = formatDelta(deltaTotalBytes);
	const absDeltaTotalGzipBytes = formatDelta(deltaTotalGzipBytes);
	const baselineCssNote =
		baseline.cssBytes === 0
			? [
					'- The `2.0.0` baseline emits no standalone CSS asset in this build path; its styling cost is carried in JavaScript.',
				]
			: [];

	writeFileSync(
		resolve(reportDir, 'report.json'),
		`${JSON.stringify(report, null, 2)}\n`
	);
	writeFileSync(
		resolve(reportDir, 'README.md'),
		[
			'# Consent surface bundle comparison: current vs `2.0.0`',
			'',
			'This benchmark compares the current shipped React consent surfaces against the historical `origin/2.0.0` consent surfaces.',
			'',
			'Current result:',
			`The current surfaces are ${direction} the \`2.0.0\` baseline by ${absDeltaTotalBytes} total bytes and ${absDeltaTotalGzipBytes} total gzip bytes.`,
			'',
			'Methodology:',
			'- Both entries are bundled with `Bun.build` in browser mode with minification enabled.',
			'- The current entry renders the public `ConsentBanner` and `ConsentDialog` components from the current branch.',
			'- The baseline entry is built from a real `git worktree` checked out at `origin/2.0.0`.',
			'- The report measures emitted JavaScript and CSS assets separately and as a combined total.',
			'- This is a historical product-surface comparison, not an isolated primitive-only benchmark.',
			...baselineCssNote,
			'',
			'Regenerate:',
			'Run `bun run bundle-bench` inside `apps/bundle-bench-react` to rebuild the current entry, create or reuse the `origin/2.0.0` worktree baseline, and rewrite this report.',
			'',
			'```json',
			readFileSync(resolve(reportDir, 'report.json'), 'utf8').trim(),
			'```',
			'',
		].join('\n')
	);
}

await main();
