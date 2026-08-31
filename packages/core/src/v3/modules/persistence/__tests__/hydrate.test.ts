/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createConsentKernel } from '../../../kernel';
import * as cookie from '../../../libs/cookie';
import { hydrateFromStorage } from '../hydrate';

beforeEach(() => {
	vi.restoreAllMocks();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('hydrateFromStorage', () => {
	test('returns false when storage has nothing', () => {
		vi.spyOn(cookie, 'getConsentFromStorage').mockReturnValue(null);
		const kernel = createConsentKernel();
		expect(hydrateFromStorage(kernel, undefined)).toBe(false);
	});

	test('applies stored consents to the kernel', () => {
		vi.spyOn(cookie, 'getConsentFromStorage').mockReturnValue({
			consents: { marketing: true },
		});
		const kernel = createConsentKernel();
		expect(hydrateFromStorage(kernel, undefined)).toBe(true);
		expect(kernel.getSnapshot().consents.marketing).toBe(true);
	});

	test('applies stored subjectId when valid', () => {
		// Subject IDs are `sub_<base58>` — example from isValidSubjectId docs.
		const validId = 'sub_2VZxR7YmNpKq3WfLs8TgHd';
		vi.spyOn(cookie, 'getConsentFromStorage').mockReturnValue({
			consentInfo: { subjectId: validId, time: 0 },
		});
		const kernel = createConsentKernel();
		hydrateFromStorage(kernel, undefined);
		expect(kernel.getSnapshot().subjectId).toBe(validId);
		expect(kernel.getSnapshot().hasConsented).toBe(true);
	});

	test('ignores invalid stored subjectId but still sets hasConsented', () => {
		vi.spyOn(cookie, 'getConsentFromStorage').mockReturnValue({
			consentInfo: { subjectId: 'not-a-real-id', time: 0 },
		});
		const kernel = createConsentKernel();
		hydrateFromStorage(kernel, undefined);
		expect(kernel.getSnapshot().subjectId).toBeNull();
		expect(kernel.getSnapshot().hasConsented).toBe(true);
	});
});
