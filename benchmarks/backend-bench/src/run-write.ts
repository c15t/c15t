/**
 * Write-path and manifest benchmarks.
 *
 * Separate from `run.ts` because these measure different things and one of
 * them needs a fresh row per iteration, which the read sweep does not.
 *
 * `/init` is deliberately absent. The rewrite's `/init` is not yet at parity
 * with `@c15t/backend`'s — the shipped one also fetches the GVL when IAB is
 * active, mints a policy snapshot token, and records a metric. Timing them
 * against each other would compare different amounts of work and flatter the
 * rewrite. It goes in once those land.
 */

import { up as baseline } from '@c15t/backend/db/migrations/1-baseline';
import { up as hotPathIndexes } from '@c15t/backend/db/migrations/2-hot-path-indexes';
import { buildConsentManifestFromConfig } from '@c15t/schema';
import { PgliteClient } from '@effect/sql-pglite';
import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';

import { onConflict, readThenWrite } from './write';
import type { WriteResult } from './write';

const ITERATIONS = 200;
const WARMUP = 20;

const stats = (values: number[]) => {
	const sorted = [...values].sort((a, b) => a - b);
	const at = (q: number) =>
		sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? 0;
	return { median: at(0.5), p95: at(0.95) };
};

const setup = Effect.gen(function* setup() {
	yield* baseline;
	yield* hotPathIndexes;
	const sql = yield* SqlClient.SqlClient;
	yield* sql.unsafe(`insert into "domain" ("id","name","createdAt","updatedAt")
		values ('dom_1','example.com',now(),now())`);
	yield* sql.unsafe(`insert into "subject" ("id","externalId","createdAt","updatedAt")
		values ('sub_1','ext_1',now(),now())`);
	yield* sql.unsafe('analyze');
});

/**
 * Measures a write.
 *
 * `fresh` controls which case is being timed: a new consent every iteration,
 * or the same submission repeatedly — the retry case, which is the common one
 * in production.
 */
const measureWrite = Effect.fn('measureWrite')(function* measureWrite(
	arm: (submission: {
		subjectId: string;
		domainId: string;
		policyId: string | null;
		givenAt: Date;
	}) => Effect.Effect<WriteResult, unknown, SqlClient.SqlClient>,
	label: string,
	fresh: boolean
) {
	const submission = (index: number) => ({
		domainId: 'dom_1',
		// A distinct givenAt makes each submission a distinct consent.
		givenAt: new Date(1_800_000_000_000 + (fresh ? index : 0)),

		policyId: null,
		subjectId: 'sub_1',
	});

	for (let index = 0; index < WARMUP; index += 1) {
		yield* arm(submission(fresh ? -1 - index : 0));
	}

	const durations: number[] = [];
	let queries = 0;
	for (let index = 0; index < ITERATIONS; index += 1) {
		const start = performance.now();
		const result = yield* arm(submission(index));
		durations.push(performance.now() - start);
		// oxlint-disable-next-line prefer-destructuring -- Preserve declaration order, interface shape, and public compatibility.
		queries = result.queries;
	}

	return {
		arm: label,
		case: fresh ? 'new' : 'retry',
		queries,
		...stats(durations),
	};
});

const writeCell = (fresh: boolean) =>
	// oxlint-disable-next-line no-shadow -- Preserve established bindings and assignment semantics.
	Effect.gen(function* writeCell() {
		yield* setup;
		return yield* measureWrite(readThenWrite, 'read-then-write', fresh);
	}).pipe(Effect.provide(PgliteClient.layer({})));

const writeCellNew = (fresh: boolean) =>
	// oxlint-disable-next-line no-shadow -- Preserve established bindings and assignment semantics.
	Effect.gen(function* writeCellNew() {
		yield* setup;
		return yield* measureWrite(onConflict, 'on-conflict', fresh);
	}).pipe(Effect.provide(PgliteClient.layer({})));

const rows = [
	await Effect.runPromise(writeCell(true)),
	await Effect.runPromise(writeCellNew(true)),
	await Effect.runPromise(writeCell(false)),
	await Effect.runPromise(writeCellNew(false)),
];

process.stdout.write(
	`\nConsent write\n\n| arm | case | queries | median ms | p95 ms |\n| --- | --- | ---: | ---: | ---: |\n${rows
		.map(
			(row) =>
				`| ${row.arm} | ${row.case} | ${row.queries} | ${row.median.toFixed(3)} | ${row.p95.toFixed(3)} |`
		)
		.join('\n')}\n`
);

// Manifest: both packages call the same shared builder, so this measures
// whether that shared work is expensive at all, not a difference between them.
const config = { appName: 'Example', tenantId: 'tenant_1' };
const manifestDurations: number[] = [];
{
	let index = 0;
	const runSequentialLoop1 =
		async function runSequentialLoop1(): Promise<void> {
			if (!(index < ITERATIONS)) {
				return;
			}
			const start = performance.now();
			await buildConsentManifestFromConfig(config);
			manifestDurations.push(performance.now() - start);

			index += 1;
			await runSequentialLoop1();
		};
	await runSequentialLoop1();
}
const manifest = stats(manifestDurations);

process.stdout.write(
	'\nManifest build (shared by both packages — identical code, not a comparison)\n' +
		`  median ${manifest.median.toFixed(3)} ms, p95 ${manifest.p95.toFixed(3)} ms\n\n`
);
