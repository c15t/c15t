import { execFileSync, spawnSync } from 'node:child_process';

/** Resolve both revisions and keep the baseline within the selected head's history. */
export const resolveBenchmarkRevisions = function resolveBenchmarkRevisions(
	baseRef = 'HEAD^',
	cwd = process.cwd()
) {
	const revision = (ref: string) =>
		execFileSync(
			'git',
			['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`],
			{ cwd, encoding: 'utf8' }
		).trim();
	const headSha = revision('HEAD');
	const baseSha = revision(baseRef);
	const ancestry = spawnSync(
		'git',
		['merge-base', '--is-ancestor', baseSha, headSha],
		{ cwd }
	);
	if (ancestry.error) {
		throw ancestry.error;
	}
	if (ancestry.status !== 0) {
		throw new Error(
			"Benchmark base must be an ancestor of the selected head. Arbitrary revisions cannot run with this job's cache access."
		);
	}
	return { baseSha, headSha };
};

if (import.meta.main) {
	const { baseSha, headSha } = resolveBenchmarkRevisions(
		process.env.BENCHMARK_BASE_REF || 'HEAD^'
	);
	process.stdout.write(`head_sha=${headSha}\nbase_sha=${baseSha}\n`);
}
