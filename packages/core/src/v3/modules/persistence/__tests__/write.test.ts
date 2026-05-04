/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as cookie from '../../../../libs/cookie';
import { createConsentKernel } from '../../../kernel';
import { writeToStorage } from '../write';

beforeEach(() => {
	vi.restoreAllMocks();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('writeToStorage', () => {
	test('skips the write before the user has consented', () => {
		const save = vi
			.spyOn(cookie, 'saveConsentToStorage')
			.mockImplementation(() => {});
		const kernel = createConsentKernel();
		writeToStorage(kernel.getSnapshot(), kernel, undefined);
		expect(save).not.toHaveBeenCalled();
	});

	test('writes when consent has been given', () => {
		const save = vi
			.spyOn(cookie, 'saveConsentToStorage')
			.mockImplementation(() => {});
		const kernel = createConsentKernel();
		kernel.set.hasConsented(true);
		writeToStorage(kernel.getSnapshot(), kernel, undefined);
		expect(save).toHaveBeenCalledOnce();
	});

	test('regenerates subjectId when missing and pushes it back to the kernel', () => {
		vi.spyOn(cookie, 'saveConsentToStorage').mockImplementation(() => {});
		const kernel = createConsentKernel();
		kernel.set.hasConsented(true);
		expect(kernel.getSnapshot().subjectId).toBeNull();
		writeToStorage(kernel.getSnapshot(), kernel, undefined);
		const snap = kernel.getSnapshot();
		expect(snap.subjectId).not.toBeNull();
		// generateSubjectId emits `sub_<base58>` IDs.
		expect(snap.subjectId).toMatch(/^sub_/);
	});
});
