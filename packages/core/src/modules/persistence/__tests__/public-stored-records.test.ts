/**
 * @vitest-environment jsdom
 *
 * `StoredRecords` is exported from `@c15t/core/modules/persistence`. A record
 * built by hand with the fields it had in 3.1.0, such as a typed mock, still
 * type-checks, and a read always sets the subject metadata.
 */
import { describe, expect, expectTypeOf, test } from 'vitest';

import { readStoredRecords } from '../index';
import type { StoredRecords } from '../index';

describe('the exported StoredRecords type', () => {
	test('a record with the 3.1.0 fields type-checks', () => {
		const read = readStoredRecords(undefined, Date.now());
		const legacy: StoredRecords = {
			candidates: [],
			epoch: 0,
			found: false,
			iab: null,
			records: read.records,
			vendorSubject: null,
		};
		expect(legacy.found).toBe(false);
	});

	test('a read always sets the subject metadata', () => {
		const read = readStoredRecords(undefined, Date.now());
		expectTypeOf(read.recordedSubjectId).toEqualTypeOf<string | null>();
		expectTypeOf(read.subjectCarrier).toEqualTypeOf<
			'choice' | 'vendors' | 'notice' | null
		>();
		const typed: StoredRecords = read;
		expect(typed).toMatchObject({
			recordedSubjectId: null,
			subjectCarrier: null,
		});
	});
});
