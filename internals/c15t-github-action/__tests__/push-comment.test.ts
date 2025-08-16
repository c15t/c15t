import * as core from '@actions/core';
import * as github from '@actions/github';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

	afterEach(() => {
		vi.restoreAllMocks();
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

	it('includes share/tips sections in auto-rendered body on push', async () => {
		vi.resetModules();
		vi.doMock('../src/config/inputs', () => ({
			commentOnPush: true,
			pullRequestNumber: Number.NaN,
		}));
		const { maybeCommentOnPush } = await import('../src/steps/push-comment');
		// Capture body passed to commit comment
		const bodySpy = vi
			.spyOn(octokit.rest.repos, 'createCommitComment')
			.mockResolvedValue({
				status: 201,
				url: 'https://api.github.local',
				headers: {} as Record<string, string>,
				data: { id: 2 } as unknown,
			} as Awaited<ReturnType<typeof octokit.rest.repos.createCommitComment>>);
		await maybeCommentOnPush(
			octokit as unknown as ReturnType<typeof github.getOctokit>,
			undefined,
			'https://preview.example.com'
		);
		expect(bodySpy).toHaveBeenCalled();
		const args = bodySpy.mock.calls[0]?.[0] as { body?: string };
		expect(
			(args?.body || '').match(/<details>/g)?.length || 0
		).toBeGreaterThanOrEqual(2);
		expect(args?.body || '').toContain(
			'<summary>💙 Share your contribution on social media</summary>'
		);
		expect(args?.body || '').toContain(
			'<summary>🪧 Documentation and Community</summary>'
		);
	});
});
