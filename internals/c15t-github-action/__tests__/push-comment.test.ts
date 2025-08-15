import * as core from '@actions/core';
import * as github from '@actions/github';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// note: inputs module is mocked per-test with vi.doMock + dynamic import

vi.mock('@actions/core', () => ({
	info: vi.fn(),
	warning: vi.fn(),
	getBooleanInput: (name: string) => {
		if (name === 'comment_on_push') {
			return true;
		}
		return false;
	},
	getInput: () => '',
}));

describe('maybeCommentOnPush', () => {
	const octokit = github.getOctokit('token');

	beforeEach(() => {
		process.env.GITHUB_REPOSITORY = 'owner/repo';
		vi.spyOn(octokit.rest.repos, 'createCommitComment').mockResolvedValue({
			status: 201,
			url: 'https://api.github.local',
			headers: {} as Record<string, string>,
			data: { id: 1 } as unknown,
		} as Awaited<ReturnType<typeof octokit.rest.repos.createCommitComment>>);
	});

	it('skips when running on a PR (pullRequestNumber is set)', async () => {
		vi.resetModules();
		vi.doMock('../src/config/inputs', () => ({
			commentOnPush: true,
			pullRequestNumber: 123,
		}));
		const { maybeCommentOnPush } = await import('../src/steps/push-comment');
		const result = await maybeCommentOnPush(
			octokit as unknown as ReturnType<typeof github.getOctokit>,
			'body',
			'url'
		);
		expect(result).toBe(false);
		expect(octokit.rest.repos.createCommitComment).not.toHaveBeenCalled();
	});

	it('returns true if no deployment url', async () => {
		vi.resetModules();
		vi.doMock('../src/config/inputs', () => ({
			commentOnPush: true,
			pullRequestNumber: Number.NaN,
		}));
		const { maybeCommentOnPush } = await import('../src/steps/push-comment');
		const ok = await maybeCommentOnPush(
			octokit as unknown as ReturnType<typeof github.getOctokit>,
			'body'
		);
		expect(ok).toBe(true);
		expect(core.info).toBeCalled();
		expect(octokit.rest.repos.createCommitComment).not.toHaveBeenCalled();
	});
});
