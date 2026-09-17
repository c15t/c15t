/**
 * Publish one mobile benchmark run where CI reads it.
 *
 * `bun run --cwd benchmarks/mobile bench:ci` already gates the budgets: a measured row
 * over its ceiling exits non-zero. This script owns the other half, the half the
 * runtime comparisons already enforce for the web packages: a row that was supposed to
 * be measured and is not must fail the run, because a shrunken table is how a green
 * gate stops measuring anything.
 *
 * It writes `mobile-summary.md` and `mobile-summary.json` next to the run artifact so
 * the job's evidence archive carries both, and appends the markdown to the step
 * summary. The exit code comes only from missing measurements; budget failures already
 * failed the bench step, and re-reporting them here would only move the red.
 *
 * Usage: `bun scripts/ci-mobile-bench-report.ts --kind ios-toolchain
 * --report-dir .ci-reports/mobile-ios-toolchain`
 */

import {
	appendFileSync,
	existsSync,
	readFileSync,
	writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

/** A row as the harness wrote it. Only the fields this report reads. */
interface MobileBenchRowView {
	id: string;
	label: string;
	surface: string;
	status: string;
	unit: string;
	value: number | null;
	samples: number;
	budget: number | null;
	budgetSource: string | null;
	reason?: string;
}

/** A previous-run diff row as the harness wrote it. */
interface MobileBenchDiffRowView {
	id: string;
	previous: number;
	current: number;
	deltaPercent: number | null;
	flagged: boolean;
}

/** The run artifact, narrowed to what this report needs. */
interface MobileBenchArtifactView {
	commitSha: string;
	runtime: string;
	suite: string;
	timestamp: string;
	rows: MobileBenchRowView[];
	environment?: { arch?: string; os?: string };
	previous?: {
		previousCommitSha: string;
		tolerancePercent: number;
		rows: MobileBenchDiffRowView[];
	};
}

/** One row of the published summary. */
export interface MobileSummaryRow {
	id: string;
	surface: string;
	status: 'measured' | 'not-measured' | 'absent';
	unit: string;
	value: number | null;
	budget: number | null;
	budgetSource: string | null;
	verdict: 'FAIL' | 'no-budget' | 'not-measured' | 'pass';
	required: boolean;
	reason?: string;
}

/** The machine-readable half of what this script publishes. */
export interface MobileBenchSummary {
	kind: string;
	generatedAt: string;
	commitSha: string;
	suite: string;
	runtime: string;
	required: number;
	measured: number;
	unmeasured: number;
	missing: string[];
	regressions: string[];
	ok: boolean;
	rows: MobileSummaryRow[];
}

/**
 * Rows each mobile leg must produce a number for.
 *
 * Two kinds of row stay out of every list, and both are the harness saying so rather
 * than a gap in CI: `ios_binding_bytes` and `kotlin_bootstrap_to_snapshot_cold_ms` are
 * structurally unmeasurable (see `benchmarks/mobile/README.md`), and the three idle rows
 * are budget-gated but not required, because a shared runner's quiet window is not
 * quiet. Everything else the leg's toolchain provisions is required, so a parser that
 * stops matching a bench's output fails the run instead of shrinking the table.
 */
export const MOBILE_EXPECTED_ROWS: Record<string, readonly string[]> = {
	'android-js': [
		'kotlin_hydrate_envelope_ms',
		'kotlin_policy_evaluation_us',
		'kotlin_snapshot_plus_is_allowed_us',
		'kotlin_commit_ack_no_network_ms',
		'kotlin_snapshot_object_identities',
		'bootstrap_to_snapshot_warm_ms',
		'bootstrap_to_snapshot_cold_ms',
		'cold_start_overhead_ms',
		'js_hydrate_envelope_ms',
		'commit_ack_no_network_ms',
		'snapshot_read_us',
		'is_allowed_us',
		'snapshot_object_identities',
		'rerenders_per_consent_change',
		'rerenders_per_unchanged_event',
		'native_snapshot_pulls_per_run',
		'policy_apply_per_rule_set_us',
		'policy_rule_sets_covered',
		'js_shipped_bytes',
		'js_shipped_gzip_bytes',
		'android_binary_bytes',
		'jsx_global_reference_files',
		'package_manifest_parse_errors',
	],
	'ios-toolchain': [
		'native_bootstrap_to_snapshot_warm_ms',
		'native_bootstrap_to_snapshot_cold_ms',
		'native_hydrate_envelope_ms',
		'native_policy_evaluation_us',
		'native_snapshot_read_us',
		'native_is_allowed_us',
		'native_commit_ack_no_network_ms',
		'native_commit_ack_disk_ms',
		'native_queue_replay_us',
		'js_shipped_bytes',
		'js_shipped_gzip_bytes',
		'ios_binary_bytes',
		'jsx_global_reference_files',
		'package_manifest_parse_errors',
	],
};

/**
 * Collapse a harness reason into one line.
 *
 * The harness stores the failing command's whole output as the reason, which is right
 * for the artifact and unreadable in a check list. The actionable line is the first
 * compiler or error line when there is one; otherwise the first line. The full text
 * stays in `mobile-summary.json` and the run artifact.
 *
 * @param reason - The reason the harness recorded.
 * @returns One line, at most 200 characters.
 */
export const summarizeReason = function summarizeReason(
	reason: string | undefined
): string {
	if (!reason) {
		return 'no reason recorded';
	}
	const lines = reason
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
	const detail = lines.find((line) =>
		/^(?:e: |error: |fatal: |Caused by:)/u.test(line)
	);
	const line = detail ?? lines[0] ?? 'no reason recorded';
	return line.length > 200 ? `${line.slice(0, 197)}...` : line;
};

const verdictOf = function verdictOf(
	row: MobileBenchRowView
): MobileSummaryRow['verdict'] {
	if (row.status !== 'measured' || row.value === null) {
		return 'not-measured';
	}
	if (row.budget === null) {
		return 'no-budget';
	}
	return row.value <= row.budget ? 'pass' : 'FAIL';
};

/**
 * Turn one run artifact into the published summary and its gate outcome.
 *
 * @param artifact - The artifact the harness wrote.
 * @param expectedRows - Row ids this leg must measure.
 * @param kind - The leg's name, for the heading and the JSON.
 * @returns The markdown, the JSON, and the failures that decide the exit code.
 */
const cellOf = function cellOf(value: string | number | null): string {
	if (value === null) {
		return '-';
	}
	return typeof value === 'number' ? value.toLocaleString('en-US') : value;
};

/** Render the step summary: table, unmeasured rows, diff, then any failures. */
const renderMarkdown = function renderMarkdown(
	summary: MobileBenchSummary,
	artifact: MobileBenchArtifactView
): string {
	const lines: string[] = [];
	const environment =
		artifact.environment?.os && artifact.environment.arch
			? `${artifact.environment.os}/${artifact.environment.arch}`
			: 'unknown host';

	lines.push(`## Mobile benchmarks (${summary.kind})`);
	lines.push('');
	lines.push(
		`${summary.suite} at \`${summary.commitSha}\` on ${environment}, ${summary.runtime}, run ${artifact.timestamp}.`
	);
	lines.push('');
	lines.push(
		`${summary.measured} rows measured, ${summary.unmeasured} not measured, ${summary.required} required by this leg, ${summary.missing.length} missing.`
	);
	lines.push('');
	lines.push(
		'| Row | Surface | Value | Budget | Source | Verdict | Required |'
	);
	lines.push('| --- | --- | --- | --- | --- | --- | --- |');
	for (const row of summary.rows) {
		lines.push(
			`| \`${row.id}\` | ${row.surface} | ${cellOf(row.value)} ${row.status === 'measured' ? row.unit : '-'} | ${cellOf(row.budget)} | ${row.budgetSource ?? '-'} | ${row.verdict} | ${row.required ? 'yes' : '-'} |`
		);
	}

	const unmeasured = summary.rows.filter(
		(row) => row.status !== 'measured' && row.reason
	);
	if (unmeasured.length > 0) {
		lines.push('');
		lines.push('### Not measured');
		lines.push('');
		for (const row of unmeasured) {
			lines.push(
				`- \`${row.id}\`${row.required ? ' (required)' : ''}: ${summarizeReason(row.reason)}`
			);
		}
	}

	if (artifact.previous && artifact.previous.rows.length > 0) {
		lines.push('');
		lines.push(
			`### Diff against \`${artifact.previous.previousCommitSha}\` (tolerance ${artifact.previous.tolerancePercent}%)`
		);
		lines.push('');
		lines.push('| Row | Previous | Current | Delta | Flag |');
		lines.push('| --- | --- | --- | --- | --- |');
		for (const row of artifact.previous.rows.slice(0, 20)) {
			lines.push(
				`| \`${row.id}\` | ${cellOf(row.previous)} | ${cellOf(row.current)} | ${row.deltaPercent === null ? '-' : `${row.deltaPercent}%`} | ${row.flagged ? 'REGRESSION' : 'ok'} |`
			);
		}
	}

	if (summary.regressions.length > 0) {
		lines.push('');
		lines.push(
			`Over the sampling tolerance: ${summary.regressions.join('; ')}.`
		);
	}

	if (summary.missing.length > 0) {
		lines.push('');
		lines.push('### Missing measurements');
		lines.push('');
		lines.push(
			`This run failed because ${summary.missing.length} required row(s) produced no number.`
		);
	}

	return `${lines.join('\n')}\n`;
};

export const buildMobileBenchReport = function buildMobileBenchReport(
	artifact: MobileBenchArtifactView,
	expectedRows: readonly string[],
	kind: string
): { failures: string[]; markdown: string; summary: MobileBenchSummary } {
	const byId = new Map(artifact.rows.map((row) => [row.id, row]));
	const required = new Set(expectedRows);
	const failures: string[] = [];
	const rows: MobileSummaryRow[] = [];

	for (const spec of artifact.rows) {
		rows.push({
			budget: spec.budget,
			budgetSource: spec.budgetSource,
			id: spec.id,
			reason: spec.reason,
			required: required.has(spec.id),
			status: spec.status === 'measured' ? 'measured' : 'not-measured',
			surface: spec.surface,
			unit: spec.unit,
			value: spec.value,
			verdict: verdictOf(spec),
		});
	}

	const missing: string[] = [];
	for (const id of expectedRows) {
		const row = byId.get(id);
		if (!row) {
			missing.push(id);
			failures.push(
				`required mobile benchmark row "${id}" is absent from the run`
			);
			rows.push({
				budget: null,
				budgetSource: null,
				id,
				reason: 'the harness emitted no row with this id',
				required: true,
				status: 'absent',
				surface: 'unknown',
				unit: 'unknown',
				value: null,
				verdict: 'not-measured',
			});
			continue;
		}
		if (row.status !== 'measured') {
			missing.push(id);
			failures.push(
				`required mobile benchmark row "${id}" was not measured: ${summarizeReason(row.reason)}`
			);
		}
	}

	const measured = rows.filter((row) => row.status === 'measured').length;
	if (measured === 0) {
		failures.push('no mobile benchmark row was measured');
	}

	const regressions = (artifact.previous?.rows ?? [])
		.filter((row) => row.flagged)
		.map(
			(row) =>
				`${row.id} grew ${row.deltaPercent ?? '?'}% since ${artifact.previous?.previousCommitSha}`
		);

	const summary: MobileBenchSummary = {
		commitSha: artifact.commitSha,
		generatedAt: new Date().toISOString(),
		kind,
		measured,
		missing,
		ok: failures.length === 0,
		regressions,
		required: expectedRows.length,
		rows,
		runtime: artifact.runtime,
		suite: artifact.suite,
		unmeasured: rows.filter((row) => row.status !== 'measured').length,
	};

	return { failures, markdown: renderMarkdown(summary, artifact), summary };
};

const readArtifact = function readArtifact(
	path: string
): MobileBenchArtifactView {
	if (!existsSync(path)) {
		throw new Error(`No mobile benchmark artifact at ${path}.`);
	}
	const parsed = JSON.parse(
		readFileSync(path, 'utf8')
	) as MobileBenchArtifactView;
	if (!Array.isArray(parsed.rows) || parsed.rows.length === 0) {
		throw new Error(`Mobile benchmark artifact at ${path} has no rows.`);
	}
	return parsed;
};

if (import.meta.main) {
	const args = process.argv.slice(2);
	const arg = (name: string, fallback: string) => {
		const index = args.indexOf(name);
		return index === -1 ? fallback : (args[index + 1] ?? fallback);
	};
	const kind = arg('--kind', 'mobile');
	const reportDir = arg('--report-dir', '.ci-reports/mobile');
	const expectedRows = MOBILE_EXPECTED_ROWS[kind];

	if (!expectedRows) {
		process.stderr.write(
			`Unknown mobile benchmark leg "${kind}". Known legs: ${Object.keys(MOBILE_EXPECTED_ROWS).join(', ')}\n`
		);
		process.exit(1);
	}

	const markdownPath = join(reportDir, 'mobile-summary.md');
	try {
		const { failures, markdown, summary } = buildMobileBenchReport(
			readArtifact(arg('--artifact', join(reportDir, 'mobile-runtime.json'))),
			expectedRows,
			kind
		);
		writeFileSync(markdownPath, markdown);
		writeFileSync(
			join(reportDir, 'mobile-summary.json'),
			`${JSON.stringify(summary, null, 2)}\n`
		);
		if (process.env.GITHUB_STEP_SUMMARY) {
			appendFileSync(
				process.env.GITHUB_STEP_SUMMARY,
				`${markdown}\n<details><summary>mobile-summary.json</summary>\n\n\`\`\`json\n${JSON.stringify(summary, null, 2)}\n\`\`\`\n\n</details>\n`
			);
		}
		process.stdout.write(
			`${[
				`Mobile benchmarks (${kind}): ${summary.measured} measured, ${summary.required} required, ${summary.missing.length} missing, ${summary.regressions.length} over tolerance.`,
				...failures.map((failure) => `  - ${failure}`),
			].join('\n')}\n`
		);
		if (failures.length > 0) {
			process.exit(1);
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		// Same shape as the runtime comparisons: a run that produced nothing is a
		// failed measurement, never an empty table that reads as green.
		if (process.env.GITHUB_STEP_SUMMARY) {
			appendFileSync(
				process.env.GITHUB_STEP_SUMMARY,
				`## Mobile benchmarks (${kind}) measurement failed\n\n${message}\n`
			);
		}
		process.stderr.write(`${message}\n`);
		process.exit(1);
	}
}
