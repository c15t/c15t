import { describe, expect, it, vi } from 'vitest';

import { findReleaseBase } from './ci-release-base';

const run = (id: number, sha: string, conclusion = 'success') => ({
	conclusion,
	head_branch: 'v3',
	head_sha: sha.repeat(40),
	id,
});

describe('release comparison base', () => {
	it('keeps failed pushes in the diff and excludes unrelated history and the current run', async () => {
		const request = vi.fn<typeof fetch>().mockResolvedValue(
			Response.json({
				workflow_runs: [
					run(4, 'd'),
					run(3, 'c', 'failure'),
					run(2, 'b'),
					run(1, 'a'),
				],
			})
		);
		const base = await findReleaseBase({
			branch: 'v3',
			isAncestor: (sha) => sha === 'a'.repeat(40),
			repository: 'c15t/c15t',
			request,
			runId: '4',
			token: 'test-token',
		});
		expect(base).toBe('a'.repeat(40));
		const [url] = request.mock.calls[0] ?? [];
		expect(String(url)).toContain('branch=v3');
		expect(String(url)).toContain('status=success');
	});

	it('checks older pages when recent successful runs are no longer ancestors', async () => {
		const request = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(
				Response.json({
					workflow_runs: Array.from({ length: 100 }, () => run(2, 'b')),
				})
			)
			.mockResolvedValueOnce(Response.json({ workflow_runs: [run(1, 'a')] }));
		expect(
			await findReleaseBase({
				branch: 'v3',
				isAncestor: (sha) => sha === 'a'.repeat(40),
				repository: 'c15t/c15t',
				request,
				runId: '3',
				token: 'test-token',
			})
		).toBe('a'.repeat(40));
		expect(request).toHaveBeenCalledTimes(2);
	});

	it('uses full validation when history or credentials are unavailable', async () => {
		const request = vi
			.fn<typeof fetch>()
			.mockResolvedValue(Response.json({ workflow_runs: [] }));
		const bases = await Promise.all(
			['', 'test-token'].map((token) =>
				findReleaseBase({
					branch: 'v3',
					repository: 'c15t/c15t',
					request,
					runId: '3',
					token,
				})
			)
		);
		expect(bases).toEqual(['', '']);
		expect(request).toHaveBeenCalledTimes(1);
	});

	it('rejects API errors instead of treating a failed push as the baseline', async () => {
		await expect(
			findReleaseBase({
				branch: 'v3',
				repository: 'c15t/c15t',
				request: vi
					.fn<typeof fetch>()
					.mockResolvedValue(new Response(null, { status: 403 })),
				runId: '3',
				token: 'test-token',
			})
		).rejects.toThrow('403');
	});
});
