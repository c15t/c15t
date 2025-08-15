import * as core from '@actions/core';
import { getOctokit } from '@actions/github';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	commentsEqual,
	createComment,
	deleteComment,
	findPreviousComment,
	getBodyOf,
	updateComment,
} from '../src/github/pr-comment';

vi.mock('@actions/core', () => ({
	warning: vi.fn(),
}));

const repo = {
	owner: 'c15t',
	repo: 'c15t',
};
beforeEach(() => {
	vi.clearAllMocks();
});
it('findPreviousComment', async () => {
	const authenticatedBotUser = { login: 'github-actions[bot]' };
	const authenticatedUser = { login: 'github-actions' };
	const otherUser = { login: 'some-user' };
	const comment = {
		id: '1',
		author: authenticatedUser,
		isMinimized: false,
		body: '<!-- c15t:c15t-docs-preview:START -->previous message<!-- c15t:c15t-docs-preview:END -->',
	};
	const commentWithCustomHeader = {
		id: '2',
		author: authenticatedUser,
		isMinimized: false,
		body: '<!-- c15t:TypeA:START -->previous message<!-- c15t:TypeA:END -->',
	};
	const headerFirstComment = {
		id: '3',
		author: authenticatedUser,
		isMinimized: false,
		body: '<!-- c15t:LegacyComment:START -->header first message<!-- c15t:LegacyComment:END -->',
	};
	const otherUserComment = {
		id: '4',
		author: otherUser,
		isMinimized: false,
		body: 'Fake previous message',
	};
	const otherComments = [
		{ id: '5', author: otherUser, isMinimized: false, body: 'lgtm' },
		{
			id: '6',
			author: authenticatedUser,
			isMinimized: false,
			body: '<!-- c15t:TypeB:START -->previous message<!-- c15t:TypeB:END -->',
		},
	];
	const octokit = getOctokit('github-token');
	vi.spyOn(octokit, 'graphql').mockResolvedValue({
		viewer: authenticatedBotUser,
		repository: {
			pullRequest: {
				comments: {
					nodes: [
						commentWithCustomHeader,
						otherUserComment,
						comment,
						headerFirstComment,
						...otherComments,
					],
					pageInfo: { hasNextPage: false, endCursor: '6' },
				},
			},
		},
	} as unknown);

	expect(await findPreviousComment(octokit, repo, 123, '')).toBe(comment);
	expect(await findPreviousComment(octokit, repo, 123, 'TypeA')).toBe(
		commentWithCustomHeader
	);
	expect(await findPreviousComment(octokit, repo, 123, 'LegacyComment')).toBe(
		headerFirstComment
	);
	expect(octokit.graphql).toBeCalledWith(expect.any(String), {
		after: null,
		number: 123,
		owner: repo.owner,
		repo: repo.repo,
	});
});

it('findPreviousComment with explicit authorLogin', async () => {
	const octokit = getOctokit('github-token');
	const consentComment = {
		id: '7',
		author: { login: 'consentdotio' },
		isMinimized: false,
		body: '<!-- c15t:c15t-docs-preview:START -->previous message<!-- c15t:c15t-docs-preview:END -->',
	};
	vi.spyOn(octokit, 'graphql').mockResolvedValue({
		viewer: { login: 'github-actions[bot]' },
		repository: {
			pullRequest: {
				comments: {
					nodes: [consentComment],
					pageInfo: { hasNextPage: false, endCursor: '7' },
				},
			},
		},
	} as unknown);

	const found = await findPreviousComment(
		octokit,
		repo,
		123,
		'',
		'consentdotio'
	);
	expect(found).toMatchObject({ id: '7' });
});

