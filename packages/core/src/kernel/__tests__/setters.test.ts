import { describe, expect, test, vi } from 'vitest';

import {
	DAY,
	iabRule,
	matchedResolution,
	NOW,
	optInRule,
	optOutRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../index';

describe('set.draft', () => {
	test('stages optional booleans a no-input save confirms and ignores the rest', async () => {
		vi.spyOn(Date, 'now').mockReturnValue(NOW);
		const categories = ['functionality', 'marketing', 'measurement'] as const;
		const kernel = createConsentKernel({
			consentCategories: categories,
			initialPolicyResolution: matchedResolution(
				optInRule({ categories: [...categories] })
			),
			now: NOW,
		});
		kernel.set.draft({ marketing: true, necessary: true });
		// oxlint-disable-next-line typescript/no-explicit-any -- deliberately invalid input
		kernel.set.draft({ measurement: 'yes' as any });
		kernel.set.draft({ functionality: true });
		kernel.set.draft({ functionality: false });
		await kernel.commands.save();
		const recorded = kernel.getSnapshot().explicitChoice?.categories;
		expect(recorded?.marketing?.value).toBe(true);
		expect(recorded?.functionality?.value).toBe(false);
		expect(recorded?.measurement?.value).toBe(false);
		kernel.dispose();
	});
});

describe('set.iab', () => {
	test('creates the slice, then announces only real changes', () => {
		const kernel = createConsentKernel({ now: NOW });
		const events = vi.fn();
		kernel.events.on('iab:set', events);
		expect(kernel.getSnapshot().iab).toBeNull();
		kernel.set.iab({ enabled: true });
		expect(kernel.getSnapshot().iab?.enabled).toBe(true);
		expect(events).toHaveBeenCalledTimes(1);
		const before = kernel.getSnapshot();
		kernel.set.iab({ enabled: true });
		expect(kernel.getSnapshot()).toBe(before);
		expect(events).toHaveBeenCalledTimes(1);
		kernel.set.iab({ enabled: false });
		expect(kernel.getSnapshot().iab?.enabled).toBe(false);
		expect(events).toHaveBeenCalledTimes(2);
	});
});

describe('buildSetters', () => {
	test('set.draft stages a draft without changing the snapshot', () => {
		const kernel = createConsentKernel({ now: NOW });
		const before = kernel.getSnapshot();
		const listener = vi.fn();
		kernel.subscribe(listener);
		kernel.set.draft({ marketing: true });
		expect(kernel.getSnapshot()).toBe(before);
		expect(listener).not.toHaveBeenCalled();
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
	});

	test('choice authority has no boolean setter', () => {
		const kernel = createConsentKernel();
		expect(kernel.set).not.toHaveProperty('hasConsented');
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
	});

	test('set.language is a no-op when language already matches', () => {
		const kernel = createConsentKernel({
			initialOverrides: { language: 'en' },
			now: NOW,
		});
		const before = kernel.getSnapshot();
		kernel.set.language('en');
		expect(kernel.getSnapshot()).toBe(before);
	});

	test('set.subjectId updates the subject once', () => {
		const kernel = createConsentKernel({ now: NOW });
		kernel.set.subjectId('sub_1');
		expect(kernel.getSnapshot().subject).toEqual({ subjectId: 'sub_1' });
		expect(kernel.getSnapshot().subject?.subjectId ?? null).toBe('sub_1');
		const before = kernel.getSnapshot();
		kernel.set.subjectId('sub_1');
		expect(kernel.getSnapshot()).toBe(before);
		kernel.set.subjectId(null);
		expect(kernel.getSnapshot().subject).toBeNull();
	});

	test('set.iab re-derives the model when enabled flips', () => {
		const kernel = createConsentKernel({
			initialIab: { enabled: false },
			initialPolicyResolution: matchedResolution(iabRule()),
			now: NOW,
		});
		const events = vi.fn();
		kernel.events.on('iab:set', events);
		expect(kernel.getSnapshot().model).toBe('opt-in');
		kernel.set.iab({ enabled: true });
		expect(kernel.getSnapshot().model).toBe('iab');
		expect(events).toHaveBeenCalledTimes(1);
	});

	test('set.activeUI across an elapsed deadline re-evaluates at the toggle time', async () => {
		vi.spyOn(Date, 'now').mockReturnValue(NOW);
		const kernel = createConsentKernel({
			consentCategories: ['marketing'],
			initialPolicyResolution: matchedResolution(
				optInRule({
					categories: ['marketing'],
					validity: { choiceDays: 1 },
				})
			),
			now: NOW,
			transport: { save: vi.fn().mockResolvedValue({ ok: true }) },
		});
		await kernel.commands.init();
		await kernel.commands.save('all');
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(true);
		expect(kernel.getSnapshot().nextDeadline).toBe(NOW + DAY);

		// The deadline timer has not fired yet; the toggle carries the clock,
		// so the expired grant is re-evaluated in the same commit.
		vi.spyOn(Date, 'now').mockReturnValue(NOW + 2 * DAY);
		kernel.set.activeUI('dialog');
		const snapshot = kernel.getSnapshot();
		expect(snapshot.activeUI).toBe('dialog');
		expect(snapshot.evaluatedAt).toBe(NOW + 2 * DAY);
		expect(snapshot.effectivePermissions.marketing).toBe(false);
		expect(snapshot.promptRequirement).toEqual({
			kind: 'choice',
			reason: 'expired',
		});
		kernel.dispose();
	});

	test('set.overrides with gpc masks permissions and emits permissions:changed', () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: matchedResolution(
				optOutRule({
					privacySignals: { gpc: { denyCategories: ['marketing'] } },
					prompt: 'none',
				})
			),
			now: NOW,
		});
		const permissions = vi.fn();
		kernel.events.on('permissions:changed', permissions);
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(true);
		kernel.set.overrides({ gpc: true });
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
		expect(kernel.getSnapshot().restrictions.marketing).toEqual(['gpc']);
		expect(permissions).toHaveBeenCalledTimes(1);
	});
});
