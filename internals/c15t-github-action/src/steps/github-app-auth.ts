import * as core from '@actions/core';
import * as github from '@actions/github';
import { createAppAuth } from '@octokit/auth-app';

export async function getAuthToken(
	defaultToken: string,
	appId: string | undefined,
	privateKey: string | undefined,
	installationIdInput: string | undefined
): Promise<string> {
	if (!appId || !privateKey) {
		return defaultToken;
	}
	try {
		const appAuth = createAppAuth({
			appId,
			privateKey,
		});
		let installationId: number | undefined;
		if (installationIdInput) {
			installationId = Number(installationIdInput);
		} else {
			const appOctokit = github.getOctokit(
				(await appAuth({ type: 'app' })).token
			);
			const { owner, repo } = github.context.repo;
			const { data } = await appOctokit.rest.apps.getRepoInstallation({
				owner,
				repo,
			});
			installationId = data.id;
		}
		if (typeof installationId !== 'number') {
			core.info(
				'Could not resolve GitHub App installation for this repo; falling back to default token'
			);
			return defaultToken;
		}
		const installationAuth = await appAuth({
			type: 'installation',
			installationId,
		});
		return installationAuth.token;
	} catch (e) {
		core.warning(
			`GitHub App token generation failed: ${e instanceof Error ? e.message : String(e)}`
		);
		return defaultToken;
	}
}
