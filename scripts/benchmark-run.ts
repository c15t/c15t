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

import {
	BENCH_BACKEND_LATENCY_ENV,
	resolveBenchBackendLatencyMs,
} from '../benchmarks/shared/src/browser';
import { replaceBenchmarkFixtures } from './benchmark-overlay';
import { createBenchmarkPlan } from './benchmark-plan';
import { resolveBenchmarkRevisions } from './benchmark-revisions';
import {
	iterationsPerRound,
	poolRoundDirectories,
	roundOrder,
} from './benchmark-rounds';
import type { BenchmarkArm } from './benchmark-rounds';
import { runCommand } from './browser-process';
import { installBrowsers } from './install-browsers';

const mode = process.argv[2] ?? 'quick';
const readFlag = function readFlag(name: string): string | undefined {
	const index = process.argv.indexOf(name);
	if (index >= 0) {
		return process.argv[index + 1];
	}
	const prefix = `${name}=`;
	return process.argv
		.find((arg) => arg.startsWith(prefix))
		?.slice(prefix.length);
};
// Base and head both run against a consent backend that answers after this
// many milliseconds (200 by default; `--backend-latency-ms 0` turns it off).
const backendLatencyMs = resolveBenchBackendLatencyMs(readFlag, process.env);
const { expectedPackages, packages, suites } = createBenchmarkPlan(
	mode,
	process.env.BENCHMARK_PACKAGE
);
const root = process.cwd();
const { baseSha, headSha } = resolveBenchmarkRevisions(
	process.env.BENCHMARK_BASE_REF || 'HEAD^'
);
const directory = mkdtempSync(join(tmpdir(), 'c15t-benchmark-'));
const base = join(directory, 'base');
const report = resolve('.ci-reports', mode);
rmSync(report, { force: true, recursive: true });
mkdirSync(report, { recursive: true });
// Measuring all of base and then all of head let a runner that slowed down
// or sped up mid-job fail the gate on a docs-only change. Alternating rounds
// spread that drift over both arms, and their samples are pooled before the
// comparison. Bundle sizes do not drift, so one pass is enough.
const rounds = mode === 'bundle' ? 1 : 3;
const iterations = iterationsPerRound(mode === 'quick' ? 15 : 30, rounds);
const env = {
	...process.env,
	BENCHMARK_BASE_SHA: baseSha,
	BENCH_ITERATIONS: iterations,
	BENCH_WARMUP_ITERATIONS: '3',
	[BENCH_BACKEND_LATENCY_ENV]: `${backendLatencyMs}`,
	C15T_BENCH_ITERATIONS: iterations,
	C15T_BENCH_WARMUP_ITERATIONS: '3',
	// Microsecond operations need enough iterations per process for JIT
	// warmup and sampling: a third as many raises their medians, and some
	// sit close to absolute allowances. Every round runs the full count.
	C15T_CORE_BENCH_ITERATIONS: '5000',
	C15T_CORE_BENCH_WARMUP_ITERATIONS: '1000',
};
// Kept in the report, so a failed later round still uploads the earlier ones.
const roundDirectory = (round: number, arm: BenchmarkArm) =>
	join(report, 'rounds', String(round + 1), arm);

const measure = async function measure(
	cwd: string,
	sha: string,
	arm: BenchmarkArm,
	round: number
) {
	process.stdout.write(
		`Measuring ${arm} ${sha} (round ${round + 1} of ${rounds}) with the ${mode} suite at ${backendLatencyMs} ms backend latency.\n`
	);
	rmSync(join(cwd, '.benchmarks/head'), { force: true, recursive: true });
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
	cpSync(join(cwd, '.benchmarks/head'), roundDirectory(round, arm), {
		recursive: true,
	});
};
const revisions = {
	base: { cwd: base, sha: baseSha },
	head: { cwd: root, sha: headSha },
} as const;

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
				backendLatencyMs,
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
							'scripts/benchmark-plan.ts',
							'scripts/benchmark-rounds.ts',
						],
						{ encoding: 'utf8' }
					).length > 0,
				harnessSha: headSha,
				headSha,
				mode,
				packages,
				rounds,
			},
			null,
			2
		)
	);
	for (let round = 0; round < rounds; round += 1) {
		for (const arm of roundOrder(round)) {
			// oxlint-disable-next-line no-await-in-loop -- Rounds must not overlap on one runner.
			await measure(revisions[arm].cwd, revisions[arm].sha, arm, round);
		}
	}
	for (const arm of ['base', 'head'] as const) {
		poolRoundDirectories(
			Array.from({ length: rounds }, (_, round) => roundDirectory(round, arm)),
			join(report, arm)
		);
	}
	await runCommand(['bunx', 'tsx', 'benchmarks/shared/run-compare.ts'], {
		cwd: root,
		env: {
			...env,
			BENCHMARK_BASE_DIR: join(report, 'base'),
			BENCHMARK_COMPARE_DIR: join(report, 'compare'),
			BENCHMARK_ENFORCE: 'true',
			BENCHMARK_EXPECTED_PACKAGES: expectedPackages.join(','),
			BENCHMARK_EXPECTED_SUITES: suites.join(','),
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
