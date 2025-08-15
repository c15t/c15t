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
import type { ReportedContentClassifiers } from '@octokit/graphql-schema';

/**
 * Pull request number to operate on.
 *
 * Resolved from the GitHub context or the optional `number` input.
 */
export const pullRequestNumber =
	context?.payload?.pull_request?.number ||
	+core.getInput('number', { required: false });

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
export const recreate = core.getBooleanInput('recreate', { required: true });
/** Whether to minimize and then recreate a new sticky comment. */
export const hideAndRecreate = core.getBooleanInput('hide_and_recreate', {
	required: true,
});
/** Classifier used when minimizing the previous comment. */
export const hideClassify = core.getInput('hide_classify', {
	required: true,
}) as ReportedContentClassifiers;
/** Whether to delete the old sticky comment without creating a new one. */
export const deleteOldComment = core.getBooleanInput('delete', {
	required: true,
});
/** Only create a comment when none exists. */
export const onlyCreateComment = core.getBooleanInput('only_create', {
	required: true,
});
/** Only update an existing comment, do nothing if none exists. */
export const onlyUpdateComment = core.getBooleanInput('only_update', {
	required: true,
});
/** Skip updating when the computed body is unchanged. */
export const skipUnchanged = core.getBooleanInput('skip_unchanged', {
	required: true,
});
/** Minimize the existing comment instead of updating it. */
export const hideOldComment = core.getBooleanInput('hide', { required: true });
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
export const authorLogin =
	core.getInput('author_login', { required: false }) || 'c15t';

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
