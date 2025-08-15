/**
 * @packageDocumentation
 * Entry point for the c15t GitHub Action that manages a sticky
 * pull request comment. The action can create, update, minimize,
 * delete, or recreate a PR comment, and optionally append to the
 * existing content while preserving a sentinel header.
 *
 * The behavior is configured via inputs read in `config.ts` and the
 * actual comment operations are implemented in `comment.ts`
 *
 * @see `./config.ts`
 * @see `./comment.ts`
 */
import * as core from '@actions/core';
import * as github from '@actions/github';
import {
	commentOnPush,
	getBody,
	githubAppId,
	githubAppInstallationId,
	githubAppPrivateKey,
	githubToken,
	isFirstTimeContributor,
	postSkipComment,
	pullRequestNumber,
	skipMessage,
} from './config/inputs';
import { ensureComment } from './steps/comments';
import { performVercelDeployment } from './steps/deployment';
import { getAuthToken } from './steps/github-app-auth';
import { maybeCommentOnPush } from './steps/push-comment';
import { renderCommentMarkdown } from './steps/render-comment';
import { validateOptions } from './steps/validate';

function computeEffectiveBody(
	deploymentUrl: string | undefined,
	body: string
): string {
	let base = body;
	if (deploymentUrl && !body) {
		base = renderCommentMarkdown(deploymentUrl, {
			firstContribution: isFirstTimeContributor,
		});
	}
	return base;
}

/**
 * Runs the action's main workflow.
 *
 * The workflow is:
 * - Validate configuration (mutually exclusive options and required inputs).
 * - Resolve the comment body from message or files.
 * - Find an existing sticky comment on the PR (if any).
 * - Perform the requested operation (create/update/minimize/delete/recreate).
 *
 * It sets the following outputs when applicable:
 * - `previous_comment_id`: ID of the found previous comment (if any)
 * - `created_comment_id`: ID of a newly created comment (when created)
 *
 * @returns A promise that resolves with `undefined` when the workflow
 * finishes. The function uses `@actions/core` to signal failures.
 *
 * @throws {Error} When invalid combinations of options are provided,
 * such as `delete` with `recreate`, `only_create` with `only_update`,
 * or `hide` with `hide_and_recreate`.
 *
 * @example
 * // Typical execution is handled by the GitHub Actions runtime. For
 * // local reasoning/testing, just call run():
 * await (async () => { await run(); })();
 */
async function run(): Promise<undefined> {
	try {
		core.info(
			`[c15t] start event=${github.context.eventName} ref=${github.context.ref} sha=${github.context.sha}`
		);
		const token = await getAuthToken(
			githubToken,
			githubAppId,
			githubAppPrivateKey,
			githubAppInstallationId
		);
		core.info(
			`[c15t] auth=${
				githubAppId && githubAppPrivateKey ? 'github-app' : 'default-token'
			}`
		);
		const octokit = github.getOctokit(token);
		core.info('[c15t] orchestrating deploy');
		const deploymentUrl = await performVercelDeployment(octokit);
		if (deploymentUrl) {
			core.info(`[c15t] deployment url=${deploymentUrl}`);
		}
		if (!deploymentUrl) {
			// Deployment was skipped by policy/gating. Optionally post a sticky skip comment.
			if (postSkipComment) {
				// Try to find the most recent successful deployment URL from repo deployments
				let lastUrl = '';
				try {
					const { data } = await octokit.rest.repos.listDeployments({
						...github.context.repo,
						per_page: 10,
					});
					for (const d of data) {
						const statuses = await octokit.rest.repos.listDeploymentStatuses({
							...github.context.repo,
							deployment_id: d.id,
							per_page: 1,
						});
						const envUrl = statuses.data[0]?.environment_url || '';
						if (statuses.data[0]?.state === 'success' && envUrl) {
							lastUrl = envUrl;
							break;
						}
					}
				} catch {
					// ignore lookup errors
				}
				core.info(
					`[c15t] deployment skipped; last successful url=${lastUrl || 'n/a'}`
				);
				const rendered = renderCommentMarkdown(
					lastUrl || 'https://vercel.com',
					{
						firstContribution: isFirstTimeContributor,
						status: 'Skipped',
					}
				);
				const body = skipMessage || rendered;
				// Post as PR sticky comment when running in a PR; otherwise, if enabled, post a commit comment on push
				if (!Number.isNaN(pullRequestNumber) && pullRequestNumber >= 1) {
					core.info('[c15t] posting sticky PR skip comment');
					await ensureComment(octokit, body, { appendOverride: false });
				} else if (commentOnPush) {
					core.info('[c15t] posting commit skip comment on push');
					try {
						await octokit.rest.repos.createCommitComment({
							...github.context.repo,
							commit_sha: github.context.sha,
							body,
						});
					} catch (e) {
						core.warning(
							`Could not post commit skip comment: ${
								e instanceof Error ? e.message : String(e)
							}`
						);
					}
				}
			}
			return;
		}
		const body = await getBody();
		const effectiveBody = computeEffectiveBody(deploymentUrl, body);
		const handled = await maybeCommentOnPush(
			octokit,
			effectiveBody,
			deploymentUrl
		);
		if (handled) {
			core.info('[c15t] handled push commit comment; exiting');
			return;
		}
		core.info('[c15t] validating options');
		validateOptions();
		await ensureComment(octokit, effectiveBody, { appendOverride: true });
		core.info('[c15t] ensured PR sticky comment with deployment link');
	} catch (error) {
		if (error instanceof Error) {
			core.setFailed(error.message);
		}
	}
}

run();
