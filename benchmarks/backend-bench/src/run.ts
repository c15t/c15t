/**
 * Head-to-head query benchmarks for the backend rewrite (RFC 0004 §7).
 *
 * A 2×2, swept across subject counts:
 *
 * |                    | migration 1 (no indexes) | migration 2 (indexed) |
 * | ------------------ | ------------------------ | --------------------- |
 * | **chunked fan-out**| the shipped design       | indexes alone         |
 * | **joined**         | the join alone           | the rewrite as shipped|
 *
 * The off-diagonal cells are the point. Without them a single before/after
 * number cannot distinguish "the join helped" from "the indexes helped", and
 * RFC §11.4 is explicit that a large indexing win must not be silently
 * attributed to Effect. Adding indexes to the *old* pattern is what makes the
 * attribution honest.
 *
 * Runs against PGlite so it needs no server and no Docker.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { up as baseline } from '@c15t/backend/db/migrations/1-baseline';
import { up as hotPathIndexes } from '@c15t/backend/db/migrations/2-hot-path-indexes';
import { PgliteClient } from '@effect/sql-pglite';
import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';

import { chunkedFanout, joined } from './arms';
import type { ArmResult } from './arms';

const SUBJECT_COUNTS = [1, 10, 100, 1000] as const;
const POLICY_TYPES = 5;
const ITERATIONS = 12;
const WARMUP = 3;

interface Sample {
	readonly arm: string;
	readonly migrations: string[];
	readonly subjects: number;
	readonly queries: number;
	readonly durations: number[];
}

/**
 * Background rows per targeted subject.
 *
 * Without this every subject shares one `externalId`, so `where "externalId" =
 * ?` selects 100% of the table — the one shape where an index cannot help and
 * the planner pays for it anyway. An earlier revision of this benchmark did
 * exactly that and reported indexes making the query *slower*, which said
 * nothing about the indexes and everything about the fixture.
 *
 * A real deployment has many external ids and reads one. 20× background gives
 * roughly 5% selectivity, which is where an index is supposed to earn its
 * keep.
 */
const BACKGROUND_RATIO = 20;

const seed = Effect.fn('seed')(function* seed(subjects: number) {
	const sql = yield* SqlClient.SqlClient;

	yield* sql.unsafe(`insert into "domain" ("id","name","createdAt","updatedAt")
		values ('dom_1','example.com',now(),now())`);

	for (let type = 0; type < POLICY_TYPES; type += 1) {
		for (const version of [0, 1]) {
			yield* sql.unsafe(`insert into "consentPolicy"
				("id","version","type","effectiveDate","isActive","createdAt")
				values ('pol_${type}_${version}','1.${version}','type_${type}',
					now() - interval '${version} day', true, now())`);
		}
	}

	// One statement rather than N inserts, so seeding a thousand subjects does
	// not dominate the run.
	const subjectRows = Array.from(
		{ length: subjects },
		(_, index) => `('sub_${index}','ext_bench',now(),now())`
	).join(',');
	yield* sql.unsafe(
		`insert into "subject" ("id","externalId","createdAt","updatedAt") values ${subjectRows}`
	);

	const consentRows = Array.from(
		{ length: subjects },
		(_, index) =>
			`('cns_${index}','sub_${index}','dom_1','pol_${index % POLICY_TYPES}_0','[]',now())`
	).join(',');
	yield* sql.unsafe(
		`insert into "consent" ("id","subjectId","domainId","policyId","purposeIds","givenAt") values ${consentRows}`
	);

	// Background population under other external ids, so the measured query
	// reads a slice of the table rather than all of it.
	const background = subjects * BACKGROUND_RATIO;
	for (let offset = 0; offset < background; offset += 5000) {
		const size = Math.min(5000, background - offset);
		const bgSubjects = Array.from(
			{ length: size },
			(_, index) =>
				`('bg_${offset + index}','ext_other_${offset + index}',now(),now())`
		).join(',');
		yield* sql.unsafe(
			`insert into "subject" ("id","externalId","createdAt","updatedAt") values ${bgSubjects}`
		);

		const bgConsents = Array.from(
			{ length: size },
			(_, index) =>
				`('bgc_${offset + index}','bg_${offset + index}','dom_1','pol_${(offset + index) % POLICY_TYPES}_0','[]',now())`
		).join(',');
		yield* sql.unsafe(
			`insert into "consent" ("id","subjectId","domainId","policyId","purposeIds","givenAt") values ${bgConsents}`
		);
	}

	// Planner statistics are what decide index vs sequential scan; without
	// this the first queries run against an empty pg_statistic.
	yield* sql.unsafe('analyze');
});

