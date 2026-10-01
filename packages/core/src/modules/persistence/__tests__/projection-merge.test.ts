/**
 * @vitest-environment jsdom
 *
 * Every record is stored twice, as a cookie and in localStorage. A browser
 * can drop the cookie write while localStorage takes it. Reading the two
 * must never keep an older, more permissive copy in force, and must never
 * carry identity from before a clear into records written after it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChoiceBasis } from '../../../consent-record/types';
import { STORAGE_KEY_V2 } from '../../../libs/storage-keys';
import { readStoredRecords } from '../hydrate';
import {
	encodeNoticeDismissal,
	encodeNoticeDismissalCompact,
	encodeStoredConsentEnvelopeCompact,
	encodeStoredConsentEnvelopeJson,
	encodeVendorChoice,
	encodeVendorChoiceCompact,
} from '../record-codec';
import type { StoredConsentEnvelope } from '../record-codec';
import {
	readStoredNoticeDismissal,
	readStoredVendorChoice,
	writeStoredClearEpoch,
	writeStoredConsentEnvelope,
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
afterEach(() => {
	vi.restoreAllMocks();
	clearAll();
});

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

describe('vendor copies across a clear', () => {
	it('does not merge pre-clear cookie denials into a post-clear local list', () => {
		both(
			`${STORAGE_KEY_V2}-vendors`,
			encodeVendorChoiceCompact({
				confirmedAt: T - 2000,
				denied: ['vendor-a'],
				version: 1,
			}),
			// After the clear the visitor allowed everything.
			encodeVendorChoice({ confirmedAt: T - 500, denied: [], version: 1 })
		);
		writeStoredClearEpoch(T - 1000, undefined);

		const read = readStoredVendorChoice(undefined, T);
		expect(read?.ok ? read.record.denied : null).toEqual([]);
		expect(
			readStoredRecords(undefined, T).records.vendorChoice?.denied
		).toEqual([]);
	});

	it('uses the envelope epoch when the clear key is missing', () => {
		both(
			`${STORAGE_KEY_V2}-vendors`,
			encodeVendorChoiceCompact({
				confirmedAt: T - 2000,
				denied: ['vendor-a'],
				version: 1,
			}),
			encodeVendorChoice({ confirmedAt: T - 500, denied: [], version: 1 })
		);
		window.localStorage.setItem(
			STORAGE_KEY_V2,
			encodeStoredConsentEnvelopeJson({
				categories: {
					marketing: { basis, confirmedAt: T - 500, value: true },
				},
				epoch: T - 1000,
				version: 3,
			})
		);

		expect(
			readStoredRecords(undefined, T).records.vendorChoice?.denied
		).toEqual([]);
	});
});

describe('consent envelope ties between the copies', () => {
	const at = (value: boolean, confirmedAt: number) => ({
		basis,
		confirmedAt,
		value,
	});

	it('lets a local denial win over a cookie grant from the same millisecond', () => {
		both(
			STORAGE_KEY_V2,
			encodeStoredConsentEnvelopeCompact({
				categories: { marketing: at(true, T - 1000) },
				version: 3,
			}),
			encodeStoredConsentEnvelopeJson({
				categories: { marketing: at(false, T - 1000) },
				version: 3,
			})
		);

		const { records } = readStoredRecords(undefined, T);
		expect(records.choice?.categories.marketing?.value).toBe(false);
	});

	const envelope = (
		subjectId: string,
		categories: StoredConsentEnvelope['categories'] = {
			marketing: at(false, T - 1000),
		}
	): StoredConsentEnvelope => ({
		categories,
		subject: { subjectId },
		version: 3,
	});

	/** Run `write` while the browser silently drops every cookie assignment. */
	const withDroppedCookieWrites = (write: () => void) => {
		const frozen = document.cookie;
		Object.defineProperty(document, 'cookie', {
			configurable: true,
			get: () => frozen,
			set: () => {
				// Accepted and dropped.
			},
		});
		try {
			write();
		} finally {
			// Uncovers the accessor on Document.prototype again.
			delete (document as { cookie?: string }).cookie;
		}
	};

	/** A cookie set by something other than this page: a server or a sibling. */
	const setCookieElsewhere = (value: StoredConsentEnvelope) => {
		document.cookie = `${STORAGE_KEY_V2}=${encodeStoredConsentEnvelopeCompact(value)}; path=/`;
	};

	it('keeps the subject a subject-only rewrite stored when its cookie write was dropped', () => {
		writeStoredConsentEnvelope(envelope('sub_generated'), { now: T });
		withDroppedCookieWrites(() => {
			const result = writeStoredConsentEnvelope(envelope('sub_server'), {
				now: T,
			});
			expect(result.ok && result.written.cookie).toBe(false);
		});

		const { records } = readStoredRecords(undefined, T);
		expect(records.subject?.subjectId).toBe('sub_server');
	});

	it('keeps a subject a server response set in the cookie alone', () => {
		writeStoredConsentEnvelope(envelope('sub_local'), { now: T });
		// Server-side consent restoration rewrites only the cookie.
		setCookieElsewhere(envelope('sub_restored'));

		const { records } = readStoredRecords(undefined, T);
		expect(records.subject?.subjectId).toBe('sub_restored');
	});

	it('keeps a subject another subdomain wrote to the shared cookie after a dropped write here', () => {
		writeStoredConsentEnvelope(envelope('sub_generated'), { now: T });
		withDroppedCookieWrites(() => {
			writeStoredConsentEnvelope(envelope('sub_here'), { now: T });
		});
		// A sibling subdomain writes the shared cookie; this origin's
		// localStorage never sees it.
		setCookieElsewhere(envelope('sub_sibling'));

		const { records } = readStoredRecords(undefined, T);
		expect(records.subject?.subjectId).toBe('sub_sibling');
	});

	it('takes the subject with a newer local denial from a dropped cookie write', () => {
		writeStoredConsentEnvelope(
			envelope('sub_old', { marketing: at(true, T - 2000) }),
			{ now: T }
		);
		withDroppedCookieWrites(() => {
			writeStoredConsentEnvelope(
				envelope('sub_new', { marketing: at(false, T - 1000) }),
				{ now: T }
			);
		});

		const { records } = readStoredRecords(undefined, T);
		expect(records.choice?.categories.marketing?.value).toBe(false);
		expect(records.subject?.subjectId).toBe('sub_new');
	});

	it('keeps the cookie subject with a newer local denial the cookie has since moved past', () => {
		writeStoredConsentEnvelope(
			envelope('sub_old', { marketing: at(true, T - 3000) }),
			{ now: T }
		);
		withDroppedCookieWrites(() => {
			writeStoredConsentEnvelope(
				envelope('sub_here', {
					marketing: at(true, T - 3000),
					measurement: at(false, T - 1000),
				}),
				{ now: T }
			);
		});
		setCookieElsewhere(
			envelope('sub_sibling', { marketing: at(true, T - 3000) })
		);

		const { records } = readStoredRecords(undefined, T);
		// The denial only restricts, so it still applies.
		expect(records.choice?.categories.measurement?.value).toBe(false);
		expect(records.subject?.subjectId).toBe('sub_sibling');
	});

	it('keeps the cookie subject when the localStorage write failed', () => {
		writeStoredConsentEnvelope(envelope('sub_old'), { now: T });

		// localStorage is full: the next write reaches only the cookie.
		const setItem = vi
			.spyOn(window.localStorage, 'setItem')
			.mockImplementation(() => {
				throw new DOMException('Quota exceeded', 'QuotaExceededError');
			});
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const result = writeStoredConsentEnvelope(envelope('sub_new'), { now: T });
		setItem.mockRestore();
		expect(result.ok && result.written).toMatchObject({
			cookie: true,
			localStorage: false,
		});

		const { records } = readStoredRecords(undefined, T);
		expect(records.subject?.subjectId).toBe('sub_new');
	});
});
