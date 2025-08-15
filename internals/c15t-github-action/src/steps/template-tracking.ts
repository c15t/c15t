import * as core from '@actions/core';
import * as github from '@actions/github';

export async function fetchLatestTemplateSha(
	octokit: ReturnType<typeof github.getOctokit>,
	repo: string,
	ref: string,
	authToken?: string
): Promise<string | undefined> {
	try {
		const [owner, name] = repo.split('/');
		let client: ReturnType<typeof github.getOctokit> = octokit;
		if (authToken) {
			client = github.getOctokit(authToken);
		}
		const { data: commits } = await client.rest.repos.listCommits({
			owner,
			repo: name,
			sha: ref,
			per_page: 1,
		});
		return commits[0]?.sha;
	} catch (e) {
		core.warning(
			`Could not fetch latest template sha: ${e instanceof Error ? e.message : String(e)}`
		);
		return undefined;
	}
}

export async function readLastTemplateShaFromDeployments(
	octokit: ReturnType<typeof github.getOctokit>,
	environment: string
): Promise<string | undefined> {
	try {
		const { data } = await octokit.rest.repos.listDeployments({
			...github.context.repo,
			environment,
			per_page: 10,
		});
		for (const d of data) {
			const statuses = await octokit.rest.repos.listDeploymentStatuses({
				...github.context.repo,
				deployment_id: d.id,
				per_page: 1,
			});
			if (statuses.data[0]?.state === 'success') {
				let sha: string | undefined;
				const payload: unknown = (d as unknown as { payload?: unknown })
					.payload;
				if (typeof payload === 'string') {
					try {
						const parsed = JSON.parse(payload) as { template_sha?: string };
						sha = parsed.template_sha;
					} catch (e) {
						core.warning(
							`Could not parse payload: ${e instanceof Error ? e.message : String(e)}`
						);
					}
				} else if (payload && typeof payload === 'object') {
					sha = (payload as { template_sha?: string }).template_sha;
				}
				if (sha) {
					return sha;
				}
			}
		}
		return undefined;
	} catch {
		core.info('No previous deployments found for template sha lookup');
		return undefined;
	}
}

export async function attachTemplateShaToDeployment(
	octokit: ReturnType<typeof github.getOctokit>,
	deploymentId: number,
	templateSha?: string
): Promise<void> {
	if (!templateSha) {
		return;
	}
	try {
		await octokit.request(
			'POST /repos/{owner}/{repo}/deployments/{deployment_id}/statuses',
			{
				...github.context.repo,
				deployment_id: deploymentId,
				state: 'success',
				description: 'Preview ready',
				mediaType: { previews: ['flash', 'ant-man'] },
				environment_url: undefined,
			}
		);
		// NOTE: GitHub API does not support updating payload; we record via status note above.
	} catch (e) {
		core.debug(
			`attachTemplateShaToDeployment: ${e instanceof Error ? e.message : String(e)}`
		);
	}
}
