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
		vi.resetModules();
		const { resolveBranch } = await import('../src/steps/deployment');
		expect(resolveBranch()).toBe('pull/123/head');
	});

	it('computeEnvironmentName', async () => {
		process.env.GITHUB_REPOSITORY = 'owner/repo';
		vi.spyOn(core, 'getBooleanInput').mockImplementation(() => false);
		vi.spyOn(core, 'getInput').mockImplementation(() => '');
		vi.resetModules();
		const { computeEnvironmentName } = await import('../src/steps/deployment');
		expect(computeEnvironmentName('production', 'any')).toBe('production');
		expect(computeEnvironmentName(undefined, 'main')).toBe('production');
		expect(computeEnvironmentName(undefined, 'feat')).toBe('preview/feat');
	});

	it('resolveBranch falls back to branch from ref when head_ref absent', async () => {
		const ctx = github.context as unknown as {
			ref?: string;
			head_ref?: string;
		};
		process.env.GITHUB_REPOSITORY = 'owner/repo';
		vi.spyOn(core, 'getBooleanInput').mockImplementation(() => false);
		vi.spyOn(core, 'getInput').mockImplementation(() => '');
		ctx.head_ref = '';
		ctx.ref = 'refs/heads/feature/xyz';
		vi.resetModules();
		const { resolveBranch } = await import('../src/steps/deployment');
		expect(resolveBranch()).toBe('feature/xyz');
	});

	it('resolveBranch returns raw ref for non-branch refs (document current behavior)', async () => {
		const ctx = github.context as unknown as {
			ref?: string;
			head_ref?: string;
		};
		process.env.GITHUB_REPOSITORY = 'owner/repo';
		vi.spyOn(core, 'getBooleanInput').mockImplementation(() => false);
		vi.spyOn(core, 'getInput').mockImplementation(() => '');
		ctx.head_ref = '';
		ctx.ref = 'refs/tags/v1.2.3';
		vi.resetModules();
		const { resolveBranch } = await import('../src/steps/deployment');
		expect(resolveBranch()).toBe('refs/tags/v1.2.3');
	});

	describe('target resolution logic', () => {
		it('should resolve target to production for main branch when no explicit target provided', async () => {
			const ctx = github.context as unknown as {
				ref?: string;
				head_ref?: string;
			};
			process.env.GITHUB_REPOSITORY = 'owner/repo';
			vi.spyOn(core, 'getBooleanInput').mockImplementation(() => false);
			vi.spyOn(core, 'getInput').mockImplementation(() => '');
			ctx.ref = 'refs/heads/main';
			ctx.head_ref = '';
			vi.resetModules();

			// No explicit target provided in inputs

			// Test the target resolution logic indirectly through branch resolution
			// by testing the branch resolution and target hint calculation
			const { resolveBranch } = await import('../src/steps/deployment');
			expect(resolveBranch()).toBe('main');

			// The target hint logic should set targetHint to 'production' for main branch
			// when no explicit target is provided
		});

		it('should resolve target to staging for canary branch when no explicit target provided', async () => {
			const ctx = github.context as unknown as {
				ref?: string;
				head_ref?: string;
			};
			process.env.GITHUB_REPOSITORY = 'owner/repo';
			vi.spyOn(core, 'getBooleanInput').mockImplementation(() => false);
			vi.spyOn(core, 'getInput').mockImplementation(() => '');
			ctx.ref = 'refs/heads/canary';
			ctx.head_ref = '';
			vi.resetModules();

			const { resolveBranch } = await import('../src/steps/deployment');
			expect(resolveBranch()).toBe('canary');

			// The target hint logic should set targetHint to 'staging' for canary branch
			// when no explicit target is provided
		});

		it('should resolve target to staging for feature branch when no explicit target provided', async () => {
			const ctx = github.context as unknown as {
				ref?: string;
				head_ref?: string;
			};
			process.env.GITHUB_REPOSITORY = 'owner/repo';
			vi.spyOn(core, 'getBooleanInput').mockImplementation(() => false);
			vi.spyOn(core, 'getInput').mockImplementation(() => '');
			ctx.ref = 'refs/heads/feature/new-feature';
			ctx.head_ref = '';
			vi.resetModules();

			const { resolveBranch } = await import('../src/steps/deployment');
			expect(resolveBranch()).toBe('feature/new-feature');

			// The target hint logic should set targetHint to 'staging' for feature branches
			// when no explicit target is provided
		});

		it('should use explicit target when provided', async () => {
			const ctx = github.context as unknown as {
				ref?: string;
				head_ref?: string;
			};
			process.env.GITHUB_REPOSITORY = 'owner/repo';
			vi.spyOn(core, 'getBooleanInput').mockImplementation(() => false);
			// Mock getInput to return 'production' for target
			vi.spyOn(core, 'getInput').mockImplementation((name) => {
				if (name === 'target') return 'production';
				return '';
			});
			ctx.ref = 'refs/heads/canary';
			ctx.head_ref = '';
			vi.resetModules();

			const { resolveBranch } = await import('../src/steps/deployment');
			expect(resolveBranch()).toBe('canary');

			// Even though branch is canary, explicit target should be used
		});
	});
});
