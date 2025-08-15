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
import type {
	IssueComment,
	ReportedContentClassifiers,
	Repository,
	User,
} from '@octokit/graphql-schema';

type CreateCommentResponse = Awaited<
	ReturnType<InstanceType<typeof GitHub>['rest']['issues']['createComment']>
>;

/**
 * Builds the sentinel HTML comment used to mark a sticky PR comment.
 *
 * @param header - The configured header text to append after the marker.
 * @returns The marker string that is embedded at the end of bodies.
 */
function headerComment(header: string): string {
	return `<!-- Sticky Pull Request Comment${header} -->`;
}

/**
 * Appends the header marker to a body.
 *
 * @param body - The comment body.
 * @param header - The configured header text.
 * @returns The body with the header marker appended.
 */
function bodyWithHeader(body: string, header: string): string {
	return `${body}\n${headerComment(header)}`;
}

/**
 * Removes the header marker from a body if present.
 *
 * @param body - The comment body that may include the marker.
 * @param header - The configured header text used to build the marker.
 * @returns The body without the header marker.
 */
function bodyWithoutHeader(body: string, header: string): string {
	return body.replace(`\n${headerComment(header)}`, '');
}

/**
 * Finds the previous sticky comment authored by the current action user on a
 * pull request. It pages through PR comments using GraphQL until it finds a
 * non-minimized comment containing the sentinel header.
 *
 * @param octokit - Authenticated GitHub client instance
 * @param repo - The repository owner and name
 * @param number - The pull request number
 * @param header - Header text used to identify the sticky comment
 * @returns The found `IssueComment` or `undefined` if none exists
 *
 * @throws {Error} Propagates underlying network or GraphQL errors
 */
export async function findPreviousComment(
	octokit: InstanceType<typeof GitHub>,
	repo: {
		owner: string;
		repo: string;
	},
	number: number,
	header: string,
	/**
	 * Optional explicit author login to match against when locating the
	 * previous sticky comment. When omitted, the authenticated viewer's login
	 * is used. The comparison normalizes GitHub bot suffixes like "[bot]".
	 */
	authorLogin?: string
): Promise<IssueComment | undefined> {
	let after: string | null = null;
	let hasNextPage = true;
	const h = headerComment(header);
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
              nodes {
                id
                author {
                  login
                }
                isMinimized
                body
              }
              pageInfo {
                endCursor
                hasNextPage
              }
            }
          }
        }
      }
      `,
			{ ...repo, after, number }
		);
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
		const viewer = data.viewer as User;
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
		const repository = data.repository as Repository;
		const normalizeLogin = (login: string | null | undefined): string =>
			(login ?? '').replace('[bot]', '').trim().toLowerCase();

		const expectedLogin = normalizeLogin(authorLogin ?? viewer.login);

		const target = repository.pullRequest?.comments?.nodes?.find(
			(node: IssueComment | null | undefined) =>
				normalizeLogin(node?.author?.login) === expectedLogin &&
				!node?.isMinimized &&
				node?.body?.includes(h)
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

/**
 * Updates an existing comment's body. When `previousBody` is present, this will
 * append the new `body` content after the existing, while keeping the header
 * marker at the end. If neither `body` nor `previousBody` exist, a warning is
 * logged and no update is performed.
 *
 * @param octokit - Authenticated GitHub client instance
 * @param id - GraphQL node ID for the comment
 * @param body - New comment content to set or append
 * @param header - Header text used for the sticky marker
 * @param previousBody - Optional previous body (possibly without header)
 * @returns A promise that resolves when the update completes
 *
 * @throws {Error} Propagates underlying network or GraphQL errors
 */
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

	const rawPreviousBody: string = previousBody
		? bodyWithoutHeader(previousBody, header)
		: '';

	await octokit.graphql(
		`
    mutation($input: UpdateIssueCommentInput!) {
      updateIssueComment(input: $input) {
        issueComment {
          id
          body
        }
      }
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
/**
 * Creates a new issue/PR comment. If `previousBody` is provided, it will be
 * prepended to the `body` to preserve the historical content, otherwise the
 * header marker will be appended to the new body to mark it as sticky.
 *
 * @param octokit - Authenticated GitHub client instance
 * @param repo - The repository owner and name
 * @param issue_number - The issue/PR number
 * @param body - The comment body to create
 * @param header - Header text used for the sticky marker
 * @param previousBody - Optional previous body to prepend
 * @returns The REST create comment response, or undefined when nothing is created
 *
 * @throws {Error} Propagates underlying REST errors
 */
export async function createComment(
	octokit: InstanceType<typeof GitHub>,
	repo: {
		owner: string;
		repo: string;
	},
	issue_number: number,
	body: string,
	header: string,
	previousBody?: string
): Promise<CreateCommentResponse | undefined> {
	if (!body && !previousBody) {
		core.warning('Comment body cannot be blank');
		return;
	}

	return await octokit.rest.issues.createComment({
		...repo,
		issue_number,
		body: previousBody
			? `${previousBody}\n${body}`
			: bodyWithHeader(body, header),
	});
}
/**
 * Deletes a comment by its GraphQL node ID.
 *
 * @param octokit - Authenticated GitHub client instance
 * @param id - GraphQL node ID of the comment to delete
 * @returns A promise that resolves when the delete completes
 *
 * @throws {Error} Propagates underlying GraphQL errors
 */
export async function deleteComment(
	octokit: InstanceType<typeof GitHub>,
	id: string
): Promise<void> {
	await octokit.graphql(
		`
    mutation($id: ID!) {
      deleteIssueComment(input: { id: $id }) {
        clientMutationId
      }
    }
    `,
		{ id }
	);
}
/**
 * Minimizes a comment using one of GitHub's `ReportedContentClassifiers`.
 *
 * @param octokit - Authenticated GitHub client instance
 * @param subjectId - GraphQL node ID of the comment to minimize
 * @param classifier - The classifier reason to minimize under
 * @returns A promise that resolves when the minimize completes
 *
 * @throws {Error} Propagates underlying GraphQL errors
 */
export async function minimizeComment(
	octokit: InstanceType<typeof GitHub>,
	subjectId: string,
	classifier: ReportedContentClassifiers
): Promise<void> {
	await octokit.graphql(
		`
    mutation($input: MinimizeCommentInput!) {
      minimizeComment(input: $input) {
        clientMutationId
      }
    }
    `,
		{ input: { subjectId, classifier } }
	);
}

/**
 * Computes the body that should be used as a base when appending, optionally
 * removing the `open` attribute from HTML details sections to avoid rendering
 * them expanded.
 *
 * @param previous - Object containing the previous body text
 * @param append - Whether we should append to the previous body
 * @param hideDetails - When true, close any open <details> blocks
 * @returns The body to prepend/append or `undefined` when not appending
 */
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

	return previous.body.replace(/(<details.*?)\s*\bopen\b(.*>)/g, '$1$2');
}

/**
 * Checks if a to-be-posted body would be identical to a previous sticky
 * comment body, accounting for the header marker.
 *
 * @param body - The proposed new comment content
 * @param previous - The previous comment body (if any)
 * @param header - Header text used to build the marker
 * @returns True when the new post would be unchanged
 */
export function commentsEqual(
	body: string,
	previous: string | undefined,
	header: string
): boolean {
	const newBody = bodyWithHeader(body, header);
	return newBody === previous;
}
