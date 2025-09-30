import * as core from '@actions/core';
import { getOctokit } from '@actions/github';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@actions/core', () => ({
	warning: vi.fn(),
	info: vi.fn(),
	setOutput: vi.fn(),
	getInput: () => '',
	getBooleanInput: () => false,
	getMultilineInput: () => [],
}));

vi.mock('../src/config/inputs', async () => {
	return {
		repo: { owner: 'o', repo: 'r' },
		append: false,
		header: '',
		hideDetails: false,
		hideOldComment: false,
		hideAndRecreate: false,
		hideClassify: 'OUTDATED',
		deleteOldComment: false,
		ignoreEmpty: false,
		onlyCreateComment: false,
		onlyUpdateComment: false,
		recreate: false,
		skipUnchanged: false,
		pullRequestNumber: 123,
		authorLogin: 'c15t',
	};
});

// Import within tests after mocks are set up
let ensureComment: (
	octokit: ReturnType<typeof getOctokit>,
	effectiveBody: string,
	options?: { appendOverride?: boolean; hideDetailsOverride?: boolean }
) => Promise<void>;

describe('comments.ensureComment', () => {
	const octokit = getOctokit('token');

	beforeEach(() => {
		vi.resetModules();
	});

	it('does nothing when body empty and ignoreEmpty true', async () => {
		process.env.GITHUB_REPOSITORY = 'owner/repo';
		vi.doMock('../src/config/inputs', async () => ({
			...(await vi.importActual('../src/config/inputs')),
			ignoreEmpty: true,
		}));
		({ ensureComment } = await import('../src/steps/comments'));
		await ensureComment(
			octokit as unknown as ReturnType<typeof getOctokit>,
			''
		);
		expect(core.info).toBeCalled();
	});

	it('replaces inner block on skip (no append)', async () => {
		process.env.GITHUB_REPOSITORY = 'owner/repo';
		const previousBody = [
			'<!-- c15t:c15t-docs-preview:START -->',
			'old-content',
			'<!-- c15t:c15t-docs-preview:END -->',
		].join('\n');
		vi.doMock('../src/github/pr-comment', async () => {
			return {
				findPreviousComment: vi
					.fn()
					.mockResolvedValue({ id: 'id1', body: previousBody }),
				getBodyOf: (p: { body?: string }, append: boolean) =>
					append ? p.body : undefined,
				updateComment: vi.fn().mockResolvedValue(undefined),
				createComment: vi.fn().mockResolvedValue(undefined),
			};
		});
		({ ensureComment } = await import('../src/steps/comments'));
		const update = (await import('../src/github/pr-comment'))
			.updateComment as unknown as vi.Mock;
		await ensureComment(
			octokit as unknown as ReturnType<typeof getOctokit>,
			'new-rendered',
			{ appendOverride: false }
		);
		expect(update).toBeCalled();
		const args = update.mock.calls.at(-1)?.[2] as string;
		expect(args).toContain('new-rendered');
		expect(args).not.toContain('old-content');
	});
});
