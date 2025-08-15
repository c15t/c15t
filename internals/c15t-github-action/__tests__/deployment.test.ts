import * as core from '@actions/core';
import * as github from '@actions/github';
import { describe, expect, it, vi } from 'vitest';

// Import lazily inside tests to allow env setup before module eval

describe('deployment helpers', () => {
	it('resolveBranch prefers head_ref', async () => {
		const ctx = github.context as unknown as {
			ref?: string;
			head_ref?: string;
		};
		process.env.GITHUB_REPOSITORY = 'owner/repo';
		// stub required inputs
		vi.spyOn(core, 'getBooleanInput').mockImplementation(() => false);
		vi.spyOn(core, 'getInput').mockImplementation(() => '');
		ctx.ref = 'refs/heads/feature/x';
		ctx.head_ref = 'pull/123/head';
		const { resolveBranch } = await import('../src/steps/deployment');
		expect(resolveBranch()).toBe('pull/123/head');
	});

	it('computeEnvironmentName', async () => {
		process.env.GITHUB_REPOSITORY = 'owner/repo';
		vi.spyOn(core, 'getBooleanInput').mockImplementation(() => false);
		vi.spyOn(core, 'getInput').mockImplementation(() => '');
		const { computeEnvironmentName } = await import('../src/steps/deployment');
		expect(computeEnvironmentName('production', 'any')).toBe('production');
		expect(computeEnvironmentName(undefined, 'main')).toBe('production');
		expect(computeEnvironmentName(undefined, 'feat')).toBe('preview/feat');
	});
});