describe('updateComment', () => {
	const octokit = getOctokit('github-token');
	beforeEach(() => {
		vi.spyOn(octokit, 'graphql').mockResolvedValue('');
	});
	it('with comment body', async () => {
		expect(
			await updateComment(octokit, '456', 'hello there', '')
		).toBeUndefined();
		expect(octokit.graphql).toBeCalledWith(expect.any(String), {
			input: {
				id: '456',
				body: '<!-- c15t:c15t-docs-preview:START -->\nhello there\n<!-- c15t:c15t-docs-preview:END -->',
			},
		});
		expect(
			await updateComment(octokit, '456', 'hello there', 'TypeA')
		).toBeUndefined();
		expect(octokit.graphql).toBeCalledWith(expect.any(String), {
			input: {
				id: '456',
				body: '<!-- c15t:TypeA:START -->\nhello there\n<!-- c15t:TypeA:END -->',
			},
		});
		expect(
			await updateComment(
				octokit,
				'456',
				'hello there',
				'TypeA',
				'<!-- c15t:TypeA:START -->\nhello there\n<!-- c15t:TypeA:END -->'
			)
		).toBeUndefined();
		expect(octokit.graphql).toBeCalledWith(expect.any(String), {
			input: {
				id: '456',
				body: '<!-- c15t:TypeA:START -->\nhello there\nhello there\n<!-- c15t:TypeA:END -->',
			},
		});
	});
	it('without comment body and previous body', async () => {
		expect(await updateComment(octokit, '456', '', '')).toBeUndefined();
		expect(octokit.graphql).not.toBeCalled();
		expect(core.warning).toBeCalledWith('Comment body cannot be blank');
	});
});

describe('createComment', () => {
	const octokit = getOctokit('github-token');
	beforeEach(() => {
		vi.spyOn(octokit.rest.issues, 'createComment').mockResolvedValue({
			status: 201,
			url: 'https://api.github.local',
			headers: {} as Record<string, string>,
			data: { id: 1 } as unknown,
		} as Awaited<ReturnType<typeof octokit.rest.issues.createComment>>);
	});
	it('with comment body or previousBody', async () => {
		await expect(
			createComment(octokit, repo, 456, 'hello there', '')
		).resolves.toBeDefined();
		expect(octokit.rest.issues.createComment).toBeCalledWith({
			issue_number: 456,
			owner: repo.owner,
			repo: repo.repo,
			body: '<!-- c15t:c15t-docs-preview:START -->\nhello there\n<!-- c15t:c15t-docs-preview:END -->',
		});
		await expect(
			createComment(octokit, repo, 456, 'hello there', 'TypeA')
		).resolves.toBeDefined();
		expect(octokit.rest.issues.createComment).toBeCalledWith({
			issue_number: 456,
			owner: repo.owner,
			repo: repo.repo,
			body: '<!-- c15t:TypeA:START -->\nhello there\n<!-- c15t:TypeA:END -->',
		});
	});
	it('with previousBody unwraps and re-wraps content', async () => {
		await expect(
			createComment(octokit, repo, 456, 'hello', 'TypeA', 'prev')
		).resolves.toBeDefined();
		expect(octokit.rest.issues.createComment).toBeCalledWith({
			issue_number: 456,
			owner: repo.owner,
			repo: repo.repo,
			body: '<!-- c15t:TypeA:START -->\n\nhello\n<!-- c15t:TypeA:END -->',
		});
	});
	it('with previousBody containing headers unwraps inner content', async () => {
		const previousBodyWithHeaders =
			'<!-- c15t:TypeA:START -->\nprevious content\n<!-- c15t:TypeA:END -->';
		await expect(
			createComment(
				octokit,
				repo,
				456,
				'new content',
				'TypeA',
				previousBodyWithHeaders
			)
		).resolves.toBeDefined();
		expect(octokit.rest.issues.createComment).toBeCalledWith({
			issue_number: 456,
			owner: repo.owner,
			repo: repo.repo,
			body: '<!-- c15t:TypeA:START -->\nprevious content\nnew content\n<!-- c15t:TypeA:END -->',
		});
	});
	it('without comment body and previousBody', async () => {
		expect(await createComment(octokit, repo, 456, '', '')).toBeUndefined();
		expect(octokit.rest.issues.createComment).not.toBeCalled();
		expect(core.warning).toBeCalledWith('Comment body cannot be blank');
	});
	it('handles previousBody with malformed headers gracefully', async () => {
		const malformedPreviousBody =
			'<!-- c15t:TypeA:START -->\npartial content without end';
		await expect(
			createComment(
				octokit,
				repo,
				456,
				'new content',
				'TypeA',
				malformedPreviousBody
			)
		).resolves.toBeDefined();
		expect(octokit.rest.issues.createComment).toBeCalledWith({
			issue_number: 456,
			owner: repo.owner,
			repo: repo.repo,
			body: '<!-- c15t:TypeA:START -->\n\nnew content\n<!-- c15t:TypeA:END -->',
		});
	});
});

