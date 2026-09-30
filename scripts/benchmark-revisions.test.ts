import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, it } from 'vitest';

import { resolveBenchmarkRevisions } from './benchmark-revisions';

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
