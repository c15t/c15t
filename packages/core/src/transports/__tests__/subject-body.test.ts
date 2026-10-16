/**
 * The Additional Consent string on the save body: it travels only beside a
 * TC string, since Google discards one sent alone.
 */
import { describe, expect, test } from 'vitest';

import type { SavePayload } from '../../types';
import { buildSubjectPostBody } from '../subject-body';

const NOW = 1_700_000_200_000;

const payload: SavePayload = {
	addtlConsent: '2~89.486~dv.2572',
	choice: { categories: {}, version: 3 },
	confirmed: { actionAt: NOW, categories: {} },
	consentAction: 'all',
	consents: {
		experience: true,
		functionality: true,
		marketing: true,
		measurement: true,
		necessary: true,
	},
	model: 'iab',
	overrides: {},
	policySnapshotToken: null,
	subject: { subjectId: 'sub_test' },
	subjectId: 'sub_test',
	tcString: 'CQ-tc',
	uiSource: 'banner',
	user: null,
};

describe('save body: Additional Consent', () => {
	test('sends the AC string with its TC string', () => {
		const body = buildSubjectPostBody(payload, { domain: 'example.com' });
		expect(body.tcString).toBe('CQ-tc');
		expect(body.addtlConsent).toBe('2~89.486~dv.2572');
	});

	test('drops the AC string when there is no TC string', () => {
		const body = buildSubjectPostBody(
			{ ...payload, tcString: null },
			{ domain: 'example.com' }
		);
		expect(body).not.toHaveProperty('addtlConsent');
	});

	test('omits the key when the payload has no AC string', () => {
		const { addtlConsent: _addtlConsent, ...withoutAc } = payload;
		const body = buildSubjectPostBody(withoutAc, { domain: 'example.com' });
		expect(body).not.toHaveProperty('addtlConsent');
	});
});
