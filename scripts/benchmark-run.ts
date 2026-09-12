import { execFileSync } from 'node:child_process';
import {
	appendFileSync,
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { replaceBenchmarkFixtures } from './benchmark-overlay';
import { runCommand } from './browser-process';
import { installBrowsers } from './install-browsers';

const mode = process.argv[2] ?? 'quick';
if (!['bundle', 'quick', 'full'].includes(mode)) {
	throw new Error(`Unknown benchmark mode: ${mode}`);
}
const root = process.cwd();
const headSha = execFileSync('git', ['rev-parse', 'HEAD'], {
	encoding: 'utf8',
}).trim();
const baseSha = execFileSync(
	'git',
	[
		'rev-parse',
		'--verify',
		`${process.env.BENCHMARK_BASE_REF || 'HEAD^'}^{commit}`,
	],
	{ encoding: 'utf8' }
).trim();
const directory = mkdtempSync(join(tmpdir(), 'c15t-benchmark-'));
const base = join(directory, 'base');
const report = resolve('.ci-reports', mode);
rmSync(report, { force: true, recursive: true });
mkdirSync(report, { recursive: true });
const packages =
	mode === 'bundle'
		? ['@c15t/next-bundle-bench']
		: [
				'@c15t/core-benchmarks',
				'@c15t/script-lifecycle-bench',
				...(mode === 'full'
					? [
							'@c15t/react-browser-bench',
							'@c15t/nextjs-browser-bench',
							'@c15t/nuxt-browser-bench',
							'@c15t/sveltekit-browser-bench',
							'@c15t/astro-browser-bench',
							'@c15t/tanstack-start-browser-bench',
						]
					: []),
			];
const env = {
	...process.env,
	BENCHMARK_BASE_SHA: baseSha,
	BENCH_ITERATIONS: mode === 'quick' ? '15' : '30',
	BENCH_WARMUP_ITERATIONS: '3',
	C15T_BENCH_ITERATIONS: mode === 'quick' ? '15' : '30',
	C15T_BENCH_WARMUP_ITERATIONS: '3',
	// Microsecond operations need enough iterations for JIT warmup and sampling.
	C15T_CORE_BENCH_ITERATIONS: '5000',
	C15T_CORE_BENCH_WARMUP_ITERATIONS: '1000',
};

const measure = async function measure(cwd: string, sha: string, arm: string) {
	process.stdout.write(`Measuring ${arm} ${sha} with the ${mode} suite.\n`);
	rmSync(join(cwd, '.benchmarks/head'), { force: true, recursive: true });
	if (mode === 'bundle') {
		// Tarballs include consumer documentation; generate it on both sides.
		await runCommand(['bun', 'scripts/generate-package-docs.ts'], {
			cwd,
			env: { ...env, GITHUB_SHA: sha },
		});
	}
	await runCommand(
		[
			'bun',
			'turbo',
			'run',
			'bench:ci',
			'--concurrency=1',
			'--env-mode=loose',
			...packages.map((name) => `--filter=${name}`),
		],
		{ cwd, env: { ...env, GITHUB_SHA: sha } }
	);
	cpSync(join(cwd, '.benchmarks/head'), join(report, arm), { recursive: true });
};

try {
	execFileSync('git', ['worktree', 'add', '--detach', base, baseSha], {
		stdio: 'inherit',
	});
	await runCommand(['bun', 'install', '--frozen-lockfile'], { cwd: base });
	if (mode !== 'bundle') {
		await installBrowsers(base, process.env.CI === 'true');
		await installBrowsers(root, process.env.CI === 'true');
	}
	// Apply the head's measurement fixtures to both revisions. Product sources,
	// dependency lockfiles and build configuration remain at their own revision.
	// Record this overlay instead of pretending it is a pristine baseline tree.
	replaceBenchmarkFixtures(root, base);
	writeFileSync(
		join(report, 'provenance.json'),
		JSON.stringify(
			{
				baseHarnessOverlay: true,
				baseSha,
				harnessDirty:
					execFileSync(
						'git',
						[
							'status',
							'--porcelain',
							'--',
							'benchmarks',
							'scripts/benchmark-run.ts',
						],
						{ encoding: 'utf8' }
					).length > 0,
				harnessSha: headSha,
				headSha,
				mode,
				packages,
			},
			null,
			2
		)
	);
	await measure(base, baseSha, 'base');
	await measure(root, headSha, 'head');
	await runCommand(['bunx', 'tsx', 'benchmarks/shared/run-compare.ts'], {
		cwd: root,
		env: {
			...env,
			BENCHMARK_BASE_DIR: join(report, 'base'),
			BENCHMARK_COMPARE_DIR: join(report, 'compare'),
			BENCHMARK_ENFORCE: 'true',
			BENCHMARK_EXPECTED_SUITES:
				{
					bundle: 'bundle,artifact',
					full: 'core-runtime,policy-runtime,script-lifecycle,browser-runtime',
					quick: 'core-runtime,policy-runtime,script-lifecycle',
				}[mode] ?? '',
			BENCHMARK_HEAD_DIR: join(report, 'head'),
			BENCHMARK_PROFILE: 'regression',
		},
	});
} finally {
	const summary = join(report, 'compare/comparison.md');
	if (process.env.GITHUB_STEP_SUMMARY) {
		appendFileSync(
			process.env.GITHUB_STEP_SUMMARY,
			existsSync(summary)
				? readFileSync(summary, 'utf8')
				: `## ${mode} measurement failed\n\nNo complete comparison was produced. See the failed step and attached evidence.\n`
		);
	}
	if (existsSync(base)) {
		execFileSync('git', ['worktree', 'remove', '--force', base], {
			stdio: 'inherit',
		});
	}
	rmSync(directory, { force: true, recursive: true });
}
