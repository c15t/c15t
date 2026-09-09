/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
	explicitChoice,
	NOW,
} from '../../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../../kernel';
import { deleteConsentFromStorage, setCookie } from '../../../libs/cookie';
import { STORAGE_KEY_V2 } from '../../../libs/storage-keys';
import {
	hydrateFromStorage,
	readStoredRecords,
	readStoredRecordsFromCookieHeader,
} from '../hydrate';
import {
	encodeNoticeDismissalCompact,
	encodePrivacyOptOutsCompact,
	encodeStoredConsentEnvelopeCompact,
} from '../record-codec';
import { writeStoredConsentEnvelope } from '../record-storage';

beforeEach(() => {
	localStorage.clear();
	deleteConsentFromStorage();
	document.cookie = '';
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('readStoredRecords', () => {
	test('reports nothing found when storage is empty', () => {
		const stored = readStoredRecords(undefined, NOW);
		expect(stored.found).toBe(false);
		expect(stored.records).toEqual({
			choice: null,
			noticeDismissal: null,
			now: NOW,
			optOutDirectives: [],
			subject: null,
		});
	});

	test('reads a v3 envelope with its subject and IAB metadata intact', () => {
		writeStoredConsentEnvelope(
			{
				categories: explicitChoice({ marketing: true }).categories,
				iab: { customVendorConsents: { acme: true } },
				subject: { externalId: '12345', subjectId: 'user%2F1' },
				version: 3,
			},
			{ now: NOW }
		);
		const stored = readStoredRecords(undefined, NOW);
		expect(stored.found).toBe(true);
		expect(stored.records.choice).toEqual(explicitChoice({ marketing: true }));
		expect(stored.records.subject).toEqual({
			externalId: '12345',
			subjectId: 'user%2F1',
		});
		expect(stored.iab).toEqual({ customVendorConsents: { acme: true } });
	});

	test('reads a legacy JSON record as legacy receipts with the original time', () => {
		localStorage.setItem(
			STORAGE_KEY_V2,
			JSON.stringify({
				consentInfo: {
					materialPolicyFingerprint: 'fp-old',
					subjectId: 'legacy-1',
					time: NOW - 5000,
				},
				consents: { marketing: true, necessary: true },
			})
		);
		const { records } = readStoredRecords(undefined, NOW);
		expect(records.choice).toEqual({
			categories: {
				marketing: {
					basis: { kind: 'legacy-v2', materialFingerprint: 'fp-old' },
					confirmedAt: NOW - 5000,
					value: true,
				},
			},
			version: 3,
		});
		expect(records.subject).toEqual({ subjectId: 'legacy-1' });
	});
});

describe('readStoredRecordsFromCookieHeader', () => {
	test('reads choice, notice and privacy projections with one clock', () => {
		const choice = encodeStoredConsentEnvelopeCompact({
			categories: explicitChoice({ marketing: false }).categories,
			version: 3,
		});
		const notice = encodeNoticeDismissalCompact({
			dismissedAt: NOW - 1000,
			fingerprint: 'notice-fp',
			version: 1,
		});
		const privacy = encodePrivacyOptOutsCompact({
			directives: [
				{ categories: ['marketing'], recordedAt: NOW - 2000, source: 'gpc' },
			],
			version: 1,
		});
		const header = `${STORAGE_KEY_V2}=${choice}; ${STORAGE_KEY_V2}-notice=${notice}; ${STORAGE_KEY_V2}-privacy=${privacy}`;
		const records = readStoredRecordsFromCookieHeader(header, undefined, NOW);
		expect(records).toEqual({
			choice: explicitChoice({ marketing: false }),
			noticeDismissal: {
				dismissedAt: NOW - 1000,
				fingerprint: 'notice-fp',
				version: 1,
			},
			now: NOW,
			optOutDirectives: [
				{ categories: ['marketing'], recordedAt: NOW - 2000, source: 'gpc' },
			],
			subject: null,
		});
	});

	test('a malformed projection is ignored without touching the choice', () => {
		const choice = encodeStoredConsentEnvelopeCompact({
			categories: explicitChoice({ marketing: false }).categories,
			version: 3,
		});
		const header = `${STORAGE_KEY_V2}=${choice}; ${STORAGE_KEY_V2}-notice=v=9&t=x; ${STORAGE_KEY_V2}-privacy=garbage`;
		const records = readStoredRecordsFromCookieHeader(header, undefined, NOW);
		expect(records.choice).toEqual(explicitChoice({ marketing: false }));
		expect(records.noticeDismissal).toBeNull();
		expect(records.optOutDirectives).toEqual([]);
	});
});

describe('hydrateFromStorage', () => {
	test('returns null without storage APIs', () => {
		const originalDocument = globalThis.document;
		vi.stubGlobal('document', undefined);
		try {
			expect(
				hydrateFromStorage(createConsentKernel(), undefined, NOW)
			).toBeNull();
		} finally {
			vi.stubGlobal('document', originalDocument);
		}
	});

	test('applies stored records through kernel.hydrate without a choice event', () => {
		setCookie(STORAGE_KEY_V2, {
			consentInfo: { subjectId: 'legacy-cookie', time: NOW - 5000 },
			consents: { marketing: true, necessary: true },
		});
		const kernel = createConsentKernel({ now: NOW });
		const choiceRecorded = vi.fn();
		const permissions = vi.fn();
		kernel.events.on('choice:recorded', choiceRecorded);
		kernel.events.on('permissions:changed', permissions);

		const stored = hydrateFromStorage(kernel, undefined, NOW);
		expect(stored?.found).toBe(true);
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(true);
		expect(kernel.getSnapshot().subject?.subjectId ?? null).toBe(
			'legacy-cookie'
		);
		expect(
			Object.keys(kernel.getSnapshot().explicitChoice?.categories ?? {})
		).not.toHaveLength(0);
		expect(choiceRecorded).not.toHaveBeenCalled();
		expect(permissions).toHaveBeenCalledTimes(1);
	});
});
