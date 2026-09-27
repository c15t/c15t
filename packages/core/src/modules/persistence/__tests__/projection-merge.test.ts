/**
 * @vitest-environment jsdom
 *
 * Every record is stored twice, as a cookie and in localStorage. A browser
 * can drop the cookie write while localStorage takes it. Reading the two
 * must never keep an older, more permissive copy in force, and must never
 * carry identity from before a clear into records written after it.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ChoiceBasis, PrivacyOptOut } from '../../../consent-record/types';
import { STORAGE_KEY_V2 } from '../../../libs/storage-keys';
import { readStoredRecords } from '../hydrate';
import {
	encodeNoticeDismissal,
	encodeNoticeDismissalCompact,
	encodePrivacyOptOuts,
	encodePrivacyOptOutsCompact,
	encodeStoredConsentEnvelopeCompact,
	encodeStoredConsentEnvelopeJson,
	encodeVendorChoice,
	encodeVendorChoiceCompact,
} from '../record-codec';
import type { StoredConsentEnvelope } from '../record-codec';
import {
	readStoredNoticeDismissal,
	readStoredPrivacyOptOuts,
	readStoredVendorChoice,
	writeStoredClearEpoch,
} from '../record-storage';

const T = 1_800_000_000_000;
const basis: ChoiceBasis = { fingerprint: 'choice-fp', kind: 'choice-v1' };

const clearAll = () => {
	window.localStorage.clear();
	for (const pair of document.cookie.split(';')) {
		const name = pair.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		}
	}
};

beforeEach(clearAll);
afterEach(clearAll);

const both = (key: string, cookie: string, local: string) => {
	document.cookie = `${key}=${cookie}; path=/`;
	window.localStorage.setItem(key, local);
};

describe('consent envelope across a clear', () => {
	const cookieEnvelope: StoredConsentEnvelope = {
		categories: {
			marketing: { basis, confirmedAt: T - 2000, value: true },
		},
		subject: { subjectId: 'sub_before_clear' },
		version: 3,
	};

	it('does not carry the pre-clear cookie subject onto post-clear decisions', () => {
		const localEnvelope: StoredConsentEnvelope = {
			categories: {
				measurement: { basis, confirmedAt: T - 500, value: false },
			},
			epoch: T - 1000,
			subject: { subjectId: 'sub_after_clear' },
			version: 3,
		};
		both(
			STORAGE_KEY_V2,
			encodeStoredConsentEnvelopeCompact(cookieEnvelope),
			encodeStoredConsentEnvelopeJson(localEnvelope)
		);
		writeStoredClearEpoch(T - 1000, undefined);

		const { records } = readStoredRecords(undefined, T);
		expect(records.choice?.categories.marketing).toBeUndefined();
		expect(records.choice?.categories.measurement?.value).toBe(false);
		expect(records.subject?.subjectId).toBe('sub_after_clear');
	});

	it('drops the subject of a record written before the clear in force', () => {
		const stale: StoredConsentEnvelope = {
			...cookieEnvelope,
			categories: {
				marketing: { basis, confirmedAt: T - 500, value: false },
			},
		};
		document.cookie = `${STORAGE_KEY_V2}=${encodeStoredConsentEnvelopeCompact(stale)}; path=/`;
		writeStoredClearEpoch(T - 1000, undefined);

		const { records } = readStoredRecords(undefined, T);
		expect(records.choice?.categories.marketing?.value).toBe(false);
		expect(records.subject).toBeNull();
	});
});

describe('auxiliary projections', () => {
	const directive = (recordedAt: number): PrivacyOptOut => ({
		categories: ['marketing'],
		recordedAt,
		source: 'gpc',
	});

	it('keeps every privacy directive from both copies', () => {
		const older = { directives: [directive(T - 5000)], version: 1 as const };
		const newer = {
			directives: [directive(T - 5000), directive(T - 1000)],
			version: 1 as const,
		};
		both(
			`${STORAGE_KEY_V2}-privacy`,
			encodePrivacyOptOutsCompact(older),
			encodePrivacyOptOuts(newer)
		);

		const read = readStoredPrivacyOptOuts(undefined, T);
		expect(
			read?.ok ? read.record.directives.map((entry) => entry.recordedAt) : []
		).toEqual([T - 5000, T - 1000]);
	});

	it('adds a newer local vendor denial without lifting a cookie denial', () => {
		both(
			`${STORAGE_KEY_V2}-vendors`,
			encodeVendorChoiceCompact({
				confirmedAt: T - 2000,
				denied: ['vendor-a'],
				version: 1,
			}),
			encodeVendorChoice({
				confirmedAt: T - 1000,
				denied: ['vendor-b'],
				version: 1,
			})
		);

		const read = readStoredVendorChoice(undefined, T);
		expect(read?.ok ? read.record.denied : null).toEqual([
			'vendor-a',
			'vendor-b',
		]);
	});

	it('ignores an older local vendor list', () => {
		both(
			`${STORAGE_KEY_V2}-vendors`,
			encodeVendorChoiceCompact({
				confirmedAt: T - 1000,
				denied: [],
				version: 1,
			}),
			encodeVendorChoice({
				confirmedAt: T - 2000,
				denied: ['vendor-a'],
				version: 1,
			})
		);

		const read = readStoredVendorChoice(undefined, T);
		expect(read?.ok ? read.record.denied : null).toEqual([]);
	});

	it('reads the newer notice dismissal', () => {
		const older = {
			dismissedAt: T - 5000,
			fingerprint: 'old',
			version: 1 as const,
		};
		const newer = {
			dismissedAt: T - 1000,
			fingerprint: 'new',
			version: 1 as const,
		};
		both(
			`${STORAGE_KEY_V2}-notice`,
			encodeNoticeDismissalCompact(older),
			encodeNoticeDismissal(newer)
		);

		const read = readStoredNoticeDismissal(undefined, T);
		expect(read?.ok ? read.record.fingerprint : null).toBe('new');
	});
});
