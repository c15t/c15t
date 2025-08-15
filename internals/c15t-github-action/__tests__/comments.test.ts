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
		pullRequestNumber: Number.NaN,
		authorLogin: 'c15t',
	};
});

// Import within tests after mocks are set up
let ensureComment: (
	octokit: ReturnType<typeof getOctokit>,
	effectiveBody: string
) => Promise<void>;

describe('comments.ensureComment', () => {
	const octokit = getOctokit('token');

	beforeEach(() => {
		vi.spyOn(octokit, 'graphql').mockResolvedValue('');
		// findPreviousComment is used inside ensureComment via module import
	});

	it('does nothing when body empty and ignoreEmpty true', async () => {
		process.env.GITHUB_REPOSITORY = 'owner/repo';
		// Re-mock module with ignoreEmpty = true
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
});
