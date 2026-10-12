import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';

import { expect, it } from 'vitest';
import { parse } from 'yaml';

import { resolveBenchmarkRevisions } from './benchmark-revisions';

it('keeps a PR bundle baseline valid when its base branch advances after the event', () => {
	const cwd = mkdtempSync(join(tmpdir(), 'c15t-pr-benchmark-revisions-'));
	const git = (...args: string[]) =>
		execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
	try {
		git('init', '--quiet');
		git('config', 'user.email', 'test@example.com');
		git('config', 'user.name', 'Test');
		git('commit', '--allow-empty', '-m', 'event base');
		const baseSha = git('rev-parse', 'HEAD');
		git('checkout', '--detach', baseSha);
		writeFileSync(join(cwd, 'pr.txt'), 'pull request');
		git('add', '.');
		git('commit', '-m', 'pull request head');
		const headSha = git('rev-parse', 'HEAD');
		git('checkout', '--detach', baseSha);
		writeFileSync(join(cwd, 'base.txt'), 'base branch advanced');
		git('add', '.');
		git('commit', '-m', 'new base branch tip');
		git('update-ref', 'refs/remotes/origin/v3', 'HEAD');
		git('checkout', '--detach', headSha);
		expect(() => resolveBenchmarkRevisions('origin/v3', cwd)).toThrow(
			'Benchmark base must be an ancestor'
		);

		const workflow = parse(
			readFileSync(
				new URL('../.github/workflows/ci.yml', import.meta.url),
				'utf8'
			)
		);
		const expression = workflow.jobs.bundle.with.base_ref
			.replace(/^\$\{\{/u, '')
			.replace(/\}\}$/u, '');
		const context = {
			github: { event: { pull_request: { base: { sha: baseSha } } } },
			needs: { repository: { outputs: { baseRef: 'origin/v3' } } },
		};
		const selectedBase = runInNewContext(expression, context);
		expect(resolveBenchmarkRevisions(selectedBase, cwd)).toEqual({
			baseSha,
			headSha,
		});
		expect(
			runInNewContext(expression, {
				github: { event: { pull_request: { base: {} } } },
				needs: { repository: { outputs: { baseRef: baseSha } } },
			})
		).toBe(baseSha);
	} finally {
		rmSync(cwd, { force: true, recursive: true });
	}
});

it('accepts trusted history and rejects an unmerged baseline before running code', () => {
	const cwd = mkdtempSync(join(tmpdir(), 'c15t-benchmark-revisions-'));
	const git = (...args: string[]) =>
		execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
	try {
		git('init', '--quiet');
		git('config', 'user.email', 'test@example.com');
		git('config', 'user.name', 'Test');
		git('commit', '--allow-empty', '-m', 'base');
		const baseSha = git('rev-parse', 'HEAD');
		git('checkout', '-b', 'unmerged');
		writeFileSync(join(cwd, 'untrusted.sh'), 'exit 99');
		git('add', '.');
		git('commit', '-m', 'unmerged code');
		const unmergedSha = git('rev-parse', 'HEAD');
		git('checkout', '--detach', baseSha);
		git('commit', '--allow-empty', '-m', 'trusted head');
		const headSha = git('rev-parse', 'HEAD');
		expect(resolveBenchmarkRevisions('HEAD^', cwd)).toEqual({
			baseSha,
			headSha,
		});
		expect(() => resolveBenchmarkRevisions(unmergedSha, cwd)).toThrow(
			'Benchmark base must be an ancestor'
		);
		expect(() => resolveBenchmarkRevisions('--all', cwd)).toThrow();
	} finally {
		rmSync(cwd, { force: true, recursive: true });
	}
});
