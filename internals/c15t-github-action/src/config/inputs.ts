/**
 * Configuration and input resolution for the c15t GitHub Action.
 *
 * This module centralizes access to all action inputs (with defaults where
 * applicable) and exposes helpers for building the repository target and
 * resolving the comment body from either a literal message or file paths.
 */
import { readFileSync } from 'node:fs';
import * as core from '@actions/core';
import { context } from '@actions/github';
import { create } from '@actions/glob';

// import type { ReportedContentClassifiers } from '@octokit/graphql-schema';

/**
 * Pull request number to operate on.
 *
 * Resolved from the GitHub context or the optional `number` input.
 */
const inputNumber = core.getInput('number', { required: false });
export const pullRequestNumber =
	context?.payload?.pull_request?.number ??
	(inputNumber ? Number(inputNumber) : undefined);

/** True when the PR author appears to be a first-time contributor. */
export const isFirstTimeContributor = (() => {
	const assoc = context?.payload?.pull_request?.author_association || '';
	return assoc === 'FIRST_TIMER' || assoc === 'FIRST_TIME_CONTRIBUTOR';
})();

/**
 * Repository descriptor where the action will run.
 */
export const repo = buildRepo();
/** Header text appended to the sticky comment marker. */
export const header = core.getInput('header', { required: false });
/** Whether to append to the previous body if present. */
export const append = core.getBooleanInput('append', { required: true });
/** Whether to close any open <details> blocks when appending. */
export const hideDetails = core.getBooleanInput('hide_details', {
	required: true,
});
/** Whether to delete the previous sticky comment before posting. */
// pruned: recreate/hide/hide_and_recreate/delete/only_* flows for internal use
/** Skip updating when the computed body is unchanged. */
export const skipUnchanged = core.getBooleanInput('skip_unchanged', {
	required: true,
});
/** GitHub token used to authenticate API requests. */
export const githubToken = core.getInput('GITHUB_TOKEN', { required: true });
/** When true, do nothing if the resolved body is empty. */
export const ignoreEmpty = core.getBooleanInput('ignore_empty', {
	required: true,
});
/**
 * Optional explicit author login used to identify the sticky comment author.
 * Defaults to the authenticated actor. Set to a fixed value like
 * "consentdotio" to ensure we always match that user's comments.
 */
export const authorLogin = core.getInput('author_login', { required: false });

/** Vercel token to authenticate API requests. */
export const vercelToken = core.getInput('vercel_token', { required: false });
/** Vercel project ID. */
export const vercelProjectId = core.getInput('vercel_project_id', {
	required: false,
});
/** Vercel org/team ID. */
export const vercelOrgId = core.getInput('vercel_org_id', { required: false });
/** Directory to deploy (relative to repo root). */
export const vercelWorkingDirectory =
	core.getInput('working_directory', { required: false }) || '.docs';
/** Vercel framework name. */
export const vercelFramework =
	core.getInput('framework', { required: false }) || 'nextjs';
/** Explicit target override: production|staging. */
export const vercelTarget = core.getInput('target', { required: false }) as
	| 'production'
	| 'staging'
	| '';
/** Optional alias to assign on matching branch. */
export const canaryAlias = core.getInput('canary_alias', { required: false });
/** Branch name which triggers alias assignment. */
export const aliasOnBranch = core.getInput('assign_alias_on_branch', {
	required: false,
});

/** Newline-separated alias domains to assign (supports templating). */
export const aliasDomains = core
	.getMultilineInput('alias_domains', { required: false })
	.filter(Boolean);
/** Pass-through vercel args (currently supports -m/--meta pairs). */
export const vercelArgs = core.getInput('vercel_args', { required: false });
/** Vercel scope/team slug override. */
export const vercelScope = core.getInput('vercel_scope', { required: false });

/** Also comment on push (commit) events. */
export const commentOnPush = core.getBooleanInput('comment_on_push', {
	required: false,
});

/** Enable verbose debug logging */
export const debugMode = core.getBooleanInput('debug_mode', {
	required: false,
});

// --- Orchestration & gating (for minimal workflows)
export const setupDocs = core.getBooleanInput('setup_docs', {
	required: false,
});
export const consentGitToken = core.getInput('consent_git_token', {
	required: false,
});
export const docsTemplateRepo =
	core.getInput('docs_template_repo', { required: false }) ||
	'consentdotio/c15t-docs';
export const docsTemplateRef =
	core.getInput('docs_template_ref', { required: false }) || 'main';
export const onlyIfChanged = core.getBooleanInput('only_if_changed', {
	required: false,
});
export const changeGlobs = core
	.getMultilineInput('change_globs', { required: false })
	.filter(Boolean);
export const checkTemplateChanges = core.getBooleanInput(
	'check_template_changes',
	{ required: false }
);
export const templateRepo = core.getInput('template_repo', { required: false });
export const postSkipComment = core.getBooleanInput('post_skip_comment', {
	required: false,
});
export const skipMessage = core.getInput('skip_message', { required: false });
export const deployOnPushBranches = core.getInput('deploy_on_push_branches', {
	required: false,
});
export const deployOnPrBaseBranches = core.getInput(
	'deploy_on_pr_base_branches',
	{ required: false }
);

// --- GitHub App authentication (optional)
export const githubAppId = core.getInput('github_app_id', { required: false });
export const githubAppPrivateKey = core.getInput('github_app_private_key', {
	required: false,
});
export const githubAppInstallationId = core.getInput(
	'github_app_installation_id',
	{ required: false }
);

/**
 * Builds the repository descriptor from action inputs and context.
 *
 * @returns The `{ owner, repo }` tuple used by the GitHub API
 */
function buildRepo(): { repo: string; owner: string } {
	return {
		owner: core.getInput('owner', { required: false }) || context.repo.owner,
		repo: core.getInput('repo', { required: false }) || context.repo.repo,
	};
}

/**
 * Resolves the comment body to post. When `path` inputs are provided, this
 * reads and concatenates all matched files; otherwise it returns the `message`
 * input value.
 *
 * @returns The body text to post. Returns an empty string on failure when
 * reading files, after logging the failure via `core.setFailed`.
 *
 * @throws {Error} Underlying filesystem errors are caught and converted into
 * a failure via `core.setFailed`, and an empty string is returned instead.
 *
 * @example
 * // In action.yml configuration, provide either:
 * // - inputs.message: a literal string, or
 * // - inputs.path: one or more globs to read files from
 */
export async function getBody(): Promise<string> {
	const pathInput = core.getMultilineInput('path', { required: false });
	const followSymbolicLinks = core.getBooleanInput('follow_symbolic_links', {
		required: true,
	});
	if (pathInput && pathInput.length > 0) {
		try {
			const globber = await create(pathInput.join('\n'), {
				followSymbolicLinks,
				matchDirectories: false,
			});
			return (await globber.glob())
				.map((path) => readFileSync(path, 'utf-8'))
				.join('\n');
		} catch (error) {
			if (error instanceof Error) {
				core.setFailed(error.message);
			}
			return '';
		}
	} else {
		return core.getInput('message', { required: false });
	}
}
