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
	commentsEqual,
	createComment,
	deleteComment,
	findPreviousComment,
	getBodyOf,
	minimizeComment,
	updateComment,
} from './comment';
import {
	aliasDomains,
	aliasOnBranch,
	append,
	authorLogin,
	canaryAlias,
	commentOnPush,
	deleteOldComment,
	getBody,
	githubToken,
	header,
	hideAndRecreate,
	hideClassify,
	hideDetails,
	hideOldComment,
	ignoreEmpty,
	onlyCreateComment,
	onlyUpdateComment,
	pullRequestNumber,
	recreate,
	repo,
	skipUnchanged,
	vercelArgs,
	vercelFramework,
	vercelOrgId,
	vercelProjectId,
	vercelScope,
	vercelTarget,
	vercelToken,
	vercelWorkingDirectory,
} from './config';
import { type DeployTarget, deployToVercel } from './deploy';

function buildDefaultPreviewComment(url: string, projectLabel: string): string {
	const updated = new Date().toUTCString();
	const ascii = [
		'          _____                    _____',
		"      ---'   __\\______      ______/__   `---",
		'                ______)    (______',
		'                __)            (__',
		'               __)              (__',
		'      ---.______)                 (______.---',
		'',
		'            Your docs preview is ready',
	].join('\n');

	return [
		'```',
		ascii,
		'```',
		'| Preview | Status | Updated (UTC) |',
		'| - | - | - |',
		`| [Open Preview](${url}) | Ready | ${updated} |`,
	].join('\n');
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
		const octokit = github.getOctokit(githubToken);
		// Perform deployment first if configured; commenting may be skipped later
		// If Vercel inputs are provided, perform deployment first
		let deploymentUrl: string | undefined;
		let environmentName: string | undefined;
		let deploymentId: number | undefined;
		const ref = github.context.ref || '';
		const headRef =
			(github.context as unknown as { head_ref?: string }).head_ref || '';
		const branch =
			headRef ||
			(ref.startsWith('refs/heads/') ? ref.replace('refs/heads/', '') : ref);
		if (vercelToken && vercelProjectId && vercelOrgId) {
			// Create GitHub Deployment (best-effort)
			const targetHint =
				(vercelTarget as DeployTarget) ||
				(branch === 'main'
					? ('production' as DeployTarget)
					: ('staging' as DeployTarget));
			environmentName =
				targetHint === 'production' ? 'production' : `preview/${branch}`;
			try {
				const ghDeployment = await octokit.rest.repos.createDeployment({
					...github.context.repo,
					ref: github.context.sha,
					required_contexts: [],
					environment: environmentName,
					transient_environment: environmentName !== 'production',
					production_environment: environmentName === 'production',
					auto_merge: false,
					auto_inactive: false,
					description: 'Vercel deployment',
				});
				deploymentId = (ghDeployment as unknown as { data?: { id?: number } })
					.data?.id;
				if (typeof deploymentId === 'number') {
					await octokit.rest.repos.createDeploymentStatus({
						...github.context.repo,
						deployment_id: deploymentId,
						state: 'in_progress',
						description: 'Starting Vercel deploy',
					});
				}
			} catch (e) {
				core.warning(
					`Could not create GitHub Deployment: ${e instanceof Error ? e.message : String(e)}`
				);
			}
			const result = await deployToVercel({
				token: vercelToken,
				projectId: vercelProjectId,
				orgId: vercelOrgId,
				workingDirectory: vercelWorkingDirectory,
				framework: vercelFramework,
				target: (vercelTarget as DeployTarget) || undefined,
				aliasDomain: canaryAlias || undefined,
				aliasBranch: aliasOnBranch || undefined,
				aliasDomains,
				vercelArgs,
				vercelScope,
			});
			deploymentUrl = result.url;
			core.setOutput('deployment_url', deploymentUrl);
			// Mark success
			if (typeof deploymentId === 'number') {
				try {
					await octokit.rest.repos.createDeploymentStatus({
						...github.context.repo,
						deployment_id: deploymentId,
						state: 'success',
						description: `Preview ready${environmentName ? `: ${environmentName}` : ''}`,
						environment_url: deploymentUrl,
					});
				} catch (e) {
					core.warning(
						`Could not set deployment success: ${e instanceof Error ? e.message : String(e)}`
					);
				}
			}
		}

		const body = await getBody();
		const effectiveBody =
			deploymentUrl && !body
				? buildDefaultPreviewComment(deploymentUrl, vercelProjectId || 'docs')
				: body;

		// If not a PR, optionally comment on push (commit) events; otherwise skip
		if (Number.isNaN(pullRequestNumber) || pullRequestNumber < 1) {
			if (!commentOnPush) {
				core.info('no pull request number: deploy done, commenting skipped');
				return;
			}
			// Commit comment path
			if (deploymentUrl) {
				try {
					await octokit.rest.repos.createCommitComment({
						...github.context.repo,
						commit_sha: github.context.sha,
						body:
							effectiveBody ||
							buildDefaultPreviewComment(
								deploymentUrl,
								vercelProjectId || 'docs'
							),
					});
				} catch (e) {
					core.warning(
						`Could not post commit comment: ${e instanceof Error ? e.message : String(e)}`
					);
				}
			}
			return;
		}

		if (!body && ignoreEmpty) {
			core.info('no body given: skip step by ignoreEmpty');
			return;
		}

		if (!deleteOldComment && !hideOldComment && !effectiveBody) {
			throw new Error(
				'Either message/path input is required or Vercel inputs must be set'
			);
		}

		if (deleteOldComment && recreate) {
			throw new Error('delete and recreate cannot be both set to true');
		}

		if (onlyCreateComment && onlyUpdateComment) {
			throw new Error('only_create and only_update cannot be both set to true');
		}

		if (hideOldComment && hideAndRecreate) {
			throw new Error('hide and hide_and_recreate cannot be both set to true');
		}

		const previous = await findPreviousComment(
			octokit,
			repo,
			pullRequestNumber,
			header,
			authorLogin || undefined
		);

		core.setOutput('previous_comment_id', previous?.id);

		if (deleteOldComment) {
			if (previous) {
				await deleteComment(octokit, previous.id);
			}
			return;
		}

		if (!previous) {
			if (onlyUpdateComment) {
				return;
			}
			const created = await createComment(
				octokit,
				repo,
				pullRequestNumber,
				effectiveBody || '',
				header
			);
			core.setOutput('created_comment_id', created?.data.id);
			return;
		}

		if (onlyCreateComment) {
			// don't comment anything, user specified only_create and there is an
			// existing comment, so this is probably a placeholder / introduction one.
			return;
		}

		if (hideOldComment) {
			await minimizeComment(octokit, previous.id, hideClassify);
			return;
		}

		if (
			skipUnchanged &&
			commentsEqual(effectiveBody || '', previous.body || '', header)
		) {
			// don't recreate or update if the message is unchanged
			return;
		}

		const previousBody = getBodyOf(
			{ body: previous.body || '' },
			append,
			hideDetails
		);
		if (recreate) {
			await deleteComment(octokit, previous.id);
			const created = await createComment(
				octokit,
				repo,
				pullRequestNumber,
				effectiveBody || '',
				header,
				previousBody
			);
			core.setOutput('created_comment_id', created?.data.id);
			return;
		}

		if (hideAndRecreate) {
			await minimizeComment(octokit, previous.id, hideClassify);
			const created = await createComment(
				octokit,
				repo,
				pullRequestNumber,
				effectiveBody || '',
				header
			);
			core.setOutput('created_comment_id', created?.data.id);
			return;
		}

		await updateComment(
			octokit,
			previous.id,
			effectiveBody || '',
			header,
			previousBody
		);
	} catch (error) {
		if (error instanceof Error) {
			core.setFailed(error.message);
		}
	}
}

run();
