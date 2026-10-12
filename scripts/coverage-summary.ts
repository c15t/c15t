import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { appendFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

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

/** Stream diff bodies so large PRs cannot exceed child_process's output buffer. */
export const changedLinesFromGit = async (base: string, cwd = '.') => {
	const child = spawn(
		'git',
		[
			'-c',
			'core.quotePath=false',
			'diff',
			'--no-renames',
			'--unified=0',
			`${base}...HEAD`,
		],
		{ cwd, stdio: ['ignore', 'pipe', 'inherit'] }
	);
	const headers: string[] = [];
	const readHeaders = async () => {
		for await (const line of createInterface({ input: child.stdout })) {
			if (line.startsWith('+++ ') || line.startsWith('@@ ')) {
				headers.push(line);
			}
		}
	};
	const [[code]] = await Promise.all([once(child, 'close'), readHeaders()]);
	if (code !== 0) {
		throw new Error(`git diff exited with code ${code}`);
	}
	return changedLines(headers.join('\n'));
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
		return '';
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

export const collectCoverage = function collectCoverage(
	required: string[],
	rootDirectory = '.'
) {
	const reports: Record<string, FileCoverage> = {};
	for (const directory of required) {
		const path = join(rootDirectory, directory, 'coverage/coverage-final.json');
		if (!existsSync(path)) {
			throw new Error(`Missing required coverage report: ${path}`);
		}
		const report = JSON.parse(readFileSync(path, 'utf8'));
		if (!Object.keys(report).length) {
			throw new Error(`Empty required coverage report: ${path}`);
		}
	}
	for (const root of ['packages', 'apps', 'internals', 'benchmarks']) {
		if (!existsSync(join(rootDirectory, root))) {
			continue;
		}
		for (const entry of readdirSync(join(rootDirectory, root), {
			withFileTypes: true,
		})) {
			const path = join(
				rootDirectory,
				root,
				entry.name,
				'coverage/coverage-final.json'
			);
			if (entry.isDirectory() && existsSync(path)) {
				Object.assign(reports, JSON.parse(readFileSync(path, 'utf8')));
			}
		}
	}
	return reports;
};

if (import.meta.main) {
	const planPath = process.argv[process.argv.indexOf('--plan') + 1];
	let required: string[] = [];
	if (process.argv.includes('--require')) {
		const directory = process.argv[process.argv.indexOf('--require') + 1];
		if (!directory) {
			throw new Error('--require needs a package directory');
		}
		required = [directory];
	} else if (process.argv.includes('--plan')) {
		if (!planPath) {
			throw new Error('--plan needs a plan path');
		}
		required = JSON.parse(readFileSync(planPath, 'utf8')).coverage;
	}

	const reports = collectCoverage(required);
	const base = process.env.CI_DIFF_BASE;
	const changed = base ? await changedLinesFromGit(base) : undefined;
	const summary = coverageSummary(reports, changed);
	if (process.env.GITHUB_STEP_SUMMARY) {
		appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
	}
	process.stdout.write(summary);
}