it('deleteComment', async () => {
	const octokit = getOctokit('github-token');
	vi.spyOn(octokit, 'graphql').mockResolvedValue('');
	expect(await deleteComment(octokit, '456')).toBeUndefined();
	expect(octokit.graphql).toBeCalledWith(expect.any(String), { id: '456' });
});

describe('getBodyOf', () => {
	const nullPrevious = {};
	const simplePrevious = {
		body: '<!-- c15t:TypeA:START -->\nhello there\n<!-- c15t:TypeA:END -->',
	};
	const detailsPrevious = {
		body: `
    <details open>
    <summary>title</summary>

    content
    </details>
    <!-- c15t:TypeA:START -->
    <!-- c15t:TypeA:END -->
  `,
	};
	const replaced = `
    <details>
    <summary>title</summary>

    content
    </details>
    <!-- c15t:TypeA:START -->
    <!-- c15t:TypeA:END -->
  `;
	it.each`
		append   | hideDetails | previous           | expected
		${false} | ${false}    | ${detailsPrevious} | ${undefined}
		${true}  | ${false}    | ${nullPrevious}    | ${undefined}
		${true}  | ${false}    | ${detailsPrevious} | ${detailsPrevious.body}
		${true}  | ${true}     | ${nullPrevious}    | ${undefined}
		${true}  | ${true}     | ${simplePrevious}  | ${simplePrevious.body}
		${true}  | ${true}     | ${detailsPrevious} | ${replaced}
	`(
		'receive $previous, $append, $hideDetails and returns $expected',
		({
			append,
			hideDetails,
			previous,
			expected,
		}: {
			append: boolean;
			hideDetails: boolean;
			previous: { body?: string };
			expected: string | undefined;
		}) => {
			expect(getBodyOf(previous, append, hideDetails)).toEqual(expected);
		}
	);
});

describe('commentsEqual', () => {
	it.each([
		{
			body: 'body',
			previous: '<!-- c15t:header:START -->\nbody\n<!-- c15t:header:END -->',
			header: 'header',
			expected: true,
		},
		{
			body: 'body',
			previous:
				'<!-- c15t:c15t-docs-preview:START -->\nbody\n<!-- c15t:c15t-docs-preview:END -->',
			header: '',
			expected: true,
		},
		{
			body: 'body',
			previous: '<!-- c15t:header2:START -->\nbody\n<!-- c15t:header2:END -->',
			header: 'header',
			expected: false,
		},
		{ body: 'body', previous: 'body', header: 'header', expected: true },
		{ body: 'body', previous: '', header: 'header', expected: false },
		{ body: '', previous: 'body', header: 'header', expected: false },
	])(
		'commentsEqual(%s, %s, %s)',
		({
			body,
			previous,
			header,
			expected,
		}: {
			body: string;
			previous: string;
			header: string;
			expected: boolean;
		}) => {
			expect(commentsEqual(body, previous, header)).toEqual(expected);
		}
	);
});
