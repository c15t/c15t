/**
 * @packageDocumentation
 * Utilities for posting bundle analysis comments on pull requests.
 */
import * as core from '@actions/core';
import type { GitHub } from '@actions/github/lib/utils';

const RE_BOT_SUFFIX = /\[bot\]$/i;

function autoStart(header: string): string {
	const key = (header || 'bundle-analysis').trim() || 'bundle-analysis';
	return `<!-- c15t:${key}:START -->`;
}

function autoEnd(header: string): string {
	const key = (header || 'bundle-analysis').trim() || 'bundle-analysis';
	return `<!-- c15t:${key}:END -->`;
}

function bodyWithHeader(body: string, header: string): string {
	return [autoStart(header), body, autoEnd(header)].join('\n');
}

export async function findPreviousComment(
	octokit: InstanceType<typeof GitHub>,
	repo: { owner: string; repo: string },
	number: number,
	header: string
): Promise<{ id: number; body: string } | undefined> {
	const start = autoStart(header);
	let after: string | null = null;
	let hasNextPage = true;

	while (hasNextPage) {
		const { data } = await octokit.rest.issues.listComments({
			...repo,
			issue_number: number,
			per_page: 100,
		});

		for (const comment of data) {
			if (comment.body?.includes(start)) {
				return {
					id: comment.id,
					body: comment.body || '',
				};
			}
		}

		hasNextPage = data.length === 100;
		if (hasNextPage && data.length > 0) {
			after = String(data[data.length - 1]?.id);
		} else {
			break;
		}
	}

	return undefined;
}

export async function createComment(
	octokit: InstanceType<typeof GitHub>,
	repo: { owner: string; repo: string },
	number: number,
	body: string,
	header: string
): Promise<{ id: number } | undefined> {
	const bodyWithHeaderText = bodyWithHeader(body, header);
	try {
		const { data } = await octokit.rest.issues.createComment({
			...repo,
			issue_number: number,
			body: bodyWithHeaderText,
		});
		return { id: data.id };
	} catch (error) {
		if (error instanceof Error) {
			core.setFailed(`Failed to create comment: ${error.message}`);
		}
		return undefined;
	}
}

export async function updateComment(
	octokit: InstanceType<typeof GitHub>,
	repo: { owner: string; repo: string },
	commentId: number,
	body: string,
	header: string
): Promise<void> {
	const bodyWithHeaderText = bodyWithHeader(body, header);
	try {
		await octokit.rest.issues.updateComment({
			...repo,
			comment_id: commentId,
			body: bodyWithHeaderText,
		});
	} catch (error) {
		if (error instanceof Error) {
			core.setFailed(`Failed to update comment: ${error.message}`);
		}
	}
}

export async function ensureComment(
	octokit: InstanceType<typeof GitHub>,
	repo: { owner: string; repo: string },
	number: number,
	body: string,
	header: string
): Promise<void> {
	const previous = await findPreviousComment(octokit, repo, number, header);

	if (previous) {
		await updateComment(octokit, repo, previous.id, body, header);
		core.setOutput('updated_comment_id', previous.id);
	} else {
		const created = await createComment(octokit, repo, number, body, header);
		if (created) {
			core.setOutput('created_comment_id', created.id);
		}
	}
}
