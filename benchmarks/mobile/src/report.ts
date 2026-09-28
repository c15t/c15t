/**
 * Table rendering, gate arithmetic, and the diff against the previous run.
 *
 * Nothing here decides a threshold: values and ceilings both arrive on the row.
 */

import type {
	MobileBenchArtifact,
	MobileBenchCheck,
	MobileBenchDiffRow,
	MobileBenchRow,
} from './types';

/** Formats a measured value with the precision its unit deserves. */
export const formatValue = function formatValue(
	value: number | null,
	unit: MobileBenchRow['unit']
): string {
	if (value === null) {
		return '-';
	}
	if (unit === 'bytes') {
		return `${value.toLocaleString('en-US')} B`;
	}
	if (unit === 'count') {
		return `${value}`;
	}
	if (unit === 'percent') {
		return `${value.toFixed(3)} %`;
	}
	if (unit === 'ms') {
		return `${value.toFixed(3)} ms`;
	}
	return `${value.toFixed(3)} us`;
};

const pad = function pad(text: string, width: number, right = false): string {
	return right ? text.padStart(width) : text.padEnd(width);
};

/** One-word outcome for the table's last column. */
export const verdict = function verdict(row: MobileBenchRow): string {
	if (row.status === 'not-measured') {
		return 'not-measured';
	}
	if (row.budget === null || row.value === null) {
		return 'no-budget';
	}
	return row.value <= row.budget ? 'pass' : 'FAIL';
};

const renderTable = function renderTable(rows: MobileBenchRow[]): string[] {
	const headers = [
		'Row',
		'Surface',
		'Value',
		'Samples',
		'Budget',
		'Source',
		'Verdict',
	];
	const body = rows.map((row) => {
		const budget =
			row.budget === null ? '-' : formatValue(row.budget, row.unit);
		return [
			row.id,
			row.surface,
			formatValue(row.value, row.unit),
			row.samples > 0 ? `${row.samples}` : '-',
			budget,
			row.budgetSource ?? '-',
			verdict(row),
		];
	});

	const widths = headers.map((header, index) =>
		Math.max(header.length, ...body.map((row) => (row[index] ?? '').length))
	);

	const line = (cells: string[]) =>
		cells
			.map((cell, index) => pad(cell, widths[index] ?? cell.length, index >= 2))
			.join('  ');

	return [
		line(headers),
		line(widths.map((width) => '-'.repeat(width))),
		...body.map(line),
	];
};

/**
 * Compare a run against the previous stored artifact.
 *
 * @param current - Rows from this run.
 * @param previous - Rows from the stored artifact.
 * @param tolerancePercent - Growth that counts as a regression.
 * @returns Diff rows, newest-growth first.
 */
export const diffRows = function diffRows(
	current: MobileBenchRow[],
	previous: MobileBenchRow[],
	tolerancePercent: number
): MobileBenchDiffRow[] {
	const previousById = new Map(previous.map((row) => [row.id, row]));
	const rows: MobileBenchDiffRow[] = [];

	for (const row of current) {
		if (row.status !== 'measured' || row.value === null) {
			continue;
		}
		const before = previousById.get(row.id);
		if (!before || before.status !== 'measured' || before.value === null) {
			continue;
		}

		const delta = Number((row.value - before.value).toFixed(3));
		const deltaPercent =
			before.value === 0
				? null
				: Number(
						(((row.value - before.value) / before.value) * 100).toFixed(1)
					);

		rows.push({
			current: row.value,
			delta,
			deltaPercent,
			flagged: deltaPercent !== null && deltaPercent > tolerancePercent,
			id: row.id,
			previous: before.value,
		});
	}

	return rows.sort(
		(a, b) =>
			(b.deltaPercent ?? Number.NEGATIVE_INFINITY) -
			(a.deltaPercent ?? Number.NEGATIVE_INFINITY)
	);
};

