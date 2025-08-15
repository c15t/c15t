/**
 * @packageDocumentation
 * Entry point for the c15t GitHub Action that manages a sticky
 * pull request comment. The action can create, update, minimize,
 * delete, or recreate a PR comment, and optionally append to the
 * existing content while preserving a sentinel header.
 *
 * The behavior is configured via inputs read in `config.ts` and the
 * actual comment operations are implemented in `comment.ts`.
 *
 * @see `./config.ts`
 * @see `./comment.ts`
 */
import * as core from '@actions/core';
import * as github from '@actions/github';
import {
	getBody,
	githubAppId,
	githubAppInstallationId,
	githubAppPrivateKey,
	githubToken,
	isFirstTimeContributor,
	postSkipComment,
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
		const token = await getAuthToken(
			githubToken,
			githubAppId,
			githubAppPrivateKey,
			githubAppInstallationId
		);
		const octokit = github.getOctokit(token);
		const deploymentUrl = await performVercelDeployment(octokit);
		if (!deploymentUrl) {
			// Deployment was skipped by policy/gating. Optionally post a sticky skip comment.
			if (postSkipComment) {
				const body =
					skipMessage ||
					'🟡 Documentation deploy skipped.\n\nReason: Policy or gating rules determined no deploy was needed.';
				await ensureComment(octokit, body);
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
			return;
		}
		validateOptions();
		await ensureComment(octokit, effectiveBody);
	} catch (error) {
		if (error instanceof Error) {
			core.setFailed(error.message);
		}
	}
}

run();
