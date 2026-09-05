import { describe, expect, test } from 'vitest';

import {
	choiceRecords,
	matchedResolution,
	NOW,
	optInRule,
	optOutRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import { resolveSaveSelection } from '../commands';
import { buildInitialSnapshot } from '../snapshot';

describe('resolveSaveSelection', () => {
	test("'all' confirms the active scope with true", () => {
		const snap = buildInitialSnapshot({
			initialPolicyResolution: matchedResolution(
				optInRule({ categories: ['marketing', 'measurement'] })
			),
			now: NOW,
		});
		expect(resolveSaveSelection(snap, null, 'all')).toEqual({
			consentAction: 'all',
			values: { marketing: true, measurement: true },
		});
	});

	test("'none' confirms the active scope with false", () => {
		const snap = buildInitialSnapshot({ now: NOW });
		expect(resolveSaveSelection(snap, null, 'none')).toEqual({
			consentAction: 'necessary',
			values: {
				experience: false,
				functionality: false,
				marketing: false,
				measurement: false,
			},
		});
	});

	test('object input is passed through for validation', () => {
		const snap = buildInitialSnapshot({ now: NOW });
		expect(resolveSaveSelection(snap, null, { marketing: true })).toEqual({
			consentAction: 'custom',
			values: { marketing: true },
		});
	});

	test('no input confirms draft, then explicit, then displayed default', () => {
		const snap = buildInitialSnapshot({
			initialPolicyResolution: matchedResolution(
				optInRule({
					categories: ['experience', 'marketing', 'measurement'],
					preselectedCategories: ['experience'],
				})
			),
			initialRecords: choiceRecords({ marketing: true }),
			now: NOW,
		});
		expect(
			resolveSaveSelection(snap, { measurement: true }, undefined).values
		).toEqual({ experience: true, marketing: true, measurement: true });
	});

	test('no input under opt-out confirms the unmasked default, not the GPC mask', () => {
		const snap = buildInitialSnapshot({
			initialOverrides: { gpc: true },
			initialPolicyResolution: matchedResolution(
				optOutRule({
					categories: ['marketing'],
					privacySignals: { gpc: { denyCategories: ['marketing'] } },
				})
			),
			now: NOW,
		});
		expect(snap.effectivePermissions.marketing).toBe(false);
		expect(resolveSaveSelection(snap, null, undefined).values).toEqual({
			marketing: true,
		});
	});
});
