/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { NOW } from '../../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../../kernel';
import { deleteConsentFromStorage } from '../../../libs/cookie';
import { STORAGE_KEY_V2 } from '../../../libs/storage-keys';
import { readStoredConsentRecord } from '../record-storage';
import { buildStoredEnvelope, writeChoiceToStorage } from '../write';

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
	localStorage.clear();
	deleteConsentFromStorage();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('buildStoredEnvelope', () => {
	test('returns null without an explicit choice', () => {
		const kernel = createConsentKernel({ now: NOW });
		expect(buildStoredEnvelope(kernel.getSnapshot(), null)).toBeNull();
	});

	test('carries the subject once and the preserved IAB metadata', async () => {
		const kernel = createConsentKernel({ now: NOW });
		await kernel.commands.identify({
			externalId: '0',
			identityProvider: '1',
		});
		await kernel.commands.save({ marketing: true });
		const envelope = buildStoredEnvelope(kernel.getSnapshot(), {
			customVendorConsents: { acme: false },
		});
		expect(envelope?.subject).toEqual({
			externalId: '0',
			identityProvider: '1',
			subjectId: kernel.getSnapshot().subject?.subjectId ?? null,
		});
		expect(envelope?.iab).toEqual({ customVendorConsents: { acme: false } });
		expect(envelope?.categories.marketing?.confirmedAt).toBe(NOW);
	});
});

describe('writeChoiceToStorage', () => {
	test('skips the write when no choice exists', () => {
		const kernel = createConsentKernel({ now: NOW });
		writeChoiceToStorage(kernel.getSnapshot(), null, undefined, NOW);
		expect(localStorage.getItem(STORAGE_KEY_V2)).toBeNull();
		expect(document.cookie).toBe('');
	});

	test('writes the v3 envelope to localStorage and the cookie', async () => {
		const kernel = createConsentKernel({ now: NOW });
		await kernel.commands.save({ marketing: true });
		writeChoiceToStorage(kernel.getSnapshot(), null, undefined, NOW);
		expect(localStorage.getItem(STORAGE_KEY_V2)).toContain('"version":3');
		expect(document.cookie).toContain(`${STORAGE_KEY_V2}=v=3&`);
		const { selected } = readStoredConsentRecord(undefined, NOW);
		expect(selected?.choice).toEqual(kernel.getSnapshot().explicitChoice);
		expect(selected?.subject?.subjectId).toBe(
			kernel.getSnapshot().subject?.subjectId ?? null
		);
	});
});
