import * as core from '@actions/core';
import * as github from '@actions/github';
import { commentOnPush, pullRequestNumber } from '../config/inputs';
import { renderCommentMarkdown } from './render-comment';

/**
 * Optionally posts a commit comment with a docs preview link on push events.
 *
 * Skips when the run is associated with a pull request or when disabled via
 * inputs. Returns a boolean indicating whether the step completed without
 * error (including intentional skips).
 *
 * @param octokit - Preconfigured Octokit instance.
 * @param effectiveBody - Comment body to post; falls back to a generated
 *   preview comment when absent.
 * @param deploymentUrl - Public deployment URL; required to post a comment.
 * @returns True when posting succeeded or the step was intentionally skipped;
 *   false when a PR run was detected or posting failed.
 * @see renderCommentMarkdown
 */

export async function maybeCommentOnPush(
	octokit: ReturnType<typeof github.getOctokit>,
	effectiveBody?: string,
	deploymentUrl?: string
): Promise<boolean> {
	if (typeof pullRequestNumber === 'number' && pullRequestNumber >= 1) {
		return false;
	}
	if (!commentOnPush) {
		core.info('comment_on_push=false: skipping commit comment on push');
		return true;
	}
	if (!deploymentUrl) {
		core.info('no deployment URL provided; skipping commit comment');
		return true;
	}
	try {
		await octokit.rest.repos.createCommitComment({
			...github.context.repo,
			commit_sha: github.context.sha,
			body:
				effectiveBody ||
				renderCommentMarkdown(deploymentUrl, {
					seed: github.context.sha,
				}),
		});
	} catch (e) {
		core.warning(
			`Could not post commit comment: ${
				e instanceof Error ? e.message : String(e)
			}`
		);
		return false;
	}
	return true;
}