/** Render the previous-run diff, worst growth first. */
const renderDiff = function renderDiff(
	previous: MobileBenchArtifact['previous'],
	tolerancePercent: number
): string[] {
	if (!previous || previous.rows.length === 0) {
		return [];
	}

	const rows = previous.rows.map((row) => [
		row.id,
		formatValue(row.previous, 'count'),
		formatValue(row.current, 'count'),
		row.deltaPercent === null
			? '-'
			: `${row.deltaPercent > 0 ? '+' : ''}${row.deltaPercent.toFixed(1)}%`,
		row.flagged ? 'REGRESSION' : 'ok',
	]);
	const headers = ['Row', 'Previous', 'Current', 'Delta', 'Flag'];
	const widths = headers.map((header, index) =>
		Math.max(header.length, ...rows.map((row) => (row[index] ?? '').length))
	);
	const line = (cells: string[]) =>
		cells
			.map((cell, index) => pad(cell, widths[index] ?? cell.length, index >= 1))
			.join('  ');

	return [
		`diff against ${previous.previousCommitSha} (${previous.previousTimestamp}), tolerance ${tolerancePercent}%`,
		line(headers),
		line(widths.map((width) => '-'.repeat(width))),
		...rows.map(line),
		'',
	];
};

/**
 * Decide the exit code for `--check`.
 *
 * A measured row over its ceiling fails. So does measuring nothing at all: an
 * empty table must never look like a green gate. An unmeasured row is reported
 * and does not fail on its own, because the harness is expected to run on
 * machines without a simulator or an emulator.
 *
 * Report mode still fills `failed`, so the table can name the rows it is letting
 * through, but `ok` only ever goes false under `--check`. A plain
 * `bun run bench:mobile` prints numbers and exits zero.
 *
 * @param rows - Every row from the run.
 * @param enforced - Whether `--check` was passed.
 * @returns The gate outcome.
 */
export const buildCheck = function buildCheck(
	rows: MobileBenchRow[],
	enforced: boolean
): MobileBenchCheck {
	const failed = rows
		.filter((row) => verdict(row) === 'FAIL')
		.map(
			(row) => `${row.id} is ${row.value} ${row.unit}, ceiling ${row.budget}`
		);

	const measured = rows.filter((row) => row.status === 'measured');
	const unmeasured = rows
		.filter((row) => row.status === 'not-measured')
		.map((row) => `${row.id}: ${row.reason ?? 'no reason recorded'}`);

	if (enforced && measured.length === 0) {
		failed.push('no row was measured, so the gate has nothing to certify');
	}

	return {
		enforced,
		failed,
		measuredCount: measured.length,
		ok: !enforced || failed.length === 0,
		unmeasured,
	};
};

/**
 * Render the whole report: the table grouped by surface, then any unmeasured
 * reasons and the previous-run diff.
 *
 * @param artifact - The run to render.
 * @returns Printable lines.
 */
export const renderReport = function renderReport(
	artifact: MobileBenchArtifact
): string[] {
	const lines: string[] = [];

	lines.push(
		`c15t mobile benchmark  ${artifact.commitSha}  ${artifact.timestamp}`
	);
	lines.push(
		`  ${artifact.environment.os}/${artifact.environment.arch}  bun ${artifact.environment.bunVersion ?? 'n/a'}  node ${artifact.environment.nodeVersion ?? 'n/a'}  dirty=${String(artifact.gitDirty)}`
	);
	lines.push(
		`  budgets: ${artifact.contract}  sampling: warmup ${artifact.sampling.warmupIterations}, measured ${artifact.sampling.measuredIterations}, idle ${artifact.sampling.idleWindowMs} ms`
	);
	lines.push('');

	const surfaces: MobileBenchRow['surface'][] = [
		'swift-core',
		'kotlin-core',
		'react-native-js',
		'bundle',
	];

	for (const surface of surfaces) {
		const rows = artifact.rows.filter((row) => row.surface === surface);
		if (rows.length === 0) {
			continue;
		}
		lines.push(`${surface}  (${rows.length} rows)`);
		lines.push(...renderTable(rows));
		lines.push('');
	}

	const unmeasured = artifact.rows.filter(
		(row) => row.status === 'not-measured'
	);
	if (unmeasured.length > 0) {
		lines.push('not-measured, with reasons');
		for (const row of unmeasured) {
			lines.push(`  ${row.id}: ${row.reason ?? 'no reason recorded'}`);
		}
		lines.push('');
	}

	const failing = artifact.rows.filter((row) => verdict(row) === 'FAIL');
	if (failing.length > 0) {
		lines.push('over budget');
		for (const row of failing) {
			lines.push(
				`  ${row.id}: ${formatValue(row.value, row.unit)} against a ${formatValue(row.budget, row.unit)} ceiling`
			);
		}
		lines.push('');
	}

	if (artifact.previous) {
		lines.push(
			...renderDiff(
				artifact.previous,
				artifact.sampling.subsequentRunDiffTolerancePercent
			)
		);
	}

	for (const note of artifact.notes) {
		lines.push(`note: ${note}`);
	}

	return lines;
};
