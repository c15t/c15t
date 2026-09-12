import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
	changedLines,
	changedLinesFromGit,
	collectCoverage,
	coverageSummary,
} from './coverage-summary';

describe('coverage summary', () => {
	const report = {
		'/old/checkout/packages/core/src/store.ts': {
			b: { a: [1, 0] },
			branchMap: {
				a: { locations: [{ start: { line: 3 } }, { start: { line: 4 } }] },
			},
			s: { a: 1, b: 0 },
			statementMap: { a: { start: { line: 3 } }, b: { start: { line: 4 } } },
		},
	};
	it('limits coverage to changed executable lines, including cached checkout paths', () => {
		const diff = '+++ b/packages/core/src/store.ts\n@@ -3 +3,2 @@\n';
		expect(coverageSummary(report, changedLines(diff))).toContain(
			'| packages/core/src/store.ts | 1/2 | 1/2 | 4 |'
		);
	});
	it('does not report unrelated package totals for a docs change', () => {
		expect(
			coverageSummary(
				report,
				changedLines('+++ b/docs/start.mdx\n@@ -0,0 +1 @@')
			)
		).not.toContain('store.ts');
	});
	it('handles deleted lines and files without assigning head coverage', () => {
		const diff =
			'+++ b/packages/core/src/store.ts\n@@ -2,2 +2,0 @@\n+++ /dev/null\n@@ -1 +0,0 @@';
		expect(coverageSummary(report, changedLines(diff))).not.toContain(
			'| packages'
		);
	});
});

it('fails missing or empty required reports but permits non-instrumented selections', () => {
	const root = mkdtempSync(join(tmpdir(), 'c15t-coverage-'));
	try {
		expect(collectCoverage([], root)).toEqual({});
		expect(coverageSummary({})).toBe('');
		expect(() => collectCoverage(['packages/core'], root)).toThrow(
			'Missing required coverage'
		);
		mkdirSync(join(root, 'packages/core/coverage'), { recursive: true });
		writeFileSync(
			join(root, 'packages/core/coverage/coverage-final.json'),
			'{}'
		);
		expect(() => collectCoverage(['packages/core'], root)).toThrow(
			'Empty required coverage'
		);
	} finally {
		rmSync(root, { force: true, recursive: true });
	}
});

it('reads changed lines from a diff larger than the default process buffer', async () => {
	const root = mkdtempSync(join(tmpdir(), 'c15t-large-diff-'));
	const git = (...args: string[]) =>
		execFileSync('git', args, { cwd: root, stdio: 'pipe' });
	try {
		git('init');
		git('config', 'user.name', 'Test');
		git('config', 'user.email', 'test@example.com');
		writeFileSync(join(root, 'large.ts'), 'old\n');
		git('add', '.');
		git('-c', 'commit.gpgsign=false', 'commit', '-m', 'base');
		const base = git('rev-parse', 'HEAD').toString().trim();
		writeFileSync(join(root, 'large.ts'), `${'x'.repeat(2 * 1024 * 1024)}\n`);
		git('add', '.');
		git('-c', 'commit.gpgsign=false', 'commit', '-m', 'head');
		expect(await changedLinesFromGit(base, root)).toEqual(
			new Map([['large.ts', new Set([1])]])
		);
		await expect(changedLinesFromGit('missing-revision', root)).rejects.toThrow(
			'git diff exited'
		);
	} finally {
		rmSync(root, { force: true, recursive: true });
	}
});
