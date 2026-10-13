/**
 * A narrowed replay drops the TC string, and the AC string with it: an AC
 * string sent without its TC string means nothing.
 */
import { describe, expect, test } from 'vitest';

import type { SavePayload } from '../../types';
import { withoutSuperseded } from '../save-outbox/supersession';

const receipt = (value: boolean) => ({
	basis: { fingerprint: 'choice-fp', kind: 'choice-v1' as const },
	confirmedAt: 1000,
	value,
});

const payload: SavePayload = {
	addtlConsent: '2~89~dv.2572',
	choice: {
		categories: { marketing: receipt(true), measurement: receipt(true) },
		version: 3,
	},
	confirmed: {
		actionAt: 1000,
		categories: { marketing: true, measurement: true },
	},
	consentAction: 'all',
	consents: {
		experience: false,
		functionality: false,
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

describe('supersession: Additional Consent', () => {
	test('a narrowed save drops the AC string with the TC string', () => {
		const narrowed = withoutSuperseded(payload, {
			category: (category) => category === 'marketing',
			vendors: false,
		});
		expect(narrowed?.confirmed.categories).toEqual({ measurement: true });
		expect(narrowed?.tcString).toBeNull();
		expect(narrowed).not.toHaveProperty('addtlConsent');
	});

	test('a save nothing supersedes keeps both strings', () => {
		const kept = withoutSuperseded(payload, {
			category: () => false,
			vendors: false,
		});
		expect(kept?.tcString).toBe('CQ-tc');
		expect(kept?.addtlConsent).toBe('2~89~dv.2572');
	});
});
