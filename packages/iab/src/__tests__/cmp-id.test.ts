/**
 * @vitest-environment jsdom
 *
 * Tests for the CMP identity boundary.
 *
 * A TC String carries the CMP ID in a 12-bit field and the encoder rejects
 * anything below 2, so an unusable ID has to fail at mount. The failure mode
 * this guards is a page that installs `__tcfapi`, answers `ping` with a
 * placeholder CMP ID, and only throws when the user tries to save.
 */

import { createConsentKernel } from '@c15t/core';
import { beforeEach, describe, expect, test } from 'vitest';

import { createIAB, iab } from '../index';
import { isValidCmpId, MAX_CMP_ID, MIN_CMP_ID } from '../tcf/cmp-id';
import { createMockGVL } from './test-setup';

describe('isValidCmpId', () => {
	test.each([2, 28, MIN_CMP_ID, MAX_CMP_ID])('accepts %p', (value) => {
		expect(isValidCmpId(value)).toBe(true);
	});

	test.each([
		0,
		1,
		MIN_CMP_ID - 1,
		MAX_CMP_ID + 1,
		2.5,
		Number.NaN,
		'28',
		null,
		undefined,
	])('rejects %p', (value) => {
		expect(isValidCmpId(value)).toBe(false);
	});
});

describe('createIAB: unusable CMP ids fail at mount', () => {
	beforeEach(() => {
		Reflect.deleteProperty(window, '__tcfapi');
	});

	test.each([0, 1, 4096, Number.NaN])('throws for cmpId %p', (cmpId) => {
		const kernel = createConsentKernel();

		expect(() => createIAB({ cmpId, gvl: createMockGVL(), kernel })).toThrow(
			/registered with IAB Europe/u
		);

		// Vendors must not discover a CMP that cannot write a consent record.
		expect(Reflect.has(window, '__tcfapi')).toBe(false);
		expect(kernel.getSnapshot().iab?.cmpId).not.toBe(cmpId);
	});

	test('throws when no CMP id reaches the runtime', () => {
		const kernel = createConsentKernel();
		const options = {
			gvl: createMockGVL(),
			kernel,
		} as unknown as Parameters<typeof createIAB>[0];

		expect(() => createIAB(options)).toThrow(/no cmpId was provided/u);
	});
});

describe('iab: provider configuration', () => {
	test('accepts a missing CMP id for the hosted path', () => {
		expect(iab({ vendors: [755] })).toEqual({ enabled: true, vendors: [755] });
	});

	test('accepts a registered CMP id', () => {
		expect(iab({ cmpId: 28 }).cmpId).toBe(28);
	});

	test.each([0, 1, 2.5, 4096])(
		'rejects an unusable cmpId %p at configuration time',
		(cmpId) => {
			expect(() => iab({ cmpId })).toThrow(/register\.consensu\.org/u);
		}
	);
});
