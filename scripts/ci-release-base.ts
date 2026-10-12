import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

interface ReleaseBaseOptions {
	repository: string;
	branch: string;
	runId: string;
	token: string;
	workflow?: string;
	request?: typeof fetch;
	isAncestor?: (sha: string) => boolean;
}

const isSuccessfulRun = (
	run: unknown,
	branch: string,
	runId: string
): run is { head_sha: string } =>
	Boolean(run) &&
	typeof run === 'object' &&
	run !== null &&
	'head_sha' in run &&
	'id' in run &&
	'conclusion' in run &&
	'head_branch' in run &&
	typeof run.head_sha === 'string' &&
	/^[a-f\d]{40}$/u.test(run.head_sha) &&
	String(run.id) !== runId &&
	run.conclusion === 'success' &&
	run.head_branch === branch;

/** Find a successful ancestor so failed and superseded pushes remain in the diff. */
export const findReleaseBase = async function findReleaseBase({
	repository,
	branch,
	runId,
	token,
	workflow = 'release.yml',
	request = fetch,
	isAncestor = (sha) =>
		spawnSync('git', ['merge-base', '--is-ancestor', sha, 'HEAD']).status === 0,
}: ReleaseBaseOptions): Promise<string> {
	if (!token) {
		return '';
	}
	for (let page = 1; page <= 3; page += 1) {
		const url = new URL(
			`https://api.github.com/repos/${repository}/actions/workflows/${workflow}/runs`
		);
		url.search = new URLSearchParams({
			branch,
			event: 'push',
			page: String(page),
			per_page: '100',
			status: 'success',
		}).toString();
		// oxlint-disable-next-line no-await-in-loop -- Pages are only requested until a validated ancestor is found.
		const response = await request(url, {
			headers: {
				Accept: 'application/vnd.github+json',
				Authorization: `Bearer ${token}`,
				'X-GitHub-Api-Version': '2022-11-28',
			},
			signal: AbortSignal.timeout(15_000),
		});
		if (!response.ok) {
			throw new Error(`Release history request failed: ${response.status}`);
		}
		// oxlint-disable-next-line no-await-in-loop -- Each page determines whether another request is necessary.
		const data: unknown = await response.json();
		if (
			!data ||
			typeof data !== 'object' ||
			!('workflow_runs' in data) ||
			!Array.isArray(data.workflow_runs)
		) {
			throw new Error('Invalid release history response.');
		}
		const runs: unknown[] = data.workflow_runs;
		for (const run of runs) {
			if (isSuccessfulRun(run, branch, runId) && isAncestor(run.head_sha)) {
				return run.head_sha;
			}
		}
		if (data.workflow_runs.length < 100) {
			break;
		}
	}
	return '';
};

if (import.meta.main) {
	let base = '';
	try {
		base = await findReleaseBase({
			branch: process.env.GITHUB_REF_NAME ?? '',
			repository: process.env.GITHUB_REPOSITORY ?? '',
			runId: process.env.GITHUB_RUN_ID ?? '',
			token: process.env.GITHUB_TOKEN ?? '',
			workflow: process.env.CI_RELEASE_WORKFLOW,
		});
	} catch (error) {
		process.stderr.write(`${String(error)}\n`);
	}
	process.stdout.write(
		base
			? `Release comparison base: ${base}\n`
			: 'No validated release ancestor available; selecting full checks.\n'
	);
	if (process.env.GITHUB_ENV) {
		appendFileSync(process.env.GITHUB_ENV, `CI_DIFF_BASE=${base}\n`);
	}
}
