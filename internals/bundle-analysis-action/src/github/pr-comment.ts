/**
 * @packageDocumentation
 * Utilities for posting bundle analysis comments on pull requests.
 */
import * as core from '@actions/core';

interface RepoRef {
	owner: string;
	repo: string;
}

interface IssueComment {
	id: number;
	body?: string | null;
}

type RequestParams = Record<string, unknown>;

export interface CommentOctokit {
	rest: {
		issues: {
			listComments: (
				params: RepoRef &
					RequestParams & {
						issue_number: number;
						page?: number;
						per_page?: number;
					}
			) => Promise<{ data: IssueComment[] }>;
			createComment: (
				params: RepoRef & RequestParams & { issue_number: number; body: string }
			) => Promise<{ data: { id: number } }>;
			updateComment: (
				params: RepoRef & RequestParams & { comment_id: number; body: string }
			) => Promise<unknown>;
		};
	};
}

interface ActionCore {
	setFailed: typeof core.setFailed;
	setOutput: typeof core.setOutput;
}

const defaultActionCore: ActionCore = {
	setFailed: core.setFailed,
	setOutput: core.setOutput,
};

let actionCore: ActionCore = defaultActionCore;

export const setPrCommentActionCoreForTests =
	function setPrCommentActionCoreForTests(nextCore: ActionCore): () => void {
		actionCore = nextCore;
		return () => {
			actionCore = defaultActionCore;
		};
	};

const autoStart = function autoStart(header: string): string {
	const key = (header || 'bundle-analysis').trim() || 'bundle-analysis';
	return `<!-- c15t:${key}:START -->`;
};

const autoEnd = function autoEnd(header: string): string {
	const key = (header || 'bundle-analysis').trim() || 'bundle-analysis';
	return `<!-- c15t:${key}:END -->`;
};

const bodyWithHeader = function bodyWithHeader(
	body: string,
	header: string
): string {
	return [autoStart(header), body, autoEnd(header)].join('\n');
};

export const findPreviousComment = async function findPreviousComment(
	octokit: CommentOctokit,
	repo: RepoRef,
	number: number,
	header: string
): Promise<{ id: number; body: string } | undefined> {
	const start = autoStart(header);
	let page = 1;
	const perPage = 100;

	while (true) {
		// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
		const { data } = await octokit.rest.issues.listComments({
			...repo,
			issue_number: number,
			page,
			per_page: perPage,
		});

		for (const comment of data) {
			if (comment.body?.includes(start)) {
				return {
					body: comment.body || '',
					id: comment.id,
				};
			}
		}

		if (data.length < perPage) {
			break;
		}

		page += 1;
	}

	return undefined;
};

export const createComment = async function createComment(
	octokit: CommentOctokit,
	repo: RepoRef,
	number: number,
	body: string,
	header: string
): Promise<{ id: number } | undefined> {
	const bodyWithHeaderText = bodyWithHeader(body, header);
	try {
		const { data } = await octokit.rest.issues.createComment({
			...repo,
			body: bodyWithHeaderText,
			issue_number: number,
		});
		return { id: data.id };
	} catch (error) {
		if (error instanceof Error) {
			actionCore.setFailed(`Failed to create comment: ${error.message}`);
		}
		return undefined;
	}
};

export const updateComment = async function updateComment(
	octokit: CommentOctokit,
	repo: RepoRef,
	commentId: number,
	body: string,
	header: string
): Promise<void> {
	const bodyWithHeaderText = bodyWithHeader(body, header);
	try {
		await octokit.rest.issues.updateComment({
			...repo,
			body: bodyWithHeaderText,
			comment_id: commentId,
		});
	} catch (error) {
		if (error instanceof Error) {
			actionCore.setFailed(`Failed to update comment: ${error.message}`);
		}
	}
};

export const ensureComment = async function ensureComment(
	octokit: CommentOctokit,
	repo: RepoRef,
	number: number,
	body: string,
	header: string
): Promise<void> {
	const previous = await findPreviousComment(octokit, repo, number, header);

	if (previous) {
		await updateComment(octokit, repo, previous.id, body, header);
		actionCore.setOutput('updated_comment_id', previous.id);
	} else {
		const created = await createComment(octokit, repo, number, body, header);
		if (created) {
			actionCore.setOutput('created_comment_id', created.id);
		}
	}
};