const measure = Effect.fn('measure')(function* measure(
	arm: (
		externalId: string
	) => Effect.Effect<ArmResult, unknown, SqlClient.SqlClient | never>,
	label: string,
	migrations: string[],
	subjects: number
) {
	for (let index = 0; index < WARMUP; index += 1) {
		yield* arm('ext_bench');
	}

	const durations: number[] = [];
	let queries = 0;
	for (let index = 0; index < ITERATIONS; index += 1) {
		const start = performance.now();
		const result = yield* arm('ext_bench');
		durations.push(performance.now() - start);
		// oxlint-disable-next-line prefer-destructuring -- Preserve declaration order, interface shape, and public compatibility.
		queries = result.queries;
	}

	return {
		arm: label,
		durations,
		migrations,
		queries,
		subjects,
	} satisfies Sample;
});

/**
 * One isolated database per cell, so no arm inherits another's cache state.
 *
 * All three arms run against the *same* seeded database within a cell, so the
 * only difference between them is how they query it.
 */
const cell = (subjects: number, indexed: boolean) =>
	// oxlint-disable-next-line no-shadow -- Preserve established bindings and assignment semantics.
	Effect.gen(function* cell() {
		yield* baseline;
		if (indexed) {
			yield* hotPathIndexes;
		}
		yield* seed(subjects);

		const migrations = indexed
			? ['1-baseline', '2-hot-path-indexes']
			: ['1-baseline'];

		// The `v2-backend` arm — the real fumadb data layer — went with the
		// package at cutover. Its numbers are recorded in RFC 0004 §11.5:
		// 16.516ms unindexed and 11.927ms indexed against this join's 4.337 and
		// 3.273, which is where the 3.64x like-for-like figure comes from.
		//
		// What remains still earns its keep: `chunked-fanout` reproduces the
		// shipped query *pattern* against a bare client, so the join can be
		// compared against the shape it replaced. What it cannot show any more
		// is fumadb's own overhead, which was about half the v2 cost — so
		// treat these as a floor on the improvement rather than the whole of
		// it. Restoring the arm means depending on the published 2.x package
		// under an alias.
		return [
			yield* measure(chunkedFanout, 'chunked-fanout', migrations, subjects),
			yield* measure(joined, 'joined', migrations, subjects),
		];
	}).pipe(Effect.provide(PgliteClient.layer({})));

const stats = (values: number[]) => {
	const sorted = [...values].sort((a, b) => a - b);
	const at = (q: number) =>
		sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? 0;
	return {
		avg: sorted.reduce((total, value) => total + value, 0) / sorted.length,
		median: at(0.5),
		p95: at(0.95),
	};
};

const program = Effect.gen(function* program() {
	const samples: Sample[] = [];
	for (const subjects of SUBJECT_COUNTS) {
		for (const indexed of [false, true]) {
			samples.push(...(yield* cell(subjects, indexed)));
		}
	}
	return samples;
});

const samples = await Effect.runPromise(program);

const rows = samples.map((sample) => ({
	arm: sample.arm,
	indexed: sample.migrations.length > 1,
	queries: sample.queries,
	subjects: sample.subjects,
	...stats(sample.durations),
}));

process.stdout.write(
	`\n| arm | indexed | subjects | queries | median ms | p95 ms |\n` +
		`| --- | --- | ---: | ---: | ---: | ---: |\n${rows
			.map(
				(row) =>
					`| ${row.arm} | ${row.indexed ? 'yes' : 'no'} | ${row.subjects} | ${row.queries} | ${row.median.toFixed(3)} | ${row.p95.toFixed(3)} |`
			)
			.join('\n')}\n\n`
);

const outputDir =
	process.env.BENCH_OUTPUT_DIR ?? '../../.benchmarks/current/backend-runtime';
mkdirSync(outputDir, { recursive: true });
writeFileSync(
	join(outputDir, 'subject-list.json'),
	`${JSON.stringify(
		{
			engine: 'postgres',
			framework: 'backend',
			generatedAt: new Date().toISOString(),
			iterations: ITERATIONS,
			note: 'Query patterns compared against one client. The chunked-fanout arm reproduces list.handler.ts and consent-enrichment.ts rather than calling @c15t/backend, which isolates the pattern and excludes fumadb overhead — so it measures the floor of the old design, not the shipped package.',
			rows,
			suite: 'backend-runtime',
		},
		null,
		2
	)}\n`
);
