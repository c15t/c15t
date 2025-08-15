import * as core from '@actions/core';
import * as github from '@actions/github';
import { createAppAuth } from '@octokit/auth-app';

/**
 * Resolve the auth token to use for API calls.
 *
 * If `appId`/`privateKey` are missing or resolution fails, returns `defaultToken`.
 * When `installationIdInput` is omitted, discovers the repo installation via the
 * GitHub App. Falls back to `defaultToken` if discovery fails.
 *
 * @param defaultToken - Fallback token (GITHUB_TOKEN or PAT).
 * @param appId - GitHub App ID, if using App auth.
 * @param privateKey - GitHub App private key (PEM). Multiline secrets supported.
 * @param installationIdInput - Optional installation ID to skip discovery.
 * @returns A bearer token string for authenticated requests.
 * @throws Never throws; logs warnings and returns `defaultToken` on failures.
 */
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
			const parsed = Number(installationIdInput);
			if (Number.isInteger(parsed) && parsed > 0) {
				installationId = parsed;
			} else {
				core.info(
					'Invalid github_app_installation_id provided; falling back to default token'
				);
				return defaultToken;
			}
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
		if (!Number.isInteger(installationId) || (installationId as number) <= 0) {
			core.info(
				'Could not resolve GitHub App installation for this repo; falling back to default token'
			);
			return defaultToken;
		}
		const installationAuth = await appAuth({
			type: 'installation',
			installationId: installationId as number,
		});
		return installationAuth.token;
	} catch (e) {
		core.warning(
			`GitHub App token generation failed: ${e instanceof Error ? e.message : String(e)}`
		);
		return defaultToken;
	}
}
