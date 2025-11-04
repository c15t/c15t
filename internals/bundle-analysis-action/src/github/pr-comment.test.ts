import * as core from '@actions/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	createComment,
	ensureComment,
	findPreviousComment,
	updateComment,
} from '../github/pr-comment';

// Mock @actions/core
vi.mock('@actions/core', () => ({
	default: {
		setFailed: vi.fn(),
		setOutput: vi.fn(),
	},
	setFailed: vi.fn(),
	setOutput: vi.fn(),
}));

// Mock @actions/github
const mockOctokit = {
	rest: {
		issues: {
			listComments: vi.fn(),
			createComment: vi.fn(),
			updateComment: vi.fn(),
		},
	},
};

describe('pr-comment', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('findPreviousComment', () => {
		it('should find previous comment with header', async () => {
			const comments = [
				{
					id: 1,
					body: '<!-- c15t:bundle-analysis:START -->\nComment content\n<!-- c15t:bundle-analysis:END -->',
				},
				{ id: 2, body: 'Other comment' },
			];

			mockOctokit.rest.issues.listComments.mockResolvedValue({
				data: comments,
			});

			const result = await findPreviousComment(
				mockOctokit as any,
				{ owner: 'test', repo: 'repo' },
				123,
				'bundle-analysis'
			);

			expect(result).toEqual({
				id: 1,
				body: comments[0].body,
			});
		});

		it('should return undefined when no comment found', async () => {
			mockOctokit.rest.issues.listComments.mockResolvedValue({
				data: [{ id: 1, body: 'Other comment' }],
			});

			const result = await findPreviousComment(
				mockOctokit as any,
				{ owner: 'test', repo: 'repo' },
				123,
				'bundle-analysis'
			);

			expect(result).toBeUndefined();
		});

		it('should paginate through comments', async () => {
			const firstPage = Array.from({ length: 100 }, (_, i) => ({
				id: i + 1,
				body: `Comment ${i + 1}`,
			}));

			const secondPage = [
				{
					id: 101,
					body: '<!-- c15t:bundle-analysis:START -->\nFound\n<!-- c15t:bundle-analysis:END -->',
				},
			];

			mockOctokit.rest.issues.listComments
				.mockResolvedValueOnce({ data: firstPage })
				.mockResolvedValueOnce({ data: secondPage });

			const result = await findPreviousComment(
				mockOctokit as any,
				{ owner: 'test', repo: 'repo' },
				123,
				'bundle-analysis'
			);

			expect(result).toEqual({
				id: 101,
				body: secondPage[0].body,
			});
			expect(mockOctokit.rest.issues.listComments).toHaveBeenCalledTimes(2);
		});

		it('should stop pagination when fewer than perPage results', async () => {
			const comments = [
				{ id: 1, body: 'Comment 1' },
				{ id: 2, body: 'Comment 2' },
			];

			mockOctokit.rest.issues.listComments.mockResolvedValue({
				data: comments,
			});

			await findPreviousComment(
				mockOctokit as any,
				{ owner: 'test', repo: 'repo' },
				123,
				'bundle-analysis'
			);

			expect(mockOctokit.rest.issues.listComments).toHaveBeenCalledTimes(1);
		});
	});

	describe('createComment', () => {
		it('should create comment with header', async () => {
			mockOctokit.rest.issues.createComment.mockResolvedValue({
				data: { id: 123 },
			});

			const result = await createComment(
				mockOctokit as any,
				{ owner: 'test', repo: 'repo' },
				456,
				'Comment body',
				'bundle-analysis'
			);

			expect(result).toEqual({ id: 123 });
			expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
				owner: 'test',
				repo: 'repo',
				issue_number: 456,
				body: '<!-- c15t:bundle-analysis:START -->\nComment body\n<!-- c15t:bundle-analysis:END -->',
			});
		});

		it('should handle creation errors', async () => {
			mockOctokit.rest.issues.createComment.mockRejectedValue(
				new Error('API Error')
			);

			const result = await createComment(
				mockOctokit as any,
				{ owner: 'test', repo: 'repo' },
				456,
				'Comment body',
				'bundle-analysis'
			);

			expect(result).toBeUndefined();
			expect(core.setFailed).toHaveBeenCalledWith(
				'Failed to create comment: API Error'
			);
		});

		it('should handle custom header', async () => {
			mockOctokit.rest.issues.createComment.mockResolvedValue({
				data: { id: 123 },
			});

			await createComment(
				mockOctokit as any,
				{ owner: 'test', repo: 'repo' },
				456,
				'Comment body',
				'custom-header'
			);

			expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith(
				expect.objectContaining({
					body: expect.stringContaining('<!-- c15t:custom-header:START -->'),
				})
			);
		});
	});

	describe('updateComment', () => {
		it('should update comment with header', async () => {
			mockOctokit.rest.issues.updateComment.mockResolvedValue({});

			await updateComment(
				mockOctokit as any,
				{ owner: 'test', repo: 'repo' },
				789,
				'Updated body',
				'bundle-analysis'
			);

			expect(mockOctokit.rest.issues.updateComment).toHaveBeenCalledWith({
				owner: 'test',
				repo: 'repo',
				comment_id: 789,
				body: '<!-- c15t:bundle-analysis:START -->\nUpdated body\n<!-- c15t:bundle-analysis:END -->',
			});
		});

		it('should handle update errors', async () => {
			mockOctokit.rest.issues.updateComment.mockRejectedValue(
				new Error('Update failed')
			);

			await updateComment(
				mockOctokit as any,
				{ owner: 'test', repo: 'repo' },
				789,
				'Updated body',
				'bundle-analysis'
			);

			expect(core.setFailed).toHaveBeenCalledWith(
				'Failed to update comment: Update failed'
			);
		});
	});

	describe('ensureComment', () => {
		it('should update existing comment', async () => {
			const existingComment = {
				id: 123,
				body: '<!-- c15t:bundle-analysis:START -->\nOld\n<!-- c15t:bundle-analysis:END -->',
			};

			mockOctokit.rest.issues.listComments.mockResolvedValue({
				data: [existingComment],
			});
			mockOctokit.rest.issues.updateComment.mockResolvedValue({});

			await ensureComment(
				mockOctokit as any,
				{ owner: 'test', repo: 'repo' },
				456,
				'New body',
				'bundle-analysis'
			);

			expect(mockOctokit.rest.issues.updateComment).toHaveBeenCalled();
			expect(mockOctokit.rest.issues.createComment).not.toHaveBeenCalled();
			expect(core.setOutput).toHaveBeenCalledWith('updated_comment_id', 123);
		});

		it('should create new comment when none exists', async () => {
			mockOctokit.rest.issues.listComments.mockResolvedValue({
				data: [],
			});
			mockOctokit.rest.issues.createComment.mockResolvedValue({
				data: { id: 789 },
			});

			await ensureComment(
				mockOctokit as any,
				{ owner: 'test', repo: 'repo' },
				456,
				'New body',
				'bundle-analysis'
			);

			expect(mockOctokit.rest.issues.createComment).toHaveBeenCalled();
			expect(mockOctokit.rest.issues.updateComment).not.toHaveBeenCalled();
			expect(core.setOutput).toHaveBeenCalledWith('created_comment_id', 789);
		});

		it('should handle create failure gracefully', async () => {
			mockOctokit.rest.issues.listComments.mockResolvedValue({
				data: [],
			});
			mockOctokit.rest.issues.createComment.mockResolvedValue(undefined);

			await ensureComment(
				mockOctokit as any,
				{ owner: 'test', repo: 'repo' },
				456,
				'New body',
				'bundle-analysis'
			);

			expect(core.setOutput).not.toHaveBeenCalledWith(
				'created_comment_id',
				expect.anything()
			);
		});
	});
});
