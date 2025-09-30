import * as core from '@actions/core';
import * as github from '@actions/github';

export function parseCsv(
	input: string | undefined,
	fallback: string[]
): string[] {
	if (!input) {
		return fallback;
	}
	return input
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
}

export function shouldDeployByPolicy(
	pushBranchesCsv: string | undefined,
	prBaseBranchesCsv: string | undefined
): boolean {
	const ctx = github.context;
	const isPR =
		ctx.eventName === 'pull_request' || ctx.eventName === 'pull_request_target';
	const pushBranches = parseCsv(pushBranchesCsv, ['main', 'canary']);
	const prBaseBranches = parseCsv(prBaseBranchesCsv, ['main', 'canary']);

	if (!isPR) {
		const ref = ctx.ref?.replace('refs/heads/', '') || '';
		return pushBranches.includes(ref);
	}
	const baseRef =
		(ctx.payload as unknown as { pull_request?: { base?: { ref?: string } } })
			?.pull_request?.base?.ref || '';
	return prBaseBranches.includes(baseRef);
}

export async function detectRelevantChanges(
	octokit: ReturnType<typeof github.getOctokit>,
	globs: string[]
): Promise<boolean> {
	const ctx = github.context;
	try {
		if (
			ctx.eventName === 'pull_request' ||
			ctx.eventName === 'pull_request_target'
		) {
			const pr = (
				ctx.payload as unknown as { pull_request?: { number?: number } }
			)?.pull_request;
			const number = pr?.number ?? 0;
			if (!number) {
				return true; // be safe: deploy
			}
			const files = await octokit.paginate(
				octokit.rest.pulls.listFiles,
				{
					...ctx.repo,
					pull_number: number,
					per_page: 100,
				},
				// flatten items
				(res) => res.data
			);
			const paths = files.map((f) => f.filename);
			return paths.some((p) => globs.some((g) => minimatch(p, g)));
		}
		// push event: compare last commit range when possible
		const payload = ctx.payload as unknown as { before?: string };
		const beforeSha = payload?.before;
		const base =
			beforeSha && beforeSha !== '0000000000000000000000000000000000000000'
				? beforeSha
				: `${ctx.sha}~1`;
		const head = ctx.sha;
		const res = await octokit.rest.repos.compareCommitsWithBasehead({
			...ctx.repo,
			basehead: `${base}...${head}`,
		});
		const paths = res.data.files?.map((f) => f.filename || '') || [];
		return paths.some((p) => globs.some((g) => minimatch(p, g)));
	} catch (e) {
		core.warning(
			`change detection failed, proceeding with deploy: ${e instanceof Error ? e.message : String(e)}`
		);
		return true;
	}
}

// Lightweight minimatch impl for ** and * patterns (subset sufficient for our globs)
function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function globToRegex(glob: string): RegExp {
	// Validate glob length and complexity to prevent ReDoS
	if (glob.length > 1000) {
		throw new Error('Glob pattern too long');
	}
	if ((glob.match(/\*/g) || []).length > 20) {
		throw new Error('Too many wildcards in glob pattern');
	}
	const escaped = escapeRegex(glob)
		.replace(/\\\*\\\*/g, '.*')
		.replace(/\\\*/g, '[^/]*');
	const re = `^${escaped}$`;
	return new RegExp(re, 'u');
}
function minimatch(path: string, glob: string): boolean {
	try {
		return globToRegex(glob).test(path);
	} catch {
		return false;
	}
}
