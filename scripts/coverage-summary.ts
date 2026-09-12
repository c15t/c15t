import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

interface FileCoverage {
	statementMap: Record<string, { start: { line: number } }>;
	s: Record<string, number>;
	branchMap: Record<string, { locations: { start: { line: number } }[] }>;
	b: Record<string, number[]>;
}

/** Added and modified lines on the head side of a zero-context Git diff. */
export const changedLines = function changedLines(
	diff: string
): Map<string, Set<number>> {
	const files = new Map<string, Set<number>>();
	let lines: Set<number> | undefined;
	for (const line of diff.split('\n')) {
		if (line.startsWith('+++ b/')) {
			lines = new Set();
			files.set(line.slice(6), lines);
		} else if (line === '+++ /dev/null') {
			lines = undefined;
		} else {
			const match = /^@@ .* \+(?<start>\d+)(?:,(?<count>\d+))? @@/u.exec(line);
			if (match && lines) {
				const start = Number(match.groups?.start);
				const count = Number(match.groups?.count ?? 1);
				for (let index = start; index < start + count; index += 1) {
					lines.add(index);
				}
			}
		}
	}
	return files;
};

export const coverageSummary = function coverageSummary(
	reports: Record<string, FileCoverage>,
	changed?: Map<string, Set<number>>
): string {
	const rows: string[] = [];
	for (const [filename, coverage] of Object.entries(reports)) {
		// Turbo can restore coverage produced under a different checkout root.
		const path = filename
			.replaceAll('\\', '/')
			.replace(/^.*?\/(?=(?:packages|apps|internals|benchmarks)\/)/u, '');
		const selection = changed?.get(path);
		if (changed && !selection) {
			continue;
		}
		const lines = new Map<number, number>();
		for (const [id, statement] of Object.entries(coverage.statementMap)) {
			const { line } = statement.start;
			if (!selection || selection.has(line)) {
				lines.set(line, Math.max(lines.get(line) ?? 0, coverage.s[id] ?? 0));
			}
		}
		const branches = Object.entries(coverage.branchMap).flatMap(
			([id, branch]) =>
				branch.locations.flatMap((location, index) =>
					!selection || selection.has(location.start.line)
						? [coverage.b[id]?.[index] ?? 0]
						: []
				)
		);
		if (lines.size || branches.length) {
			const missed = [...lines]
				.filter(([, count]) => count === 0)
				.map(([line]) => line);
			rows.push(
				`| ${path} | ${lines.size - missed.length}/${lines.size} | ${branches.filter((count) => count > 0).length}/${branches.length} | ${missed.join(', ') || 'None'} |`
			);
		}
	}
	if (!rows.length) {
		return 'Coverage: no measured executable lines in this selection.\n';
	}
	return [
		`## ${changed ? 'Changed-code coverage' : 'Coverage'}`,
		'',
		'Counts use instrumented statement starts and branch locations. Full reports are attached as artifacts.',
		'',
		'| File | Lines covered | Branches covered | Uncovered lines |',
		'| --- | --- | --- | --- |',
		...rows,
		'',
	].join('\n');
};

if (import.meta.main) {
	const reports: Record<string, FileCoverage> = {};
	for (const root of ['packages', 'apps', 'internals', 'benchmarks']) {
		for (const entry of readdirSync(root, { withFileTypes: true })) {
			const path = join(root, entry.name, 'coverage/coverage-final.json');
			if (entry.isDirectory() && existsSync(path)) {
				Object.assign(reports, JSON.parse(readFileSync(path, 'utf8')));
			}
		}
	}
	const base = process.env.CI_DIFF_BASE;
	const changed = base
		? changedLines(
				execFileSync(
					'git',
					[
						'-c',
						'core.quotePath=false',
						'diff',
						'--no-renames',
						'--unified=0',
						`${base}...HEAD`,
					],
					{ encoding: 'utf8' }
				)
			)
		: undefined;
	const summary = coverageSummary(reports, changed);
	if (process.env.GITHUB_STEP_SUMMARY) {
		appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
	}
	process.stdout.write(summary);
}
