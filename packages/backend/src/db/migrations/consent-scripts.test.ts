/**
 * Migration 10, on every engine: it adds `consent.scripts` and nothing
 * else, keeps the rows already there, and a re-run does nothing.
 */

import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { SqlClient } from 'effect/sql';

import { ENGINES, resetDatabase } from '../../__tests__/engines';
import { encodeRow, encoder } from '../values';
import { up as baseline } from './1-baseline';
import { up as indexes } from './2-hot-path-indexes';
import { up as receipts } from './3-consent-receipts-and-privacy-directives';
import { up as vendorChoice } from './4-vendor-choice';
import { up as dropIdentityAuthority } from './5-drop-subject-identity-authority';
import { up as attribution } from './6-experiment-attribution';
import { up as optionalJurisdiction } from './7-optional-decision-jurisdiction';
import { up as verifiedExternalId } from './8-verified-external-id';
import { up as additionalConsent } from './9-additional-consent';
import {
	CONSENT_SCRIPTS_COLUMN,
	up as consentScripts,
} from './10-consent-scripts';

const columnsOf = Effect.fn('columnsOf')(function* columnsOf(table: string) {
	const sql = yield* SqlClient.SqlClient;
	const rows = yield* sql.onDialectOrElse({
		mysql: () =>
			sql<{ name: string }>`
				select column_name as name from information_schema.columns
				where table_schema = database() and table_name = ${table}
			`,
		orElse: () =>
			sql<{ name: string }>`
				select column_name as name from information_schema.columns
				where table_schema = current_schema() and table_name = ${table}
			`,
		sqlite: () =>
			sql<{ name: string }>`select name from pragma_table_info(${table})`,
	});
	return rows.map((row) => row.name).sort();
});

/** Every migration before this one. */
const throughMigration9 = Effect.gen(function* throughMigration9() {
	yield* resetDatabase;
	yield* baseline;
	yield* indexes;
	yield* receipts;
	yield* vendorChoice;
	yield* dropIdentityAuthority;
	yield* attribution;
	yield* optionalJurisdiction;
	yield* verifiedExternalId;
	yield* additionalConsent;
});

const COLUMN = CONSENT_SCRIPTS_COLUMN.name;

for (const engine of ENGINES) {
	describe(`consent scripts migration on ${engine.name}`, () => {
		it.effect(
			'adds the scripts column and nothing else',
			() =>
				Effect.gen(function* gen() {
					yield* throughMigration9;
					const before = yield* columnsOf('consent');
					assert.notInclude(before, COLUMN);

					yield* consentScripts;

					const after = yield* columnsOf('consent');
					assert.include(after, COLUMN);
					assert.deepStrictEqual(
						after.filter((column) => column !== COLUMN),
						before
					);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);

		it.effect(
			'keeps existing consents and leaves their scripts empty',
			() =>
				Effect.gen(function* gen() {
					yield* throughMigration9;
					const sql = yield* SqlClient.SqlClient;
					const encode = yield* encoder;
					const now = new Date(1_800_000_000_000);
					yield* sql`insert into ${sql('subject')} ${sql.insert(
						encodeRow(encode, { createdAt: now, id: 'sub_1', updatedAt: now })
					)}`;
					yield* sql`insert into ${sql('domain')} ${sql.insert(
						encodeRow(encode, {
							createdAt: now,
							id: 'dom_1',
							name: 'example.com',
							updatedAt: now,
						})
					)}`;
					yield* sql`insert into ${sql('consent')} ${sql.insert(
						encodeRow(encode, {
							domainId: 'dom_1',
							givenAt: now,
							id: 'cns_1',
							purposeIds: '[]',
							subjectId: 'sub_1',
							tcString: 'CQ_BEFORE',
						})
					)}`;

					yield* consentScripts;

					const rows = yield* sql<{
						scripts: unknown;
						tcString: string | null;
					}>`
						select ${sql(COLUMN)}, ${sql('tcString')} from ${sql('consent')}
					`;
					assert.deepStrictEqual(rows, [
						{ scripts: null, tcString: 'CQ_BEFORE' },
					]);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);

		it.effect(
			'is idempotent',
			() =>
				Effect.gen(function* gen() {
					yield* throughMigration9;
					yield* consentScripts;
					// A re-run after a partial apply must not fail on the column.
					yield* consentScripts;

					const consent = yield* columnsOf('consent');
					assert.strictEqual(
						consent.filter((column) => column === COLUMN).length,
						1
					);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);
	});
}
