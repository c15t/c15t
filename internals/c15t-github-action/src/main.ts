/**
 * @packageDocumentation
 * Entry point for the c15t GitHub Action that manages the docs-preview
 * lifecycle: orchestrates a Vercel deploy (or gated skip), renders the
 * preview body, and ensures a sticky PR comment with append semantics.
 *
 * The behavior is configured via inputs read in `config/inputs` and the
 * PR comment operations are implemented in `steps/comments`.
 *
 * @see `./config/inputs`
 * @see `./steps/comments`
 */
import * as core from '@actions/core';
import * as github from '@actions/github';
import {
	commentOnPush,
	debugMode,
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
import { ErrorHandler, executeWithRetry } from './utils/errors';
import { createLogger } from './utils/logger';

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
		const logger = createLogger(Boolean(debugMode));
		logger.info('start', {
			event: github.context.eventName,
			ref: github.context.ref,
			sha: github.context.sha,
		});
		const token = await getAuthToken(
			githubToken,
			githubAppId,
			githubAppPrivateKey,
			githubAppInstallationId
		);
		let authKind = 'default-token';
		if (githubAppId && githubAppPrivateKey) {
			authKind = 'github-app';
		}
		logger.info('auth', { kind: authKind });
		const octokit = github.getOctokit(token);
		logger.info('orchestrating deploy');
		const deploymentUrl = await executeWithRetry(
			() => performVercelDeployment(octokit),
			ErrorHandler.handleVercel,
			3
		);
		if (deploymentUrl) {
			logger.info('deployment ready', { url: deploymentUrl });
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
				logger.info('deployment skipped', { lastUrl: lastUrl || 'n/a' });
				const rendered = renderCommentMarkdown(
					lastUrl || 'https://vercel.com',
					{
						firstContribution: isFirstTimeContributor,
						status: 'Skipped',
					}
				);
				const body = skipMessage || rendered;
				// Post as PR sticky comment when running in a PR; otherwise, if enabled, post a commit comment on push
				if (typeof pullRequestNumber === 'number' && pullRequestNumber >= 1) {
					logger.info('posting sticky PR skip comment');
					await ensureComment(octokit, body, { appendOverride: false });
				} else if (commentOnPush) {
					logger.info('posting commit skip comment on push');
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
			logger.info('handled push commit comment; exiting');
			return;
		}
		logger.info('validating options');
		await ensureComment(octokit, effectiveBody, { appendOverride: true });
		logger.info('ensured PR sticky comment with deployment link');
	} catch (error) {
		if (error instanceof Error) {
			core.setFailed(error.message);
		}
	}
}

run();
