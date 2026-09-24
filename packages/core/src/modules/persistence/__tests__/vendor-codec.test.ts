/**
 * @vitest-environment jsdom
 */
/**
 * The `<key>-vendors` sibling record: compact and JSON round trips,
 * rejection of malformed input, storage reads on both paths, the SSR
 * cookie-header read, and independence from the consent envelope.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
	explicitChoice,
	NOW,
} from '../../../__tests__/fixtures/kernel-fixtures';
import { STORAGE_KEY_V2 } from '../../../libs/storage-keys';
import {
	readStoredRecords,
	readStoredRecordsFromCookieHeader,
} from '../hydrate';
import {
	decodeVendorChoice,
	decodeVendorChoiceCompact,
	encodeVendorChoice,
	encodeVendorChoiceCompact,
	encodeStoredConsentEnvelopeCompact,
	validateStoredConsentEnvelope,
} from '../record-codec';
import {
	clearStoredConsentRecords,
	readStoredVendorChoice,
	resolveStorageKeys,
	writeStoredVendorChoice,
} from '../record-storage';

const clearAll = () => {
	window.localStorage.clear();
	for (const cookie of document.cookie.split(';')) {
		const name = cookie.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		}
	}
};

beforeEach(clearAll);
afterEach(clearAll);

describe('vendor choice compact projection', () => {
	it('round-trips sorted ids', () => {
		const record = {
			confirmedAt: NOW - 1,
			denied: ['meta-pixel', 'ga.v4_eu'],
			version: 1 as const,
		};
		const text = encodeVendorChoiceCompact(record);
		expect(text).toBe(`v=1&t=${NOW - 1}&d=ga.v4_eu|meta-pixel`);
		expect(decodeVendorChoiceCompact(text, NOW)).toEqual({
			ok: true,
			record: { ...record, denied: ['ga.v4_eu', 'meta-pixel'] },
		});
	});

	it('rejects a percent-encoded id that is not a slug', () => {
		// A cookie anyone can write. An id outside the slug shape would ride
		// into every later grant map and fail the wire schema on the backend.
		const text = `v=1&t=${NOW - 1}&d=Bad%20ID|meta-pixel`;
		expect(decodeVendorChoiceCompact(text, NOW)).toEqual({
			issues: [{ code: 'invalid-identifier', path: 'denied[0]' }],
			ok: false,
		});
	});

	it('carries the subject in both projections', () => {
		const record = {
			confirmedAt: NOW - 1,
			denied: ['meta-pixel'],
			subject: { externalId: 'u/1', subjectId: 'sub_1' },
			version: 1 as const,
		};
		const compact = encodeVendorChoiceCompact(record);
		expect(compact).toBe(`v=1&t=${NOW - 1}&d=meta-pixel&sid=sub_1&eid=u%2F1`);
		expect(decodeVendorChoiceCompact(compact, NOW)).toEqual({
			ok: true,
			record,
		});
		expect(
			decodeVendorChoice(JSON.parse(encodeVendorChoice(record)), NOW)
		).toEqual({ ok: true, record });
		expect(
			decodeVendorChoice({ ...record, subject: { subjectId: '' } }, NOW).ok
		).toBe(false);
	});

	it('omits the list when nothing is denied', () => {
		const text = encodeVendorChoiceCompact({
			confirmedAt: NOW - 1,
			denied: [],
			version: 1,
		});
		expect(text).toBe(`v=1&t=${NOW - 1}`);
		expect(decodeVendorChoiceCompact(text, NOW)).toEqual({
			ok: true,
			record: { confirmedAt: NOW - 1, denied: [], version: 1 },
		});
	});

	it.each([
		['unknown version', 'v=2&t=1&d=x'],
		['future time', `v=1&t=${NOW + 1}&d=x`],
		['unknown field', `v=1&t=${NOW - 1}&z=1`],
		['duplicate field', `v=1&t=${NOW - 1}&t=${NOW - 2}`],
		['duplicate id', `v=1&t=${NOW - 1}&d=x|x`],
		['bad encoding', `v=1&t=${NOW - 1}&d=%E0%A4%A`],
		['missing time', 'v=1&d=x'],
	])('rejects %s', (_label, text) => {
		expect(decodeVendorChoiceCompact(text, NOW).ok).toBe(false);
	});
});

describe('vendor choice JSON record', () => {
	it('round-trips and keeps a prototype-named id as a plain member', () => {
		const record = {
			confirmedAt: NOW - 1,
			denied: ['constructor', 'meta-pixel'],
			version: 1 as const,
		};
		const parsed: unknown = JSON.parse(encodeVendorChoice(record));
		const decoded = decodeVendorChoice(parsed, NOW);
		expect(decoded).toEqual({ ok: true, record });
	});

	it.each([
		['not an object', 'x'],
		['extra key', { confirmedAt: NOW, denied: [], extra: 1, version: 1 }],
		['empty id', { confirmedAt: NOW, denied: [''], version: 1 }],
		['non-string id', { confirmedAt: NOW, denied: [1], version: 1 }],
		['non-slug id', { confirmedAt: NOW, denied: ['Bad ID'], version: 1 }],
		['__proto__ id', { confirmedAt: NOW, denied: ['__proto__'], version: 1 }],
	])('rejects %s', (_label, input) => {
		expect(decodeVendorChoice(input, NOW).ok).toBe(false);
	});
});

describe('vendor choice storage', () => {
	it('writes both projections under the derived key and reads the cookie first', () => {
		const keys = resolveStorageKeys(undefined);
		expect(keys.vendors).toBe(`${STORAGE_KEY_V2}-vendors`);
		const result = writeStoredVendorChoice(
			{ confirmedAt: NOW - 1, denied: ['meta-pixel'], version: 1 },
			undefined,
			NOW
		);
		expect(result.ok).toBe(true);
		expect(window.localStorage.getItem(keys.vendors)).toContain('meta-pixel');
		expect(document.cookie).toContain(`${keys.vendors}=v=1`);
		expect(readStoredVendorChoice(undefined, NOW)).toEqual({
			ok: true,
			record: { confirmedAt: NOW - 1, denied: ['meta-pixel'], version: 1 },
		});
	});

	it('falls back to localStorage when the cookie is absent', () => {
		const keys = resolveStorageKeys(undefined);
		window.localStorage.setItem(
			keys.vendors,
			encodeVendorChoice({ confirmedAt: NOW - 1, denied: ['x'], version: 1 })
		);
		expect(readStoredVendorChoice(undefined, NOW)?.ok).toBe(true);
	});

	it('is carried by the browser read and cleared with every other record', () => {
		writeStoredVendorChoice(
			{ confirmedAt: NOW - 1, denied: ['meta-pixel'], version: 1 },
			undefined,
			NOW
		);
		const stored = readStoredRecords(undefined, NOW);
		expect(stored.found).toBe(true);
		expect(stored.records.vendorChoice).toEqual({
			confirmedAt: NOW - 1,
			denied: ['meta-pixel'],
			version: 1,
		});
		clearStoredConsentRecords();
		expect(readStoredVendorChoice(undefined, NOW)).toBeNull();
		expect(readStoredRecords(undefined, NOW).records.vendorChoice).toBeNull();
	});

	it('seeds the subject from the vendor record when no envelope exists', () => {
		writeStoredVendorChoice(
			{
				confirmedAt: NOW - 1,
				denied: ['meta-pixel'],
				subject: { subjectId: 'sub_1' },
				version: 1,
			},
			undefined,
			NOW
		);
		const { records } = readStoredRecords(undefined, NOW);
		expect(records.subject).toEqual({ subjectId: 'sub_1' });
		// The kernel's own record shape: the subject is not repeated inside it.
		expect(records.vendorChoice).toEqual({
			confirmedAt: NOW - 1,
			denied: ['meta-pixel'],
			version: 1,
		});
	});

	it('is read from a request cookie header for server rendering', () => {
		const vendorsCookie = encodeVendorChoiceCompact({
			confirmedAt: NOW - 1,
			denied: ['meta-pixel'],
			version: 1,
		});
		const header = `${STORAGE_KEY_V2}-vendors=${vendorsCookie}`;
		const records = readStoredRecordsFromCookieHeader(header, undefined, NOW);
		expect(records.vendorChoice).toEqual({
			confirmedAt: NOW - 1,
			denied: ['meta-pixel'],
			version: 1,
		});
		expect(records.choice).toBeNull();
	});

	it('leaves the consent envelope untouched', () => {
		const envelope = {
			categories: explicitChoice({ marketing: true }).categories,
			version: 3 as const,
		};
		const before = encodeStoredConsentEnvelopeCompact(envelope);
		writeStoredVendorChoice(
			{ confirmedAt: NOW - 1, denied: ['meta-pixel'], version: 1 },
			undefined,
			NOW
		);
		expect(encodeStoredConsentEnvelopeCompact(envelope)).toBe(before);
		expect(
			validateStoredConsentEnvelope(
				{ ...envelope, vendorChoice: {} } as unknown,
				NOW
			).ok
		).toBe(false);
	});
});
