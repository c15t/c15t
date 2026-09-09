import { afterEach, describe, expect, test, vi } from 'vitest';

import {
	choiceRecords,
	matchedResolution,
	NOW,
	optInRule,
	optOutRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../index';
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

describe('displayed category saves', () => {
	afterEach(() => vi.useRealTimers());
	test.each(['all', 'none', undefined] as const)(
		'preserves hidden choices and clocks for %s',
		async (input) => {
			let now = NOW;
			vi.useFakeTimers();
			vi.setSystemTime(now);
			const kernel = createConsentKernel({ now });
			await kernel.commands.save({ marketing: true, measurement: false });
			const hidden = kernel.getSnapshot().explicitChoice?.categories.marketing;
			now += 1000;
			vi.setSystemTime(now);
			const result = await kernel.commands.save(input, {
				categories: ['necessary', 'measurement'],
			});
			expect(result.ok).toBe(true);
			expect(kernel.getSnapshot().explicitChoice?.categories.marketing).toEqual(
				hidden
			);
			expect(
				kernel.getSnapshot().explicitChoice?.categories.measurement
			).toMatchObject({ confirmedAt: now, value: input === 'all' });
			kernel.dispose();
		}
	);
	test('an empty displayed scope records no choice', async () => {
		const kernel = createConsentKernel({ now: NOW });
		await kernel.commands.save('all', { categories: [] });
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
		kernel.dispose();
	});
});
