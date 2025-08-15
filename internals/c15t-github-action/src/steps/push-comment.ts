import * as core from '@actions/core';
import * as github from '@actions/github';
import { commentOnPush, pullRequestNumber } from '../config/inputs';
import { buildDefaultPreviewComment } from '../steps/ui';

export async function maybeCommentOnPush(
	octokit: ReturnType<typeof github.getOctokit>,
	effectiveBody: string,
	deploymentUrl?: string
): Promise<boolean> {
	if (!Number.isNaN(pullRequestNumber) && pullRequestNumber >= 1) {
		return false;
	}
	if (!commentOnPush) {
		core.info('no pull request number: deploy done, commenting skipped');
		return true;
	}
	if (!deploymentUrl) {
		return true;
	}
	try {
		await octokit.rest.repos.createCommitComment({
			...github.context.repo,
			commit_sha: github.context.sha,
			body:
				effectiveBody ||
				buildDefaultPreviewComment(deploymentUrl, { debug: true }),
		});
	} catch (e) {
		core.warning(
			`Could not post commit comment: ${e instanceof Error ? e.message : String(e)}`
		);
	}
	return true;
}
