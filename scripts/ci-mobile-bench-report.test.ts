import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
	buildMobileBenchReport,
	MOBILE_EXPECTED_ROWS,
	summarizeReason,
} from './ci-mobile-bench-report';

// The committed run is the only place these row ids are agreed, so a rename in
// `benchmarks/mobile/src/rows.ts` has to break something here.
const storedRun = JSON.parse(
	readFileSync(
		new URL('../benchmarks/mobile/results/latest.json', import.meta.url),
		'utf8'
	)
) as { rows: { id: string; status: string }[] };

interface RowSpec {
	id: string;
	status?: string;
	value?: number | null;
	budget?: number | null;
	reason?: string;
}

const rowOf = function rowOf({
	id,
	status = 'measured',
	value = 1,
	budget = 10,
	reason,
}: RowSpec) {
	return {
		budget,
		budgetSource: budget === null ? null : 'contract',
		id,
		label: id,
		reason,
		samples: status === 'measured' ? 100 : 0,
		status,
		surface: 'react-native-js',
		unit: 'us',
		value: status === 'measured' ? value : null,
	};
};

const artifactOf = function artifactOf(
	rows: ReturnType<typeof rowOf>[],
	previous?: {
		previousCommitSha: string;
		tolerancePercent: number;
		rows: {
			id: string;
			previous: number;
			current: number;
			deltaPercent: number | null;
			flagged: boolean;
		}[];
	}
) {
	return {
		commitSha: '0123456789abcdef',
		environment: { arch: 'arm64', os: 'linux' },
		previous,
		rows,
		runtime: 'node v24',
		suite: 'mobile-runtime',
		timestamp: '2026-09-17T00:00:00.000Z',
	};
};

const reportOf = function reportOf(
	rows: ReturnType<typeof rowOf>[],
	expectedRows: readonly string[],
	kind = 'android-js'
) {
	return buildMobileBenchReport(artifactOf(rows), expectedRows, kind);
};

describe('required measurements', () => {
	it('fails when a required row is absent from the run', () => {
		const result = reportOf([rowOf({ id: 'kept' })], ['kept', 'dropped']);
		expect(result.summary.missing).toEqual(['dropped']);
		expect(result.failures).toEqual([
			'required mobile benchmark row "dropped" is absent from the run',
		]);
		expect(result.markdown).toContain('### Missing measurements');
		expect(result.markdown).toContain('`dropped`');
	});
	it('fails when a required row carries a reason instead of a number', () => {
		const result = reportOf(
			[
				rowOf({ id: 'is_allowed_us' }),
				rowOf({
					id: 'snapshot_read_us',
					reason: 'parser missed',
					status: 'not-measured',
				}),
			],
			['snapshot_read_us']
		);
		expect(result.failures).toEqual([
			'required mobile benchmark row "snapshot_read_us" was not measured: parser missed',
		]);
		expect(result.summary.ok).toBe(false);
	});
	it('lets a row the leg does not require stay unmeasured', () => {
		const result = reportOf(
			[
				rowOf({ id: 'snapshot_read_us' }),
				rowOf({
					id: 'ios_binding_bytes',
					reason: 'needs a host app',
					status: 'not-measured',
				}),
			],
			['snapshot_read_us']
		);
		expect(result.failures).toEqual([]);
		expect(result.summary.ok).toBe(true);
		expect(result.markdown).toContain('`ios_binding_bytes`: needs a host app');
		expect(result.markdown).not.toContain('`ios_binding_bytes` (required)');
	});
	it('fails a run that measured nothing at all', () => {
		const result = reportOf(
			[rowOf({ id: 'snapshot_read_us', status: 'not-measured' })],
			[]
		);
		expect(result.failures).toContain('no mobile benchmark row was measured');
	});
	it('reports an over-budget row without moving the failure here', () => {
		const result = reportOf(
			[rowOf({ id: 'snapshot_read_us', value: 11 })],
			['snapshot_read_us']
		);
		expect(result.summary.rows[0]?.verdict).toBe('FAIL');
		expect(result.failures).toEqual([]);
	});
	it('names the rows that grew past the sampling tolerance', () => {
		const result = buildMobileBenchReport(
			artifactOf([rowOf({ id: 'snapshot_read_us' })], {
				previousCommitSha: 'feedface',
				rows: [
					{
						current: 4,
						deltaPercent: 60,
						flagged: true,
						id: 'snapshot_read_us',
						previous: 2,
					},
				],
				tolerancePercent: 25,
			}),
			['snapshot_read_us'],
			'android-js'
		);
		expect(result.summary.regressions).toEqual([
			'snapshot_read_us grew 60% since feedface',
		]);
		expect(result.markdown).toContain('REGRESSION');
	});
});

describe('expected row lists', () => {
	it.each(Object.keys(MOBILE_EXPECTED_ROWS))(
		'%s requires only rows the stored run measures',
		(kind) => {
			const measured = new Set(
				storedRun.rows
					.filter((rowEntry) => rowEntry.status === 'measured')
					.map((rowEntry) => rowEntry.id)
			);
			const stored = new Set(storedRun.rows.map((rowEntry) => rowEntry.id));
			for (const id of MOBILE_EXPECTED_ROWS[kind] ?? []) {
				expect(stored.has(id), `${kind}: unknown row ${id}`).toBe(true);
				expect(measured.has(id), `${kind}: unmeasurable row ${id}`).toBe(true);
			}
		}
	);
	it('has a leg for every mobile toolchain the mobile job runs', () => {
		expect(Object.keys(MOBILE_EXPECTED_ROWS).sort()).toEqual([
			'android-js',
			'ios-toolchain',
		]);
	});
});

describe('reason summaries', () => {
	it('prefers the compiler line over the command output', () => {
		expect(
			summarizeReason(
				':c15t-core:bench exited non-zero: gradle failed\ne: src/Bench.kt:178:42 Argument type mismatch\n\nFAILURE: Build failed'
			)
		).toBe('e: src/Bench.kt:178:42 Argument type mismatch');
	});
	it('falls back to the first line, and keeps one line under 200 characters', () => {
		expect(summarizeReason('  first line\nsecond line')).toBe('first line');
		const long = summarizeReason(`${'x'.repeat(400)}`);
		expect(long.length).toBeLessThanOrEqual(200);
		expect(long.endsWith('...')).toBe(true);
	});
	it('reports a missing reason', () => {
		expect(summarizeReason(undefined)).toBe('no reason recorded');
	});
});
