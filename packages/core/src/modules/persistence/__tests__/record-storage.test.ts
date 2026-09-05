/**
 * Storage boundary: raw candidates keep their provenance, selection is
 * structural only, reads never write, and v3 writes round-trip through
 * both stores. See c15t/c15t#1025.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { makePolicy } from '../../../consent-record/__tests__/fixtures';
import { evaluateConsentRecord } from '../../../consent-record/evaluate';
import type { ChoiceBasis } from '../../../consent-record/types';
import { setCookie } from '../../../libs/cookie';
import { STORAGE_KEY, STORAGE_KEY_V2 } from '../../../libs/storage-keys';
import { encodeStoredConsentEnvelopeCompact } from '../record-codec';
import type { StoredConsentEnvelope } from '../record-codec';
import {
	clearStoredConsentRecords,
	readRawStoredConsentCandidates,
	readStoredConsentRecord,
	readStoredConsentRecordFromCookieHeader,
	readStoredNoticeDismissal,
	readStoredPrivacyOptOuts,
	resolveStorageKeys,
	writeStoredConsentEnvelope,
	writeStoredNoticeDismissal,
	writeStoredPrivacyOptOuts,
} from '../record-storage';

const NOW = 1_800_000_000_000;
const DAY = 86_400_000;
const SUBJECT_ID = 'sub_2VZxR7YmNpKq3WfLs8TgHd';
const CHOICE_FP = 'choice-fp-1';

const legacyRecord = function legacyRecord(
	consents: Record<string, boolean>,
	time = NOW - DAY,
	extra: Record<string, unknown> = {}
) {
	return {
		consentInfo: { subjectId: SUBJECT_ID, time, ...extra },
		consents,
	};
};

const currentBasis: ChoiceBasis = { fingerprint: CHOICE_FP, kind: 'choice-v1' };

const snapshotStores = function snapshotStores() {
	return {
		cookie: document.cookie,
		local: [
			...(
				window.localStorage as unknown as { store: Map<string, string> }
			).store.entries(),
		],
	};
};

describe('raw candidate reading', () => {
	beforeEach(() => {
		document.cookie = '';
		window.localStorage.clear();
	});

	afterEach(() => {
		document.cookie = '';
		window.localStorage.clear();
		vi.restoreAllMocks();
	});

	it('reports every source in cookie, configured, legacy order with encodings', () => {
		setCookie(
			STORAGE_KEY_V2,
			legacyRecord({ marketing: true, necessary: true })
		);
		window.localStorage.setItem(
			STORAGE_KEY_V2,
			JSON.stringify(legacyRecord({ necessary: true }))
		);
		window.localStorage.setItem(STORAGE_KEY, 'not json');

		const candidates = readRawStoredConsentCandidates();

		expect(
			candidates.map((candidate) => [candidate.source, candidate.status])
		).toEqual([
			['cookie', 'parsed'],
			['local-storage', 'parsed'],
			['legacy-local-storage', 'unparseable'],
		]);
		const [cookie, local] = candidates;
		expect(cookie?.status === 'parsed' && cookie.encoding).toBe('compact');
		expect(local?.status === 'parsed' && local.encoding).toBe('json');
		// The raw compact value is exposed before any false is restored.
		expect(
			cookie?.status === 'parsed' &&
				(cookie.value as { consents: Record<string, boolean> }).consents
		).toEqual({ marketing: true, necessary: true });
	});

	it('skips a malformed cookie and selects valid localStorage without writing', () => {
		document.cookie = `${STORAGE_KEY_V2}=c.necessary:1,i.t:not-a-number`;
		window.localStorage.setItem(
			STORAGE_KEY_V2,
			JSON.stringify(legacyRecord({ marketing: false, necessary: true }))
		);
		const before = snapshotStores();

		const { candidates, selected } = readStoredConsentRecord(undefined, NOW);

		expect(candidates[0]?.status).toBe('invalid');
		expect(selected?.source).toBe('local-storage');
		expect(selected?.format).toBe('legacy-v2');
		expect(selected?.choice.categories.marketing?.value).toBe(false);
		expect(snapshotStores()).toEqual(before);
	});

	it('keeps an expired but valid cookie over fresher localStorage grants', () => {
		setCookie(
			STORAGE_KEY_V2,
			legacyRecord({ marketing: true, necessary: true }, NOW - 400 * DAY)
		);
		window.localStorage.setItem(
			STORAGE_KEY_V2,
			JSON.stringify(
				legacyRecord({ marketing: true, necessary: true }, NOW - DAY)
			)
		);

		const { selected } = readStoredConsentRecord(undefined, NOW);

		expect(selected?.source).toBe('cookie');
		expect(selected?.choice.categories.marketing?.confirmedAt).toBe(
			NOW - 400 * DAY
		);

		const evaluation = evaluateConsentRecord({
			choice: selected?.choice ?? null,
			noticeDismissal: null,
			now: NOW,
			policy: makePolicy({
				choice: { fingerprint: CHOICE_FP, maxAgeMs: 365 * DAY },
			}),
		});
		expect(evaluation.permissions.marketing).toBe(false);
		expect(evaluation.categories.marketing.authority).toBe('expired');
	});

	it('preserves JSON partial coverage and restores compact omitted false', () => {
		window.localStorage.setItem(
			STORAGE_KEY_V2,
			JSON.stringify(legacyRecord({ marketing: true, necessary: true }))
		);
		const fromJson = readStoredConsentRecord(undefined, NOW).selected;
		expect(Object.keys(fromJson?.choice.categories ?? {})).toEqual([
			'marketing',
		]);

		window.localStorage.clear();
		setCookie(
			STORAGE_KEY_V2,
			legacyRecord({ marketing: true, necessary: true })
		);
		const fromCookie = readStoredConsentRecord(undefined, NOW).selected;
		expect(fromCookie?.encoding).toBe('compact');
		expect(fromCookie?.choice.categories).toEqual({
			experience: {
				basis: { kind: 'legacy-v2' },
				confirmedAt: NOW - DAY,
				value: false,
			},
			functionality: {
				basis: { kind: 'legacy-v2' },
				confirmedAt: NOW - DAY,
				value: false,
			},
			marketing: {
				basis: { kind: 'legacy-v2' },
				confirmedAt: NOW - DAY,
				value: true,
			},
			measurement: {
				basis: { kind: 'legacy-v2' },
				confirmedAt: NOW - DAY,
				value: false,
			},
		});
	});

	it('keeps original time, material fingerprint, identity and IAB metadata', () => {
		window.localStorage.setItem(
			STORAGE_KEY_V2,
			JSON.stringify({
				...legacyRecord({ marketing: true, necessary: true }, NOW - 3 * DAY, {
					externalId: 'user_1',
					identityProvider: 'clerk',
					materialPolicyFingerprint: 'material-a',
				}),
				iabCustomVendorConsents: { v1: true, v2: false },
			})
		);

		const { selected } = readStoredConsentRecord(undefined, NOW);

		expect(selected?.subject).toEqual({
			externalId: 'user_1',
			identityProvider: 'clerk',
			subjectId: SUBJECT_ID,
		});
		expect(selected?.choice.categories.marketing).toEqual({
			basis: { kind: 'legacy-v2', materialFingerprint: 'material-a' },
			confirmedAt: NOW - 3 * DAY,
			value: true,
		});
		expect(selected?.iab).toEqual({
			customVendorConsents: { v1: true, v2: false },
		});
	});

	it('treats an id-only v1 record as unsupported and moves to the next candidate', () => {
		setCookie(STORAGE_KEY_V2, {
			consentInfo: { id: 'server-id', time: NOW - DAY },
			consents: { marketing: true, necessary: true },
		});
		window.localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify(legacyRecord({ measurement: false, necessary: true }))
		);

		const { candidates, selected } = readStoredConsentRecord(undefined, NOW);

		expect(candidates[0]?.status).toBe('invalid');
		expect(
			candidates[0]?.status === 'invalid' && candidates[0].issues[0]?.code
		).toBe('unsupported-version');
		expect(selected?.source).toBe('legacy-local-storage');
	});

	it('never decodes an unknown versioned envelope with the legacy reader', () => {
		window.localStorage.setItem(
			STORAGE_KEY_V2,
			JSON.stringify({
				consentInfo: { subjectId: SUBJECT_ID, time: NOW - DAY },
				consents: { marketing: true, necessary: true },
				version: 4,
			})
		);

		const { candidates, selected } = readStoredConsentRecord(undefined, NOW);

		expect(selected).toBeNull();
		expect(candidates[1]?.status === 'invalid' && candidates[1].format).toBe(
			'v3'
		);
	});

	it('reserves any versioned prefix before legacy parsing', () => {
		document.cookie = `${STORAGE_KEY_V2}=v=99,c.marketing:1,i.t:${NOW - DAY},i.sid:${SUBJECT_ID}`;

		const { candidates, selected } = readStoredConsentRecord(undefined, NOW);

		expect(selected).toBeNull();
		expect(candidates[0]?.status).toBe('invalid');
		expect(candidates[0]?.status === 'invalid' && candidates[0].format).toBe(
			'v3'
		);
		expect(
			candidates[0]?.status === 'invalid' && candidates[0].issues[0]?.code
		).toBe('unsupported-version');
	});

	it('accepts a JSON cookie with leading whitespace so its denial stays authoritative', () => {
		const denial = legacyRecord({ marketing: false, necessary: true });
		document.cookie = `${STORAGE_KEY_V2}=${encodeURIComponent(` \n${JSON.stringify(denial)}`)}`;
		window.localStorage.setItem(
			STORAGE_KEY_V2,
			JSON.stringify(legacyRecord({ marketing: true, necessary: true }))
		);

		const { selected } = readStoredConsentRecord(undefined, NOW);

		expect(selected?.source).toBe('cookie');
		expect(selected?.encoding).toBe('json');
		expect(selected?.choice.categories.marketing?.value).toBe(false);
	});

	it('honours a custom storage key for every derived key', () => {
		const config = { storageKey: 'custom-key' };
		window.localStorage.setItem(
			'custom-key',
			JSON.stringify(legacyRecord({ marketing: true, necessary: true }))
		);

		expect(readStoredConsentRecord(undefined, NOW).selected).toBeNull();
		expect(readStoredConsentRecord(config, NOW).selected?.key).toBe(
			'custom-key'
		);
		expect(resolveStorageKeys(config)).toEqual({
			consent: 'custom-key',
			legacyConsent: STORAGE_KEY,
			notice: 'custom-key-notice',
			privacy: 'custom-key-privacy',
		});
	});

	it('reads the same record from a request cookie header', () => {
		const envelope: StoredConsentEnvelope = {
			categories: {
				marketing: { basis: currentBasis, confirmedAt: NOW - DAY, value: true },
			},
			subject: { subjectId: SUBJECT_ID },
			version: 3,
		};
		const header = `other=1; ${STORAGE_KEY_V2}=${encodeStoredConsentEnvelopeCompact(envelope)}; x=y`;

		const server = readStoredConsentRecordFromCookieHeader(
			header,
			undefined,
			NOW
		);
		setCookie(STORAGE_KEY_V2, encodeStoredConsentEnvelopeCompact(envelope));
		const browser = readStoredConsentRecord(undefined, NOW);

		expect(server.selected?.choice).toEqual(browser.selected?.choice);
		expect(server.selected?.subject).toEqual({ subjectId: SUBJECT_ID });
		expect(server.selected?.format).toBe('v3');
		expect(
			readStoredConsentRecordFromCookieHeader(undefined, undefined, NOW)
				.selected
		).toBeNull();
	});
});

describe('v3 writes', () => {
	beforeEach(() => {
		document.cookie = '';
		window.localStorage.clear();
	});

	afterEach(() => {
		document.cookie = '';
		window.localStorage.clear();
	});

	it('round-trips a repeat save with mixed legacy and current receipts', () => {
		const envelope: StoredConsentEnvelope = {
			categories: {
				functionality: {
					basis: { kind: 'legacy-v2', materialFingerprint: 'material-a' },
					confirmedAt: NOW - 90 * DAY,
					value: true,
				},
				marketing: {
					basis: currentBasis,
					confirmedAt: NOW - DAY,
					value: false,
				},
				measurement: {
					basis: currentBasis,
					confirmedAt: NOW - DAY,
					value: true,
				},
			},
			subject: { subjectId: SUBJECT_ID },
			version: 3,
		};

		const first = writeStoredConsentEnvelope(envelope, { now: NOW });
		expect(first.ok && first.written).toEqual({
			cookie: true,
			localStorage: true,
		});
		const afterFirst = readStoredConsentRecord(undefined, NOW).selected;
		expect(afterFirst?.source).toBe('cookie');
		expect(afterFirst?.choice).toEqual({
			categories: envelope.categories,
			version: 3,
		});

		// Simulate the cookie being evicted: localStorage JSON must agree.
		document.cookie = '';
		const fromLocal = readStoredConsentRecord(undefined, NOW).selected;
		expect(fromLocal?.source).toBe('local-storage');
		expect(fromLocal?.choice).toEqual(afterFirst?.choice);
		expect(fromLocal?.subject).toEqual({ subjectId: SUBJECT_ID });

		// A second save with an untouched envelope writes identical bytes.
		const localBefore = window.localStorage.getItem(STORAGE_KEY_V2);
		writeStoredConsentEnvelope(envelope, { now: NOW + DAY });
		expect(window.localStorage.getItem(STORAGE_KEY_V2)).toBe(localBefore);
	});

	it('rejects a malformed envelope and writes nothing', () => {
		const result = writeStoredConsentEnvelope(
			{
				categories: {
					marketing: { basis: currentBasis, confirmedAt: NOW + 1, value: true },
				},
				version: 3,
			},
			{ now: NOW }
		);

		expect(result.ok).toBe(false);
		expect(document.cookie).toBe('');
		expect(window.localStorage.getItem(STORAGE_KEY_V2)).toBeNull();
	});

	it('leaves the legacy localStorage key alone and honours a custom key', () => {
		const legacy = JSON.stringify(legacyRecord({ necessary: true }));
		window.localStorage.setItem(STORAGE_KEY, legacy);

		writeStoredConsentEnvelope(
			{ categories: {}, subject: { subjectId: SUBJECT_ID }, version: 3 },
			{ config: { storageKey: 'custom-key' }, now: NOW }
		);

		expect(window.localStorage.getItem(STORAGE_KEY)).toBe(legacy);
		expect(window.localStorage.getItem(STORAGE_KEY_V2)).toBeNull();
		expect(window.localStorage.getItem('custom-key')).toContain('"version":3');
		expect(document.cookie.startsWith('custom-key=v=3&')).toBe(true);
	});
});

describe('notice dismissal and privacy opt-outs', () => {
	beforeEach(() => {
		document.cookie = '';
		window.localStorage.clear();
	});

	afterEach(() => {
		document.cookie = '';
		window.localStorage.clear();
	});

	it('stores notice and privacy records separately from the consent record', () => {
		writeStoredConsentEnvelope(
			{
				categories: {
					marketing: {
						basis: currentBasis,
						confirmedAt: NOW - DAY,
						value: true,
					},
				},
				version: 3,
			},
			{ now: NOW }
		);
		const consentLocal = window.localStorage.getItem(STORAGE_KEY_V2);
		const consentCookie = document.cookie;

		writeStoredNoticeDismissal(
			{ dismissedAt: NOW - DAY, fingerprint: 'notice-fp-1', version: 1 },
			undefined,
			NOW
		);
		writeStoredPrivacyOptOuts(
			[{ categories: ['marketing'], recordedAt: NOW - DAY, source: 'gpc' }],
			undefined,
			NOW
		);

		expect(window.localStorage.getItem(STORAGE_KEY_V2)).toBe(consentLocal);
		expect(document.cookie).toBe(consentCookie);
		expect(readStoredNoticeDismissal(undefined, NOW)).toEqual({
			ok: true,
			record: {
				dismissedAt: NOW - DAY,
				fingerprint: 'notice-fp-1',
				version: 1,
			},
		});
		expect(readStoredPrivacyOptOuts(undefined, NOW)).toEqual({
			ok: true,
			record: {
				directives: [
					{ categories: ['marketing'], recordedAt: NOW - DAY, source: 'gpc' },
				],
				version: 1,
			},
		});
		expect(
			readStoredConsentRecord(undefined, NOW).selected?.choice.categories
		).toHaveProperty('marketing');
	});

	it('reports an invalid local record instead of treating it as absent', () => {
		window.localStorage.setItem(resolveStorageKeys().notice, '{"version":1}');
		window.localStorage.setItem(resolveStorageKeys().privacy, 'nope');

		expect(readStoredNoticeDismissal(undefined, NOW)?.ok).toBe(false);
		expect(readStoredPrivacyOptOuts(undefined, NOW)?.ok).toBe(false);
		expect(readStoredNoticeDismissal({ storageKey: 'other' }, NOW)).toBeNull();
	});

	it('clears choices, notice dismissal and privacy directives together', () => {
		const config = { storageKey: 'custom-key' };
		writeStoredConsentEnvelope(
			{ categories: {}, subject: { subjectId: SUBJECT_ID }, version: 3 },
			{ config, now: NOW }
		);
		window.localStorage.setItem(STORAGE_KEY, '{}');
		writeStoredNoticeDismissal(
			{ dismissedAt: NOW - DAY, fingerprint: 'notice-fp-1', version: 1 },
			config,
			NOW
		);
		writeStoredPrivacyOptOuts(
			[{ categories: ['marketing'], recordedAt: NOW - DAY, source: 'gpc' }],
			config,
			NOW
		);

		clearStoredConsentRecords(undefined, config);

		expect(window.localStorage.getItem('custom-key')).toBeNull();
		expect(window.localStorage.getItem('custom-key-notice')).toBeNull();
		expect(window.localStorage.getItem('custom-key-privacy')).toBeNull();
		expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
		// The stubbed document holds only the last cookie write; the consent
		// cookie must not survive it.
		expect(document.cookie).not.toContain('custom-key=v=3');
		expect(readStoredConsentRecord(config, NOW).selected).toBeNull();
		expect(readStoredNoticeDismissal(config, NOW)).toBeNull();
	});
});
