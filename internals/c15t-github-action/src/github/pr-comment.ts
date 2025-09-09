/**
 * Utilities for discovering and managing a sticky pull request comment.
 *
 * This module encapsulates all direct interactions with GitHub's GraphQL
 * and REST APIs that are needed by the action. Operations include finding an
 * existing comment, creating, updating, deleting, minimizing, and extracting
 * or transforming bodies with a persistent header marker so we can detect the
 * correct comment in subsequent runs.
 */
import * as core from '@actions/core';
import type { GitHub } from '@actions/github/lib/utils';
import type { IssueComment, Repository, User } from '@octokit/graphql-schema';

// Precompiled regexes
const RE_BOT_SUFFIX = /\[bot\]$/i;
const RE_DETAILS_OPEN = /(<details.*?)\s*\bopen\b(.*>)/g;

type CreateCommentResponse = Awaited<
	ReturnType<InstanceType<typeof GitHub>['rest']['issues']['createComment']>
>;

function autoStart(header: string): string {
	const key = (header || 'c15t-docs-preview').trim() || 'c15t-docs-preview';
	return `<!-- c15t:${key}:START -->`;
}

function autoEnd(header: string): string {
	const key = (header || 'c15t-docs-preview').trim() || 'c15t-docs-preview';
	return `<!-- c15t:${key}:END -->`;
}

function bodyWithHeader(body: string, header: string): string {
	return [autoStart(header), body, autoEnd(header)].join('\n');
}

function bodyWithoutHeader(body: string, header: string): string {
	const start = autoStart(header);
	const end = autoEnd(header);
	const i = body.indexOf(start);
	const j = body.indexOf(end);
	if (i !== -1 && j !== -1) {
		// Return inner content only, markers excluded
		return body.substring(i + start.length, j).trim();
	}
	return '';
}

export async function findPreviousComment(
	octokit: InstanceType<typeof GitHub>,
	repo: { owner: string; repo: string },
	number: number,
	header: string,
	authorLogin?: string
): Promise<IssueComment | undefined> {
	let after: string | null = null;
	let hasNextPage = true;
	const start = autoStart(header);
	while (hasNextPage) {
		const data = await octokit.graphql<{
			repository: Repository;
			viewer: User;
		}>(
			`
      query($repo: String! $owner: String! $number: Int! $after: String) {
        viewer { login }
        repository(name: $repo owner: $owner) {
          pullRequest(number: $number) {
            comments(first: 100 after: $after) {
              nodes { id author { login } isMinimized body }
              pageInfo { endCursor hasNextPage }
            }
          }
        }
      }
      `,
			{ ...repo, after, number }
		);

		const viewer = data.viewer as User;
		const repository = data.repository as Repository;
		const normalizeLogin = (login: string | null | undefined): string =>
			(login ?? '').replace(RE_BOT_SUFFIX, '').trim().toLowerCase();
		const expectedLogin = normalizeLogin(authorLogin ?? viewer.login);
		const target = repository.pullRequest?.comments?.nodes?.find(
			(node: IssueComment | null | undefined) =>
				normalizeLogin(node?.author?.login) === expectedLogin &&
				!node?.isMinimized &&
				Boolean(node?.body?.includes(start))
		);
		if (target) {
			return target;
		}
		after = repository.pullRequest?.comments?.pageInfo?.endCursor ?? null;
		hasNextPage =
			repository.pullRequest?.comments?.pageInfo?.hasNextPage ?? false;
	}
	return undefined;
}

export async function updateComment(
	octokit: InstanceType<typeof GitHub>,
	id: string,
	body: string,
	header: string,
	previousBody?: string
): Promise<void> {
	if (!body && !previousBody) {
		return core.warning('Comment body cannot be blank');
	}
	let rawPreviousBody = '';
	if (previousBody) {
		rawPreviousBody = bodyWithoutHeader(previousBody, header);
	}
	await octokit.graphql(
		`
    mutation($input: UpdateIssueCommentInput!) {
      updateIssueComment(input: $input) { issueComment { id body } }
    }
    `,
		{
			input: {
				id,
				body: previousBody
					? bodyWithHeader(`${rawPreviousBody}\n${body}`, header)
					: bodyWithHeader(body, header),
			},
		}
	);
}

export async function createComment(
	octokit: InstanceType<typeof GitHub>,
	repo: { owner: string; repo: string },
	issue_number: number,
	body: string,
	header: string,
	previousBody?: string
): Promise<CreateCommentResponse | undefined> {
	if (!body && !previousBody) {
		core.warning('Comment body cannot be blank');
		return;
	}
	let rawPreviousBody = '';
	if (previousBody) {
		rawPreviousBody = bodyWithoutHeader(previousBody, header);
	}
	let composed = bodyWithHeader(body, header);
	if (previousBody) {
		composed = bodyWithHeader(`${rawPreviousBody}\n${body}`, header);
	}
	return await octokit.rest.issues.createComment({
		...repo,
		issue_number,
		body: composed,
	});
}

export async function deleteComment(
	octokit: InstanceType<typeof GitHub>,
	id: string
): Promise<void> {
	await octokit.graphql(
		`
    mutation($id: ID!) { deleteIssueComment(input: { id: $id }) { clientMutationId } }
    `,
		{ id }
	);
}

export function getBodyOf(
	previous: { body?: string },
	append: boolean,
	hideDetails: boolean
): string | undefined {
	if (!append) {
		return undefined;
	}
	if (!hideDetails || !previous.body) {
		return previous.body;
	}
	return previous.body.replace(RE_DETAILS_OPEN, '$1$2');
}

export function commentsEqual(
	body: string,
	previous: string | undefined,
	header: string
): boolean {
	const start = autoStart(header);
	const end = autoEnd(header);
	const normalize = (s: string): string => {
		const i = s.indexOf(start);
		const j = s.indexOf(end);
		if (i !== -1 && j !== -1) {
			return s.substring(i + start.length, j).trim();
		}
		return s;
	};
	return normalize(body) === normalize(previous || '');
}
